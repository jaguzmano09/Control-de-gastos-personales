import { createClient } from '@/lib/supabase/server'
import { createShoppingList, createStore, deleteStore, updateStore } from '@/lib/actions/shopping-lists'
import { ShoppingLists } from './ShoppingLists'

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
}
type List = {
  id: string
  name: string
  store_id: string | null
  status: string
  completed_at: string | null
  shopping_list_items: Item[]
}
type PriceMemory = { name: string; name_key: string; store_id: string | null; unit: string; unit_price: number; observed_on: string }

function displayError(value: string) {
  try {
    const decoded = decodeURIComponent(value)
    if (!decoded.includes('Ã') && !decoded.includes('Â')) return decoded
    return decodeURIComponent(escape(decoded))
  } catch {
    return value
  }
}

function displayMessage(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export default async function MercadoPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string; success_list_id?: string }
}) {
  const supabase = await createClient()
  const [{ data: storesData }, { data: listsData }, { data: historyData }, { data: itemNames }] = await Promise.all([
    supabase.from('stores').select('id, name').order('name'),
    supabase.from('shopping_lists')
      .select('id, name, store_id, status, completed_at, shopping_list_items(*)')
      .order('created_at', { ascending: false }),
    supabase.from('price_history').select('name, name_key, store_id, unit, unit_price, observed_on').order('observed_on', { ascending: false }).limit(200),
    supabase.from('shopping_list_items').select('name, name_key').order('name'),
  ])
  const stores = (storesData ?? []) as Store[]
  const lists = (listsData ?? []) as unknown as List[]
  const history = (historyData ?? []) as PriceMemory[]
  const itemSuggestions = Array.from(new Map((itemNames ?? []).map((item) => [item.name_key, item.name])).values())

  return (
    <div>
      <h1 className="font-serif text-2xl text-ledger-text">Lista de mercado</h1>
      <div className="mt-2 h-px w-10 bg-ledger-green" />
      {searchParams.error && (
        <p className="mt-4 rounded-sm border border-red-200 bg-red-50 p-3 text-sm text-red-700">{displayError(searchParams.error)}</p>
      )}

      <section className="mt-8">
        <form action={createShoppingList} className="panel p-4">
          <h2 className="font-serif text-lg">Nueva lista</h2>
          <div className="mt-3 flex gap-2">
            <input name="name" placeholder="Compra semanal" required className="input flex-1" />
            <select name="store_id" className="input w-36">
              <option value="">Sin tienda</option>
              {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
            </select>
          </div>
          <button className="btn btn-primary mt-3" type="submit">Crear lista</button>
        </form>
      </section>

      <details className="panel mt-5 p-4">
        <summary className="cursor-pointer font-serif text-lg">Tiendas y configuración</summary>
        <p className="mt-1 text-sm text-ledger-muted">Agrega, edita o elimina tiendas. Las listas relacionadas quedarán sin tienda.</p>
        <form action={createStore} className="mt-4 flex flex-wrap gap-2">
          <input name="name" placeholder="Nueva tienda" required className="input min-w-[16rem] flex-1" />
          <button className="btn btn-primary" type="submit">Agregar tienda</button>
        </form>
        <div className="mt-3 space-y-2">
          {stores.map((store) => (
            <div key={store.id} className="flex flex-wrap items-center gap-2">
              <form action={updateStore} className="flex min-w-[16rem] flex-1 gap-2">
                <input type="hidden" name="id" value={store.id} />
                <input name="name" defaultValue={store.name} required className="input flex-1" />
                <button className="btn btn-secondary btn-sm" type="submit">Guardar</button>
              </form>
              <form action={deleteStore}>
                <input type="hidden" name="id" value={store.id} />
                <button className="btn-link btn-sm text-red-700" type="submit">Eliminar</button>
              </form>
            </div>
          ))}
          {!stores.length && <p className="text-sm text-ledger-muted">Aún no has agregado tiendas.</p>}
        </div>
      </details>

      <section className="panel mt-5 p-4">
        <h2 className="font-serif text-lg">Memoria de precios</h2>
        <p className="mt-1 text-sm text-ledger-muted">Últimos precios registrados por producto, tienda y unidad.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {history.slice(0, 12).map((entry) => (
            <div key={`${entry.name_key}-${entry.store_id}-${entry.unit}-${entry.observed_on}`} className="rounded-sm border border-black/10 bg-white p-3 text-sm">
              <p className="font-medium">{entry.name}</p>
              <p className="mt-1 text-xs text-ledger-muted">{stores.find((store) => store.id === entry.store_id)?.name ?? 'Sin tienda'} · {entry.unit}</p>
              <p className="mt-2 text-ledger-green">${entry.unit_price.toFixed(2)} <span className="text-xs text-ledger-muted">· {entry.observed_on}</span></p>
            </div>
          ))}
          {!history.length && <p className="text-sm text-ledger-muted">Aún no hay precios registrados.</p>}
        </div>
      </section>

      <ShoppingLists
        lists={lists}
        stores={stores}
        itemSuggestions={itemSuggestions}
        itemSuccess={searchParams.success ? displayMessage(searchParams.success) : undefined}
        itemSuccessListId={searchParams.success_list_id}
      />
    </div>
  )
}
