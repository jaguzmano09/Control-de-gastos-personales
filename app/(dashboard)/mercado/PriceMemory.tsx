'use client'

import { useMemo, useState } from 'react'

type Store = { id: string; name: string }
type PriceMemoryEntry = {
  id: string
  name: string
  name_key: string
  store_id: string | null
  unit: string
  unit_price: number
  observed_on: string
}

const ALL_STORES = '__all__'
const NO_STORE = '__none__'

export function PriceMemory({ entries, stores }: { entries: PriceMemoryEntry[]; stores: Store[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedStore, setSelectedStore] = useState(ALL_STORES)
  const storesWithHistory = useMemo(
    () => stores.filter((store) => entries.some((entry) => entry.store_id === store.id)),
    [entries, stores],
  )
  const hasEntriesWithoutStore = entries.some((entry) => entry.store_id === null)
  const visibleEntries = entries
    .filter((entry) => selectedStore === ALL_STORES || (selectedStore === NO_STORE ? entry.store_id === null : entry.store_id === selectedStore))
    .slice(0, 12)

  return (
    <section className="panel mt-5 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <span>
          <span className="font-serif text-xl">Memoria de precios</span>
          <span className="mt-1 block text-sm text-ledger-muted">Consulta precios anteriores por tienda cuando lo necesites.</span>
        </span>
        <span className="text-ledger-muted" aria-hidden="true">{isOpen ? '−' : '+'}</span>
      </button>

      {isOpen && (
        <div className="border-t border-black/10 bg-white/40 p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <p className="text-sm text-ledger-muted">Últimos precios registrados por producto, tienda y unidad.</p>
            {entries.length > 0 && (
              <label className="text-xs font-medium text-ledger-muted">
                Tienda
                <select
                  value={selectedStore}
                  onChange={(event) => setSelectedStore(event.target.value)}
                  className="input mt-1 w-full min-w-48 sm:w-56"
                  aria-label="Filtrar memoria de precios por tienda"
                >
                  <option value={ALL_STORES}>Todas las tiendas</option>
                  {storesWithHistory.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
                  {hasEntriesWithoutStore && <option value={NO_STORE}>Sin tienda</option>}
                </select>
              </label>
            )}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {visibleEntries.map((entry) => (
              <div key={entry.id} className="rounded-sm border border-black/10 bg-white p-3 text-sm">
                <p className="font-medium">{entry.name}</p>
                <p className="mt-1 text-xs text-ledger-muted">{stores.find((store) => store.id === entry.store_id)?.name ?? 'Sin tienda'} · {entry.unit}</p>
                <p className="mt-2 text-ledger-green">${entry.unit_price.toFixed(2)} <span className="text-xs text-ledger-muted">· {entry.observed_on}</span></p>
              </div>
            ))}
            {!entries.length && <p className="text-sm text-ledger-muted">Aún no hay precios registrados.</p>}
            {entries.length > 0 && !visibleEntries.length && <p className="text-sm text-ledger-muted">No hay precios registrados para esta tienda.</p>}
          </div>
        </div>
      )}
    </section>
  )
}
