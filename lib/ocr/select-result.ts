import { classifyReceiptDocument } from './document-kind.ts'
import { parseOcrText } from './parse.ts'

export type OcrCandidate = { text: string; confidence: number }

export function hasFinancialConsensus(candidates: OcrCandidate[]) {
  if (candidates.length < 2) return false
  if (candidates[0].confidence < 85 || candidates[1].confidence < 85) return false
  const first = parseOcrText(candidates[0].text)
  const second = parseOcrText(candidates[1].text)
  return first.amount > 0 && first.amount === second.amount
    && Boolean(first.occurred_at) && first.occurred_at === second.occurred_at
    && Boolean(first.description) && Boolean(second.description)
}

export function selectOcrResult(candidates: OcrCandidate[]) {
  const parsed = candidates.map((candidate) => ({ candidate, fields: parseOcrText(candidate.text) }))
  const score = (item: typeof parsed[number]) =>
    (item.fields.amount > 0 ? 4 : 0)
    + (item.fields.occurred_at ? 3 : 0)
    + (item.fields.description ? 1 : 0)
    + Math.max(0, Math.min(100, item.candidate.confidence)) / 100
  const selected = parsed.reduce((best, item) => score(item) > score(best) ? item : best, parsed[0])
  const amounts = new Set(parsed.map((item) => item.fields.amount).filter((amount) => amount > 0))
  const dates = new Set(parsed.map((item) => item.fields.occurred_at).filter(Boolean))

  return {
    text: selected?.candidate.text ?? '',
    confidence: selected?.candidate.confidence ?? 0,
    amountConflict: amounts.size > 1,
    dateConflict: dates.size > 1,
    documentKind: candidates.some((item) => classifyReceiptDocument(item.text) === 'transfer') ? 'transfer' as const : 'unclassified' as const,
  }
}
