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
  const label = /\b(?:t[o0]tal|f[o0]tal|t[o0]t[aá]l|valor\s+(?:total|a\s+pagar)|a\s+pagar|pago\s+(?:realizado|total|por))\b/i
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (/^(?:sub\s*total|impuesto|iva|cambio|devuelta)\b/i.test(line)) continue
    const match = label.exec(line)
    if (!match) continue
    const afterLabel = line.slice(match.index + match[0].length).split(/\b(?:cambio|devuelta|efectivo|iva|impuesto|nit|referencia)\b/i)[0]
    const candidate = (afterLabel.trim() || (lines[index + 1] && /^[$\d\s.,]+$/.test(lines[index + 1]) ? lines[index + 1] : ''))
      .replace(/\b\d{1,3}(?:\s+\d{3})+\b/g, (value) => value.replace(/\s+/g, ''))
    if (!candidate) continue
    const currency = candidate.match(/\$\s*(\d[\d.,]*)/)
    if (currency) return parseMoney(currency[1])
    const amounts = (candidate.match(/\d[\d.,]*/g) ?? []).map(parseMoney)
    const amount = amounts.find((value) => value >= 100) ?? amounts[0] ?? 0
    if (amount > 0) return amount
  }

  // Unlabeled prices may be line items, tax, invoice IDs, or account numbers.
  return 0
}

function findDate(text: string) {
  const toIsoDate = (year: number, month: number, day: number) => {
    if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) return ''
    const date = new Date(Date.UTC(year, month - 1, day))
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return ''
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const lines = text.split(/\r?\n/).filter((line) => !/\b(?:vencimiento|vence|fecha\s+l[ií]mite)\b/i.test(line))
  const datedLines = lines.filter((line) => /\b(?:fecha|emisi[oó]n|compra|transacci[oó]n)\b/i.test(line))
  for (const line of [...datedLines, ...lines]) {
    for (const match of Array.from(line.matchAll(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/g))) {
      const date = toIsoDate(Number(match[1]), Number(match[2]), Number(match[3]))
      if (date) return date
    }
    // Colombian receipts commonly print dates as day/month/year.
    for (const match of Array.from(line.matchAll(/\b(\d{1,2})[./-](\d{1,2})[./-](20\d{2})\b/g))) {
      const date = toIsoDate(Number(match[3]), Number(match[2]), Number(match[1]))
      if (date) return date
    }
    for (const match of Array.from(line.matchAll(/\b(\d{1,2})\s+de\s+([a-záéíóú]+)\s+de\s+(20\d{2})\b/gi))) {
      const month = MONTHS[match[2].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()]
      const date = month ? toIsoDate(Number(match[3]), Number(month), Number(match[1])) : ''
      if (date) return date
    }
  }
  return ''
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
