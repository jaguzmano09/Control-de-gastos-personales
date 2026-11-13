'use client'

import { useState, useTransition } from 'react'
import {
  addShoppingListItem,
  completeShoppingList,
  deleteShoppingList,
  deleteShoppingListItem,
  duplicateShoppingList,
  reopenShoppingList,
  createShoppingPurchaseDraft,
  updateShoppingList,
  updateShoppingListItem,
  toggleShoppingListItem,
} from '@/lib/actions/shopping-lists'

type Store = { id: string; name: string }
type Item = {
  id: string
  list_id: string
  name: string
  quantity: number
  unit: string
  estimated_unit_price: number | null
  actual_unit_price: number | null
  is_checked: boolean
  position: number
  group_name?: string | null
}
type List = {
  id: string
  name: string
  store_id: string | null
  status: string
  completed_at: string | null
  created_at: string
  shopping_list_items: Item[]
}

const inputClass = 'input min-w-0 flex-1'
const units = ['und', 'kg', 'g', 'lb', 'l', 'ml']
const money = (value: number | null) => value == null ? '—' : `$${value.toFixed(2)}`

export function ShoppingLists({
  lists,
  stores,
  itemSuggestions,
  itemSuccess,
  itemSuccessListId,
}: {
  lists: List[]
  stores: Store[]
  itemSuggestions: string[]
  itemSuccess?: string
  itemSuccessListId?: string
}) {
  const [isSectionOpen, setIsSectionOpen] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [checkedOverrides, setCheckedOverrides] = useState<Record<string, boolean>>({})
  const [dirtyItems, setDirtyItems] = useState<Record<string, boolean>>({})
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('todas')
  const [storeFilter, setStoreFilter] = useState('todas')
  const [dateFilter, setDateFilter] = useState('')
  const [selectedForPurchase, setSelectedForPurchase] = useState<Set<string>>(new Set())
  const filteredLists = lists.filter((list) => {
    const matchesName = list.name.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')) || list.shopping_list_items.some((item) => item.name.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')))
    const filterDate = list.status === 'completada' ? list.completed_at : list.created_at
    return matchesName && (statusFilter === 'todas' || list.status === statusFilter) && (storeFilter === 'todas' || list.store_id === storeFilter) && (!dateFilter || filterDate?.slice(0, 10) === dateFilter)
  })

  function isItemChecked(item: Item) {
    return checkedOverrides[item.id] ?? item.is_checked
  }

  function toggleItem(item: Item) {
    const nextChecked = !isItemChecked(item)
    setCheckedOverrides((current) => ({ ...current, [item.id]: nextChecked }))
    const formData = new FormData()
    formData.set('id', item.id)
    formData.set('is_checked', String(nextChecked))
    startTransition(() => {
      toggleShoppingListItem(formData).then((result) => {
        if (result?.error) {
          setCheckedOverrides((current) => ({ ...current, [item.id]: !nextChecked }))
        }
      })
    })
  }

  function updateDirtyState(item: Item, form: HTMLFormElement | null) {
    if (!form) return
    const value = (name: string) => String(new FormData(form).get(name) ?? '')
    const dirty =
      value('name') !== item.name ||
      value('quantity') !== String(item.quantity) ||
      value('unit') !== item.unit ||
      value('estimated_unit_price') !== (item.estimated_unit_price == null ? '' : String(item.estimated_unit_price)) ||
      value('actual_unit_price') !== (item.actual_unit_price == null ? '' : String(item.actual_unit_price))
    setDirtyItems((current) => ({ ...current, [item.id]: dirty }))
  }

  function toggleSection() {
    if (isSectionOpen) setOpen(null)
    setIsSectionOpen((current) => !current)
  }

  return (
    <section className="panel mt-8 overflow-hidden">
      <button
        type="button"
        onClick={toggleSection}
        aria-expanded={isSectionOpen}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <span>
          <span className="font-serif text-2xl text-ledger-text">Listas de mercado actuales</span>
          <span className="mt-1 block text-sm text-ledger-muted">Abre esta sección para elegir y gestionar una lista.</span>
        </span>
        <span className="text-ledger-muted" aria-hidden="true">{isSectionOpen ? '−' : '+'}</span>
      </button>

      {isSectionOpen && (
        <div className="space-y-5 border-t border-black/10 bg-white/40 p-4 sm:p-6">
          <div className="grid gap-2 sm:grid-cols-4">
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="input" placeholder="Buscar lista o artículo" aria-label="Buscar listas o artículos" />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="input" aria-label="Filtrar por estado"><option value="todas">Todos los estados</option><option value="activa">Activas</option><option value="completada">Completadas</option></select>
            <select value={storeFilter} onChange={(event) => setStoreFilter(event.target.value)} className="input" aria-label="Filtrar por tienda"><option value="todas">Todas las tiendas</option>{stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select>
            <input type="date" lang="es-CO" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="input" aria-label="Filtrar por fecha: creación para activas y finalización para completadas" />
          </div>
          {selectedForPurchase.size > 0 && <form action={createShoppingPurchaseDraft} className="rounded-xl border border-ledger-green/20 bg-ledger-green/5 p-3"><p className="text-sm text-ledger-muted">Se incluirán solo artículos marcados que tengan precio real. Las listas no se completarán automáticamente.</p>{Array.from(selectedForPurchase).map((id) => <input key={id} type="hidden" name="list_id" value={id} />)}<button className="btn btn-primary mt-2 w-full sm:w-auto">Preparar compra consolidada</button></form>}
      {filteredLists.map((list) => {
        const estimated = list.shopping_list_items.reduce((sum, i) => sum + (i.estimated_unit_price ?? 0) * i.quantity, 0)
        const checked = list.shopping_list_items.filter((i) => isItemChecked(i))
        const realTotal = checked.reduce((sum, i) => sum + (i.actual_unit_price ?? 0) * i.quantity, 0)
        const estimateForUnpriced = checked.reduce((sum, i) => sum + (i.actual_unit_price == null ? (i.estimated_unit_price ?? 0) * i.quantity : 0), 0)
        const store = stores.find((s) => s.id === list.store_id)?.name
        const isOpen = open === list.id

        return (
          <section key={list.id} className="panel overflow-hidden">
            <div className="flex items-center gap-2 p-4">
              <input type="checkbox" checked={selectedForPurchase.has(list.id)} onChange={() => setSelectedForPurchase((current) => { const next = new Set(current); next.has(list.id) ? next.delete(list.id) : next.add(list.id); return next })} aria-label={`Incluir ${list.name} en compra consolidada`} />
              <button type="button" onClick={() => setOpen(isOpen ? null : list.id)} aria-expanded={isOpen} className="flex min-w-0 flex-1 items-center justify-between text-left">
                <span><span className="font-serif text-xl">{list.name}</span><span className="ml-3 text-xs text-ledger-muted">{store ?? 'Sin tienda'} · {list.status}</span></span>
                <span className="text-ledger-muted" aria-hidden="true">{isOpen ? '−' : '+'}</span>
              </button>
            </div>
            {isOpen && (
              <div className="space-y-6 border-t border-black/10 bg-white/40 p-4 sm:p-6">
                <div className="flex flex-col gap-3 rounded-xl border border-black/5 bg-ledger-paper/60 p-4 sm:flex-row sm:items-end">
                  <form action={updateShoppingList} className="grid flex-1 gap-3 sm:grid-cols-[minmax(0,1fr)_11rem_auto] sm:items-end">
                    <input type="hidden" name="id" value={list.id} />
                    <label className="flex-1 text-xs text-ledger-muted">
                      Nombre de la lista
                      <input name="name" defaultValue={list.name} required className="input mt-1 w-full" />
                    </label>
                    <label className="text-xs text-ledger-muted">
                      Tienda
                      <select name="store_id" defaultValue={list.store_id ?? ''} className="input mt-1 w-40">
                        <option value="">Sin tienda</option>
                        {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
                      </select>
                    </label>
                    <button className="btn btn-secondary btn-sm" type="submit">Guardar lista</button>
                  </form>
                  <form action={deleteShoppingList} className="sm:pb-0.5">
                    <input type="hidden" name="id" value={list.id} />
                    <button className="btn-link btn-sm text-red-700" type="submit">Eliminar lista</button>
                  </form>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-black/5 bg-ledger-paper/60 p-3 text-center">
                    <p className="text-xs uppercase tracking-wide text-ledger-muted">Estimado</p>
                    <strong className="mt-1 block text-lg">{money(estimated)}</strong>
                  </div>
                  <div className="rounded-xl border border-ledger-green/10 bg-ledger-green/5 p-3 text-center">
                    <p className="text-xs uppercase tracking-wide text-ledger-muted">Total real</p>
                    <strong className="mt-1 block text-lg">{money(realTotal)}</strong>
                  </div>
                  <div className="rounded-xl border border-black/5 bg-ledger-paper/60 p-3 text-center">
                    <p className="text-xs uppercase tracking-wide text-ledger-muted">Estimación pendiente</p>
                    <strong className="mt-1 block text-lg">{money(estimateForUnpriced)}</strong>
                  </div>
                </div>
                <div className="space-y-2">
                  {[...list.shopping_list_items].sort((a, b) => a.position - b.position).map((item) => {
                    const checkedState = isItemChecked(item)
                    const expanded = expandedItems.has(item.id)
                    return (
                    <form key={item.id} action={updateShoppingListItem} className={`rounded-xl border p-3 ${checkedState ? 'border-ledger-green/30 bg-ledger-green/5' : 'border-black/10 bg-white/70'}`}>
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="is_checked" value={checkedState ? 'true' : 'false'} />
                      <div className="flex items-start gap-3">
                        <button type="button" onClick={() => toggleItem(item)} disabled={isPending} className="mt-1 h-9 w-9 shrink-0 rounded-lg border border-black/20 bg-white text-sm disabled:opacity-60" aria-label={checkedState ? 'Desmarcar artículo' : 'Marcar artículo'}>{checkedState ? '✓' : ''}</button>
                        <button type="button" onClick={() => setExpandedItems((current) => {
                          const next = new Set(current)
                          if (next.has(item.id)) next.delete(item.id)
                          else next.add(item.id)
                          return next
                        })} className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left">
                          <span className={`truncate text-base font-medium ${checkedState ? 'text-ledger-muted line-through' : 'text-ledger-text'}`}>{item.name}</span>
                          <span className="shrink-0 text-xs text-ledger-muted">{expanded ? 'Ocultar' : 'Editar'}</span>
                        </button>
                      </div>
                      {expanded && <div className="mt-3 border-t border-black/5 pt-3">
                        <label className="block text-xs font-medium text-ledger-muted">Artículo<input name="name" list="shopping-item-suggestions" defaultValue={item.name} onChange={(event) => updateDirtyState(item, event.currentTarget.form)} className="input mt-1 w-full text-base" /></label>
                        <label className="mt-3 block text-xs text-ledger-muted">Grupo libre <input name="group_name" defaultValue={item.group_name ?? ''} placeholder="Ej. Despensa" className="input mt-1 w-full" /></label>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                        <label className="text-xs text-ledger-muted">Cantidad<input name="quantity" type="number" min="0.001" step="0.001" defaultValue={item.quantity} onChange={(event) => updateDirtyState(item, event.currentTarget.form)} className="input mt-1 w-full" /></label>
                        <label className="text-xs text-ledger-muted">Unidad<select name="unit" defaultValue={item.unit} onChange={(event) => updateDirtyState(item, event.currentTarget.form)} className="input mt-1 w-full">{units.map((unit) => <option key={unit}>{unit}</option>)}</select></label>
                        <label className="text-xs text-ledger-muted">Precio estimado<input name="estimated_unit_price" type="number" min="0" step="0.01" placeholder="Opcional" defaultValue={item.estimated_unit_price ?? ''} onChange={(event) => updateDirtyState(item, event.currentTarget.form)} className="input mt-1 w-full" /></label>
                        <label className="text-xs text-ledger-muted">Precio real<input name="actual_unit_price" type="number" min="0" step="0.01" placeholder="Opcional" defaultValue={item.actual_unit_price ?? ''} onChange={(event) => updateDirtyState(item, event.currentTarget.form)} className="input mt-1 w-full" /></label>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-black/5 pt-3">
                          <button className="btn btn-secondary btn-sm w-full disabled:cursor-not-allowed disabled:opacity-50" type="submit" disabled={!dirtyItems[item.id]}>Guardar cambios</button>
                          <button className="btn-link btn-sm w-full justify-center text-red-700" formAction={deleteShoppingListItem}>Borrar</button>
                        </div>
                      </div>}
                    </form>
                    )
                  })}
                </div>
                {list.status === 'activa' && <form key={`add-item-${list.id}-${itemSuccessListId === list.id ? itemSuccess : 'empty'}`} action={addShoppingListItem} className="rounded-xl border border-dashed border-ledger-green/30 bg-ledger-green/5 p-4">
                  <p className="mb-3 text-sm font-medium text-ledger-text">Agregar artículo</p>
                  <input type="hidden" name="list_id" value={list.id} />
                  <div className="space-y-3">
                    <label className="block text-xs font-medium text-ledger-muted">Artículo<input name="name" list="shopping-item-suggestions" placeholder="Ej. Leche" required className="input mt-1 w-full text-base" /></label>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-xs text-ledger-muted">Cantidad<input name="quantity" type="number" min="0.001" step="0.001" placeholder="Opcional" className="input mt-1 w-full" /></label>
                      <label className="text-xs text-ledger-muted">Unidad<select name="unit" defaultValue="und" className="input mt-1 w-full">{units.map((unit) => <option key={unit}>{unit}</option>)}</select></label>
                    </div>
                    <label className="block text-xs text-ledger-muted">Precio estimado <span className="font-normal">(opcional)</span><input name="estimated_unit_price" type="number" min="0" step="0.01" placeholder="Ej. 4500" className="input mt-1 w-full" /></label>
                    <button className="btn btn-primary w-full" type="submit">Agregar artículo</button>
                  </div>
                  {itemSuccess && itemSuccessListId === list.id && (
                    <p role="status" className="mt-3 rounded-lg border border-ledger-green/20 bg-white/70 px-3 py-2 text-sm text-ledger-green">
                      {itemSuccess}
                    </p>
                  )}
                </form>}
                <div className="grid gap-2 border-t border-black/10 pt-5 sm:flex sm:flex-wrap">
                  {list.status === 'activa' ? <form action={completeShoppingList}><input type="hidden" name="id" value={list.id} /><input type="hidden" name="observed_on" value={new Date().toLocaleDateString('en-CA')} /><button className="btn btn-primary w-full sm:w-auto">Completar lista</button></form> : <form action={reopenShoppingList}><input type="hidden" name="id" value={list.id} /><button className="btn btn-secondary w-full sm:w-auto">Reabrir lista</button></form>}
                  <button type="button" onClick={() => setSelectedForPurchase((current) => new Set(current).add(list.id))} className="btn btn-secondary w-full sm:w-auto">Incluir en compra consolidada</button>
                  <form action={duplicateShoppingList}><input type="hidden" name="id" value={list.id} /><button className="btn btn-secondary w-full sm:w-auto">Duplicar sin marcar</button></form>
                </div>
              </div>
            )}
          </section>
        )
      })}
          {!lists.length && <p className="rounded-xl border border-black/10 bg-white/70 p-8 text-sm text-ledger-muted">Todavía no tienes listas. Crea la primera arriba.</p>}
          <datalist id="shopping-item-suggestions">{itemSuggestions.map((name) => <option key={name} value={name} />)}</datalist>
        </div>
      )}
    </section>
  )
}
