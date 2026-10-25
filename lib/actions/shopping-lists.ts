'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const SHOPPING_PATH = '/mercado'

function normalizeName(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

function requiredText(formData: FormData, name: string) {
  return String(formData.get(name) ?? '').trim()
}

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return { supabase, user }
}

export async function createStore(formData: FormData) {
  const { supabase, user } = await getUser()
  const name = requiredText(formData, 'name')
  if (!name) redirect(`${SHOPPING_PATH}?error=Escribe el nombre de la tienda`)

  const { error } = await supabase.from('stores').insert({ user_id: user.id, name, name_key: normalizeName(name) })
  if (error) {
    const message = error.code === '23505' ? 'Esa tienda ya existe' : error.message
    redirect(`${SHOPPING_PATH}?error=${encodeURIComponent(message)}`)
  }
  revalidatePath(SHOPPING_PATH)
  redirect(SHOPPING_PATH)
}

export async function updateStore(formData: FormData) {
  const { supabase } = await getUser()
  const id = requiredText(formData, 'id')
  const name = requiredText(formData, 'name')
  if (!id || !name) redirect(`${SHOPPING_PATH}?error=Escribe el nombre de la tienda`)

  const { error } = await supabase
    .from('stores')
    .update({ name, name_key: normalizeName(name) })
    .eq('id', id)
  if (error) {
    const message = error.code === '23505' ? 'Esa tienda ya existe' : error.message
    redirect(`${SHOPPING_PATH}?error=${encodeURIComponent(message)}`)
  }
  revalidatePath(SHOPPING_PATH)
  redirect(SHOPPING_PATH)
}

export async function deleteStore(formData: FormData) {
  const { supabase } = await getUser()
  const id = requiredText(formData, 'id')
  const { error } = await supabase.from('stores').delete().eq('id', id)
  if (error) redirect(`${SHOPPING_PATH}?error=${encodeURIComponent(error.message)}`)
  revalidatePath(SHOPPING_PATH)
  redirect(SHOPPING_PATH)
}

export async function createShoppingList(formData: FormData) {
  const { supabase, user } = await getUser()
  const name = requiredText(formData, 'name')
  const storeId = requiredText(formData, 'store_id') || null
  if (!name) redirect(`${SHOPPING_PATH}?error=Escribe el nombre de la lista`)

  const { error } = await supabase.from('shopping_lists').insert({
    user_id: user.id,
    name,
    store_id: storeId,
    status: 'activa',
  })
  if (error) redirect(`${SHOPPING_PATH}?error=${encodeURIComponent(error.message)}`)
  revalidatePath(SHOPPING_PATH)
  redirect(SHOPPING_PATH)
}

export async function updateShoppingList(formData: FormData) {
  const { supabase } = await getUser()
  const id = requiredText(formData, 'id')
  const name = requiredText(formData, 'name')
  const storeId = requiredText(formData, 'store_id') || null
  if (!id || !name) redirect(`${SHOPPING_PATH}?error=Escribe el nombre de la lista`)

  const { error } = await supabase
    .from('shopping_lists')
    .update({ name, store_id: storeId })
    .eq('id', id)
  if (error) redirect(`${SHOPPING_PATH}?error=${encodeURIComponent(error.message)}`)
  revalidatePath(SHOPPING_PATH)
  redirect(SHOPPING_PATH)
}

export async function deleteShoppingList(formData: FormData) {
  const { supabase } = await getUser()
  const id = requiredText(formData, 'id')
  const { error } = await supabase.from('shopping_lists').delete().eq('id', id)
  if (error) redirect(`${SHOPPING_PATH}?error=${encodeURIComponent(error.message)}`)
  revalidatePath(SHOPPING_PATH)
  redirect(SHOPPING_PATH)
}

export async function addShoppingListItem(formData: FormData) {
  const { supabase, user } = await getUser()
  const listId = requiredText(formData, 'list_id')
  const name = requiredText(formData, 'name')
  const quantity = Number(formData.get('quantity') ?? 1)
  const unit = requiredText(formData, 'unit') || 'und'
  const estimated = requiredText(formData, 'estimated_unit_price')
  if (!listId || !name || !Number.isFinite(quantity) || quantity <= 0) {
    redirect(`${SHOPPING_PATH}?error=Completa el artículo y una cantidad válida`)
  }

  const { data: lastItem } = await supabase
    .from('shopping_list_items')
    .select('position')
    .eq('list_id', listId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await supabase.from('shopping_list_items').insert({
    user_id: user.id,
    list_id: listId,
    name,
    name_key: normalizeName(name),
    quantity,
    unit,
    estimated_unit_price: estimated ? Number(estimated) : null,
    position: (lastItem?.position ?? -1) + 1,
  })
  if (error) redirect(`${SHOPPING_PATH}?error=${encodeURIComponent(error.message)}`)
  revalidatePath(SHOPPING_PATH)
  redirect(SHOPPING_PATH)
}

export async function updateShoppingListItem(formData: FormData) {
  const { supabase } = await getUser()
  const id = requiredText(formData, 'id')
  const name = requiredText(formData, 'name')
  const quantity = Number(formData.get('quantity'))
  const unit = requiredText(formData, 'unit')
  const estimated = requiredText(formData, 'estimated_unit_price')
  const actual = requiredText(formData, 'actual_unit_price')
  const isChecked = formData.get('is_checked') === 'true'
  if (!id || !name || !Number.isFinite(quantity) || quantity <= 0) {
    redirect(`${SHOPPING_PATH}?error=Datos inválidos para el artículo`)
  }

  const { error } = await supabase.from('shopping_list_items').update({
    name,
    name_key: normalizeName(name),
    quantity,
    unit,
    estimated_unit_price: estimated ? Number(estimated) : null,
    actual_unit_price: actual ? Number(actual) : null,
    is_checked: isChecked,
  }).eq('id', id)
  if (error) redirect(`${SHOPPING_PATH}?error=${encodeURIComponent(error.message)}`)
  revalidatePath(SHOPPING_PATH)
  redirect(SHOPPING_PATH)
}

export async function deleteShoppingListItem(formData: FormData) {
  const { supabase } = await getUser()
  const id = requiredText(formData, 'id')
  const { error } = await supabase.from('shopping_list_items').delete().eq('id', id)
  if (error) redirect(`${SHOPPING_PATH}?error=${encodeURIComponent(error.message)}`)
  revalidatePath(SHOPPING_PATH)
  redirect(SHOPPING_PATH)
}

export async function duplicateShoppingList(formData: FormData) {
  const { supabase, user } = await getUser()
  const listId = requiredText(formData, 'id')
  const { data: source, error: sourceError } = await supabase
    .from('shopping_lists')
    .select('name, store_id')
    .eq('id', listId)
    .single()
  if (sourceError || !source) redirect(`${SHOPPING_PATH}?error=No se encontró la lista`)

  const { data: newList, error } = await supabase
    .from('shopping_lists')
    .insert({ user_id: user.id, name: `${source.name} (copia)`, store_id: source.store_id, status: 'activa' })
    .select('id')
    .single()
  if (error || !newList) redirect(`${SHOPPING_PATH}?error=${encodeURIComponent(error?.message ?? 'No se pudo duplicar')}`)

  const { data: items } = await supabase
    .from('shopping_list_items')
    .select('name, name_key, quantity, unit, actual_unit_price, position, notes')
    .eq('list_id', listId)
    .eq('is_checked', false)
    .order('position')

  let historyQuery = supabase
    .from('price_history')
    .select('name_key, unit, unit_price, observed_on')
    .eq('user_id', user.id)
    .order('observed_on', { ascending: false })
  historyQuery = source.store_id
    ? historyQuery.eq('store_id', source.store_id)
    : historyQuery.is('store_id', null)
  const { data: history } = await historyQuery

  if (items?.length) {
    const { error: itemsError } = await supabase.from('shopping_list_items').insert(
      items.map((item) => {
        const lastPrice = history?.find((entry) => entry.name_key === item.name_key && entry.unit === item.unit)
        return {
        user_id: user.id,
        list_id: newList.id,
        name: item.name,
        name_key: item.name_key,
        quantity: item.quantity,
        unit: item.unit,
        estimated_unit_price: lastPrice?.unit_price ?? item.actual_unit_price,
        position: item.position,
        notes: item.notes,
        }
      }),
    )
    if (itemsError) redirect(`${SHOPPING_PATH}?error=${encodeURIComponent(itemsError.message)}`)
  }
  revalidatePath(SHOPPING_PATH)
  redirect(SHOPPING_PATH)
}

export async function completeShoppingList(formData: FormData) {
  const { supabase } = await getUser()
  const id = requiredText(formData, 'id')
  const observedOn = requiredText(formData, 'observed_on') || undefined
  const { error } = await supabase.rpc('complete_shopping_list', { p_list_id: id, p_observed_on: observedOn })
  if (error) redirect(`${SHOPPING_PATH}?error=${encodeURIComponent(error.message)}`)
  revalidatePath(SHOPPING_PATH)
  redirect(SHOPPING_PATH)
}

export async function reopenShoppingList(formData: FormData) {
  const { supabase } = await getUser()
  const id = requiredText(formData, 'id')
  const { error } = await supabase.rpc('reopen_shopping_list', { p_list_id: id })
  if (error) redirect(`${SHOPPING_PATH}?error=${encodeURIComponent(error.message)}`)
  revalidatePath(SHOPPING_PATH)
  redirect(SHOPPING_PATH)
}

export async function registerShoppingPurchase(formData: FormData) {
  const { supabase } = await getUser()
  const listId = requiredText(formData, 'id')
  const { data: list, error } = await supabase
    .from('shopping_lists')
    .select('name')
    .eq('id', listId)
    .single()
  if (error || !list) redirect(`${SHOPPING_PATH}?error=No se encontró la lista`)

  const { data: items } = await supabase
    .from('shopping_list_items')
    .select('name, quantity, actual_unit_price, estimated_unit_price, is_checked')
    .eq('list_id', listId)
    .eq('is_checked', true)

  const total = (items ?? []).reduce(
    (sum, item) => sum + (item.actual_unit_price ?? item.estimated_unit_price ?? 0) * item.quantity,
    0,
  )
  if (total <= 0) redirect(`${SHOPPING_PATH}?error=Marca artículos y registra al menos un precio antes de registrar la compra`)

  const description = `Compra de mercado: ${list.name}`
  const params = new URLSearchParams({
    description,
    amount: String(Math.round(total)),
    occurred_at: new Date().toLocaleDateString('en-CA'),
  })
  redirect(`/transacciones/nueva?${params.toString()}`)
}
