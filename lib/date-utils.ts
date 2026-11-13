export function currentYearMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function todayInBogota() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function yearMonthToDate(yearMonth: string) {
  return `${yearMonth}-01`
}

export function formatYearMonth(yearMonth: string) {
  const date = new Date(yearMonth + '-01T00:00:00Z')
  const label = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date)
  return label.charAt(0).toLocaleUpperCase('es-CO') + label.slice(1)
}

export function shiftYearMonth(yearMonth: string, delta: number) {
  const [year, month] = yearMonth.split('-').map(Number)
  const date = new Date(year, month - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}
