import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/src/types/database.types'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 500

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Authentication required', { status: 401, headers: privateHeaders })

  try {
    const owner = user.id
    const [accounts, wallets, categories, transactions, categoryBudgets, walletBudgets, rules, duplicateReviews, emailSources, rolloverReviews, stores, shoppingLists, shoppingItems, priceHistory, yieldConfigs, yieldRates, purchaseDrafts, acceptances, gmailConnections, supportRequests, productEvents] = await Promise.all([
      readAll<Tables<'accounts'>>((from, to) => supabase.from('accounts').select('*').eq('user_id', owner).order('id').range(from, to)),
      readAll<Tables<'wallets'>>((from, to) => supabase.from('wallets').select('*').eq('user_id', owner).order('id').range(from, to)),
      readAll<Tables<'categories'>>((from, to) => supabase.from('categories').select('*').eq('user_id', owner).order('id').range(from, to)),
      readAll<Tables<'transactions'>>((from, to) => supabase.from('transactions').select('*').eq('user_id', owner).order('id').range(from, to)),
      readAll<Tables<'category_budgets'>>((from, to) => supabase.from('category_budgets').select('*').eq('user_id', owner).order('id').range(from, to)),
      readAll<Tables<'wallet_budgets'>>((from, to) => supabase.from('wallet_budgets').select('*').eq('user_id', owner).order('id').range(from, to)),
      readAll<Tables<'categorization_rules'>>((from, to) => supabase.from('categorization_rules').select('*').eq('user_id', owner).order('id').range(from, to)),
      readAll<Tables<'duplicate_review_log'>>((from, to) => supabase.from('duplicate_review_log').select('*').eq('user_id', owner).order('id').range(from, to)),
      readAll<Tables<'email_sources'>>((from, to) => supabase.from('email_sources').select('*').eq('user_id', owner).order('id').range(from, to)),
      readAll<Tables<'budget_rollover_reviews'>>((from, to) => supabase.from('budget_rollover_reviews').select('*').eq('user_id', owner).order('id').range(from, to)),
      readAll<Tables<'stores'>>((from, to) => supabase.from('stores').select('*').eq('user_id', owner).order('id').range(from, to)),
      readAll<Tables<'shopping_lists'>>((from, to) => supabase.from('shopping_lists').select('*').eq('user_id', owner).order('id').range(from, to)),
      readAll<Tables<'shopping_list_items'>>((from, to) => supabase.from('shopping_list_items').select('*').eq('user_id', owner).order('id').range(from, to)),
      readAll<Tables<'price_history'>>((from, to) => supabase.from('price_history').select('*').eq('user_id', owner).order('id').range(from, to)),
      readAll<Tables<'yield_configs'>>((from, to) => supabase.from('yield_configs').select('*').eq('user_id', owner).order('id').range(from, to)),
      readAll<Tables<'yield_rates'>>((from, to) => supabase.from('yield_rates').select('*').eq('user_id', owner).order('id').range(from, to)),
      readAll<Tables<'shopping_purchase_drafts'>>((from, to) => supabase.from('shopping_purchase_drafts').select('*').eq('user_id', owner).order('id').range(from, to)),
      readAll<Tables<'user_document_acceptances'>>((from, to) => supabase.from('user_document_acceptances').select('*').eq('user_id', owner).order('id').range(from, to)),
      readAll<Pick<Tables<'gmail_connections'>, 'is_active'>>((from, to) => supabase.from('gmail_connections').select('is_active').eq('user_id', owner).order('user_id').range(from, to)),
      readAll<{ id: string; request_type: string; subject: string; message: string; status: string; admin_response: string | null; responded_at: string | null; created_at: string; updated_at: string }>((from, to) => supabase.rpc('list_my_support_requests', { p_offset: from, p_limit: to - from + 1 })),
      readAll<{ event_name: string; occurred_at: string }>((from, to) => supabase.rpc('export_my_product_events', { p_offset: from, p_limit: to - from + 1 })),
    ])

    const shoppingPurchaseDraftLines = await readOwnedDraftLines(supabase, shoppingDraftsOnly(purchaseDrafts), shoppingLists, shoppingItems)

    const data = {
      export: { formatVersion: '1.0', generatedAt: new Date().toISOString(), accountEmail: user.email ?? null, consistency: 'Tables are read independently; records may change during generation.', excluded: ['OAuth access and refresh tokens', 'Internal abuse-control counters', 'Provider mailbox contents that PlaENC does not store'] },
      accounts, wallets, categories, transactions, categoryBudgets, walletBudgets, categorizationRules: rules,
      duplicateReviews, emailSources, budgetRolloverReviews: rolloverReviews, stores, shoppingLists, shoppingItems,
      priceHistory, yieldConfigs, yieldRates, shoppingPurchaseDrafts: purchaseDrafts, shoppingPurchaseDraftLines,
      documentAcceptances: acceptances, gmailConnections, supportRequests, productEvents,
    }
    return new Response(JSON.stringify(data, null, 2), {
      status: 200,
      headers: { ...privateHeaders, 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="plaenc-personal-data.json"' },
    })
  } catch {
    return new Response('We could not prepare the export. Please try again later.', { status: 503, headers: privateHeaders })
  }
}

async function readAll<Row>(fetchPage: (from: number, to: number) => PromiseLike<{ data: Row[] | null; error: { message: string } | null }>) {
  const rows: Row[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1)
    if (error) throw new Error('export_unavailable')
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE_SIZE) return rows
  }
}

function shoppingDraftsOnly(drafts: Tables<'shopping_purchase_drafts'>[]) { return drafts.map((draft) => draft.id) }

async function readOwnedDraftLines(
  supabase: Awaited<ReturnType<typeof createClient>>,
  draftIds: string[],
  lists: Tables<'shopping_lists'>[],
  items: Tables<'shopping_list_items'>[],
) {
  const listIds = lists.map((list) => list.id)
  const itemIds = items.map((item) => item.id)
  if (!draftIds.length || !listIds.length || !itemIds.length) return []
  return readAll<Tables<'shopping_purchase_draft_lines'>>((from, to) =>
    supabase.from('shopping_purchase_draft_lines').select('*').in('draft_id', draftIds).in('list_id', listIds).in('item_id', itemIds).order('id').range(from, to),
  )
}

const privateHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Content-Security-Policy': "default-src 'none'; sandbox",
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
}
