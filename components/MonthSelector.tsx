import { shiftYearMonth } from '@/lib/date-utils'

export function MonthSelector({ yearMonth, basePath }: { yearMonth: string; basePath: string }) {
  const prev = shiftYearMonth(yearMonth, -1)
  const next = shiftYearMonth(yearMonth, 1)
  const label = new Date(`${yearMonth}-01T00:00:00`).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })

  return (
    <div className="flex flex-wrap items-center gap-3">
      <a href={`${basePath}?month=${prev}`} aria-label="Mes anterior" className="rounded-sm border border-black/10 px-2 py-1 text-ledger-muted hover:bg-black/5">←</a>
      <span className="text-sm capitalize text-ledger-text">{label}</span>
      <a href={`${basePath}?month=${next}`} aria-label="Mes siguiente" className="rounded-sm border border-black/10 px-2 py-1 text-ledger-muted hover:bg-black/5">→</a>
      <form method="get" action={basePath} className="flex items-center gap-2">
        <input type="month" name="month" defaultValue={yearMonth} className="rounded-sm border border-black/10 bg-white px-2 py-1 text-sm text-ledger-text" />
        <button type="submit" className="rounded-sm bg-ledger-green px-3 py-1 text-xs font-medium text-white hover:bg-ledger-green/90">Ir</button>
      </form>
    </div>
  )
}