import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'

export async function matchCategorizationRule(
  supabase: SupabaseClient<Database>,
  userId: string,
  description: string
) {
  const { data: rules } = await supabase
    .from('categorization_rules')
    .select('id, pattern, match_type, category_id, times_used')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('priority', { ascending: false })

  const normalized = description.toLowerCase()

  for (const rule of rules ?? []) {
    const isMatch =
      rule.match_type === 'exact' ? normalized === rule.pattern :
      rule.match_type === 'regex' ? new RegExp(rule.pattern, 'i').test(description) :
      normalized.includes(rule.pattern)

    if (isMatch) return rule
  }
  return null
}