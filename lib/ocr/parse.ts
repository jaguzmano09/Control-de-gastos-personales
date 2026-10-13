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
  const decimalSeparator = lastComma > lastDot ? ',' : lastDot > -1 && normalized.length - lastDot - 1 === 2 ? '.' : null
  const integerPart = decimalSeparator ? normalized.slice(0, normalized.lastIndexOf(decimalSeparator)) : normalized
  const decimalPart = decimalSeparator ? normalized.slice(normalized.lastIndexOf(decimalSeparator) + 1) : ''
  const amount = Number(`${integerPart.replace(/[.,]/g, '')}.${decimalPart}`)

  return Number.isFinite(amount) ? Math.round(amount) : 0
}

function findAmount(lines: string[]) {
  const totalLine = lines.find((line) => /\b(?:total|fotal)\b/i.test(line) && !/impuesto/i.test(line))
  const totalMatch = totalLine?.match(/(?:[$]\s*)?(\d[\d.,]*)\s*$/)
  if (totalMatch) return parseMoney(totalMatch[1])

  const amountLine = lines.find((line) => /(?:cu[aá]nto|valor\s+(?:total|a pagar)|pago)/i.test(line))
  const amountMatch = amountLine?.match(/[$]?\s*(\d[\d.,]*)/)
  return amountMatch ? parseMoney(amountMatch[1]) : 0
}

function findDate(text: string) {
  const numericDate = text.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/)
  if (numericDate) return `${numericDate[1]}-${numericDate[2].padStart(2, '0')}-${numericDate[3].padStart(2, '0')}`

  const writtenDate = text.match(/\b(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(20\d{2})\b/i)
  if (!writtenDate) return ''
  const month = MONTHS[writtenDate[2].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()]
  return month ? `${writtenDate[3]}-${month}-${writtenDate[1].padStart(2, '0')}` : ''
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

  return {
    occurred_at,
    amount,
    description,
    suggested_category: '',
    confidence: amount > 0 && occurred_at && description ? 0.75 : 0,
  }
}
