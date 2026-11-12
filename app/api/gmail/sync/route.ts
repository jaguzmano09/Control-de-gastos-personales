import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { refreshAccessToken, listHistory, getMessageMetadata, getMessage, extractSender, extractSenderAndText, normalizeSenderAddress } from '@/lib/gmail/client'
import { extractTransactionFromText } from '@/lib/gemini/client'
import { hasValidCronAuthorization } from '@/lib/security/cron-auth'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'Cron authentication unavailable' }, { status: 503 })
  }

  if (!hasValidCronAuthorization(request.headers.get('authorization'), cronSecret)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()
  const { data: connections, error } = await supabase
    .from('gmail_connections')
    .select('user_id, refresh_token, gmail_history_id')
    .eq('is_active', true)

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  const summary: Array<{ created: number; failed: boolean }> = []

  for (const conn of connections ?? []) {
    try {
      const created = await syncUserGmail(supabase, conn.user_id, conn.refresh_token, conn.gmail_history_id)
      summary.push({ created, failed: false })
    } catch {
      summary.push({ created: 0, failed: true })
    }
  }

  return NextResponse.json({ ok: true, users_processed: summary.length, users_failed: summary.filter((item) => item.failed).length, transactions_created: summary.reduce((sum, item) => sum + item.created, 0) })
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
    // Fetch only the From header until the message is matched against the
    // member's allowlist. Never download a non-allowlisted message body.
    const metadata = await getMessageMetadata(access_token, messageId)
    const senderAddress = normalizeSenderAddress(extractSender(metadata))
    const matchedAddress = senderAddress && accountByAddress.has(senderAddress) ? senderAddress : null
    if (!matchedAddress) continue

    const message = await getMessage(access_token, messageId)
    const { from, text } = extractSenderAndText(message)
    if (normalizeSenderAddress(from) !== matchedAddress || !text) continue

    const { data: existing, error: existingError } = await supabase
      .from('transactions')
      .select('id')
      .eq('user_id', userId)
      .eq('external_reference', messageId)
      .maybeSingle()
    if (existingError) throw existingError

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

    if (insertError) throw insertError
    created++
  }

  await supabase.from('gmail_connections').update({ gmail_history_id: history.historyId ?? historyId }).eq('user_id', userId)
  return created
}
