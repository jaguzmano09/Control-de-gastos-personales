import { timingSafeEqual } from 'node:crypto'

export function hasValidCronAuthorization(header: string | null, secret: string) {
  if (!header) return false

  const received = Buffer.from(header, 'utf8')
  const expected = Buffer.from(`Bearer ${secret}`, 'utf8')
  return received.length === expected.length && timingSafeEqual(received, expected)
}
