import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { refreshAccessToken, listHistory, getMessage, extractSenderAndText } from '@/lib/gmail/client'
import { extractTransactionFromText } from '@/lib/gemini/client'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const { data: connections, error } = await supabase
    .from('gmail_connections')
    .select('user_id, refresh_token, gmail_history_id')
    .eq('is_active', true)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const summary: Array<{ user_id: string; created: number; error?: string }> = []

  for (const conn of connections ?? []) {
    try {
      const created = await syncUserGmail(supabase, conn.user_id, conn.refresh_token, conn.gmail_history_id)
      summary.push({ user_id: conn.user_id, created })
    } catch (err) {
      summary.push({ user_id: conn.user_id, created: 0, error: (err as Error).message })
    }
  }

  return NextResponse.json({ ok: true, summary })
}

async function syncUserGmail(
  supabase: ReturnType<typeof createServiceRoleClient>,
  userId: string,
  refreshToken: string,
  historyId: string | null
) {
  if (!historyId) return 0

  const { access_token, expires_in } = await refreshAccessToken(refreshToken)
  await supabase
    .from('gmail_connections')
    .update({ access_token, token_expires_at: new Date(Date.now() + expires_in * 1000).toISOString() })
    .eq('user_id', userId)

  const { data: sources } = await supabase
    .from('email_sources')
    .select('email_address, account_id')
    .eq('user_id', userId)
    .eq('is_active', true)
  if (!sources?.length) return 0

  const accountByAddress = new Map(sources.map((s) => [s.email_address.toLowerCase(), s.account_id]))

  const history = await listHistory(access_token, historyId)
  const messageIds = new Set<string>()
  for (const record of history.history ?? []) {
    for (const added of record.messagesAdded ?? []) messageIds.add(added.message.id)
  }

  const { data: categories } = await supabase.from('categories').select('id, name').eq('user_id', userId).eq('is_active', true)
  const categoryNames = (categories ?? []).map((c) => c.name)

  let created = 0

  for (const messageId of Array.from(messageIds)) {
    const message = await getMessage(access_token, messageId)
    const { from, text } = extractSenderAndText(message)

    const matchedAddress = Array.from(accountByAddress.keys()).find((addr) => from.toLowerCase().includes(addr))
    if (!matchedAddress || !text) continue

    const { data: existing } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('external_reference', messageId)
      .maybeSingle()

    const extracted = await extractTransactionFromText(text, categoryNames)
    const category = categories?.find((c) => c.name === extracted.suggested_category)

    const { error: insertError } = await supabase.from('transactions').insert({
      user_id: userId,
      occurred_at: extracted.occurred_at,
      type: 'Gasto',
      category_id: category?.id ?? null,
      account_id: accountByAddress.get(matchedAddress)!,
      description: extracted.description,
      amount: extracted.amount,
      source: 'email_webhook',
      status: existing ? 'duplicado' : 'pendiente_revision',
      external_reference: messageId,
      ai_confidence: extracted.confidence,
      raw_data: extracted,
    })

    if (!insertError) created++
  }

  await supabase.from('gmail_connections').update({ gmail_history_id: history.historyId ?? historyId }).eq('user_id', userId)
  return created
}