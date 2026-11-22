type DraftFields = { amount: number; occurred_at: string }
type ConfirmedFields = { amount: number; occurred_at: string }

export function buildOcrReviewMetadata(rawData: unknown, draft: DraftFields, confirmed: ConfirmedFields) {
  const metadata = rawData && typeof rawData === 'object' && !Array.isArray(rawData)
    ? rawData as Record<string, unknown>
    : {}

  return {
    engine: typeof metadata.engine === 'string' ? metadata.engine : 'manual-review',
    date_inferred: metadata.date_inferred === true,
    amount_conflict: metadata.amount_conflict === true,
    document_kind: metadata.document_kind === 'transfer' ? 'transfer' : 'unclassified',
    review: {
      amount_corrected: Number(draft.amount) !== confirmed.amount,
      date_corrected: draft.occurred_at !== confirmed.occurred_at,
      amount_missing: Number(draft.amount) === 0,
    },
  }
}
