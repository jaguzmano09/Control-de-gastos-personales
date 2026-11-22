const MONTHS: Record<string, string> = {
  enero: '01',
  febrero: '02',
  marzo: '03',
  abril: '04',
  mayo: '05',
  junio: '06',
  julio: '07',
  agosto: '08',
  septiembre: '09',
  setiembre: '09',
  octubre: '10',
  noviembre: '11',
  diciembre: '12',
}

function parseMoney(value: string) {
  const normalized = value.replace(/[^\d.,]/g, '')
  if (!normalized) return 0

  const lastComma = normalized.lastIndexOf(',')
  const lastDot = normalized.lastIndexOf('.')
  const lastSeparator = Math.max(lastComma, lastDot)
  const fractionalDigits = lastSeparator < 0 ? 0 : normalized.length - lastSeparator - 1
  const decimalSeparator = fractionalDigits > 0 && fractionalDigits <= 2
    ? normalized[lastSeparator]
    : null
  const integerPart = decimalSeparator ? normalized.slice(0, normalized.lastIndexOf(decimalSeparator)) : normalized
  const decimalPart = decimalSeparator ? normalized.slice(normalized.lastIndexOf(decimalSeparator) + 1) : ''
  const amount = Number(`${integerPart.replace(/[.,]/g, '')}.${decimalPart}`)

  return Number.isFinite(amount) ? Math.round(amount) : 0
}

function findAmount(lines: string[]) {
  const amountPattern = /[$]?\s*(\d[\d.,]*)/
  const totalLineIndex = lines.findIndex((line) =>
    /\b(?:t[o0]tal|f[o0]tal|t[o0]t[aá]l|valor\s+(?:total|a\s+pagar)|a\s+pagar)\b/i.test(line)
    && !/impuesto/i.test(line),
  )
  if (totalLineIndex >= 0) {
    const sameLineMatches = lines[totalLineIndex].match(/[$]?\s*(\d[\d.,]*)/g) ?? []
    const nextLineMatches = lines[totalLineIndex + 1]?.match(/[$]?\s*(\d[\d.,]*)/g) ?? []
    const totalMatches = sameLineMatches.length > 0 ? sameLineMatches : nextLineMatches
    const totalAmount = Math.max(0, ...totalMatches.map(parseMoney))
    if (totalAmount > 0) return totalAmount
  }

  const amountLabelIndex = lines.findIndex((line) => /(?:cu[aá]nto|valor\s+(?:total|a pagar)|pago\s+(?:realizado|total|por))/i.test(line))
  if (amountLabelIndex >= 0) {
    const amountText = lines.slice(amountLabelIndex, amountLabelIndex + 3).join(' ')
    const amountMatch = amountText.match(amountPattern)
    if (amountMatch) return parseMoney(amountMatch[1])
  }

  for (const line of lines) {
    const currencyMatch = line.match(/[$]\s*(\d[\d.,]*)/)
    if (currencyMatch) return parseMoney(currencyMatch[1])
  }

  // Unlabeled numbers may be invoice IDs, tax IDs, dates, or account numbers.
  return 0
}

function findDate(text: string) {
  const toIsoDate = (year: number, month: number, day: number) => {
    if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) return ''
    const date = new Date(Date.UTC(year, month - 1, day))
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return ''
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const isoDate = text.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/)
  if (isoDate) return toIsoDate(Number(isoDate[1]), Number(isoDate[2]), Number(isoDate[3]))

  // Colombian receipts commonly print dates as day/month/year.
  const colombianDate = text.match(/\b(\d{1,2})[./-](\d{1,2})[./-](20\d{2})\b/)
  if (colombianDate) return toIsoDate(Number(colombianDate[3]), Number(colombianDate[2]), Number(colombianDate[1]))

  const writtenDate = text.match(/\b(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(20\d{2})\b/i)
  if (!writtenDate) return ''
  const month = MONTHS[writtenDate[2].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()]
  return month ? toIsoDate(Number(writtenDate[3]), Number(month), Number(writtenDate[1])) : ''
}

function findDescription(lines: string[]) {
  const descriptionIndex = lines.findIndex((line) => /descripci[oó]n de compra/i.test(line))
  if (descriptionIndex >= 0) {
    const description = lines[descriptionIndex + 1]
    if (description) return description
  }

  const merchant = lines.find((line) => /^tiendas?\b/i.test(line) && line.length >= 8)
  if (merchant) return merchant

  return lines.find((line) =>
    /[a-záéíóúñ]{4}/i.test(line)
    && !/^(total|fotal|tienda|nequi|resumen|factura|fecha|estado|cus|c[oó]digo|descripci[oó]n|cantidad|valor)/i.test(line),
  ) ?? ''
}

export function parseOcrText(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean)
  const amount = findAmount(lines)
  const occurred_at = findDate(text)
  const description = findDescription(lines)
  const confidence = amount > 0
    ? occurred_at && description ? 0.75 : 0.35
    : 0

  return {
    occurred_at,
    amount,
    description: description.slice(0, 240),
    suggested_category: '',
    confidence,
  }
}
