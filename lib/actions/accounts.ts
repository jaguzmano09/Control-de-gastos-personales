'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/types/database.types'
import { redirect } from 'next/navigation'

export async function createAccount(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const name = (formData.get('name') as string)?.trim()
  const has_wallets = formData.get('has_wallets') === 'true'
  if (!name) throw new Error('El nombre es obligatorio')

  const { error } = await supabase.from('accounts').insert({ user_id: user.id, name, has_wallets })
  if (error) throw error

  revalidatePath('/cuentas')
}

export async function toggleAccountActive(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  const is_active = formData.get('is_active') === 'true'
  const { error } = await supabase.from('accounts').update({ is_active }).eq('id', id)
  if (error) throw error
  revalidatePath('/cuentas')
}

export async function createWallet(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const account_id = formData.get('account_id') as string
  const name = (formData.get('name') as string)?.trim()
  if (!name) throw new Error('El nombre es obligatorio')

  const { error } = await supabase.from('wallets').insert({ user_id: user.id, account_id, name })
  if (error) throw error

  // Mantiene consistente el flag informativo has_wallets de la cuenta padre.
  const { error: accountError } = await supabase
    .from('accounts')
    .update({ has_wallets: true })
    .eq('id', account_id)
    .eq('user_id', user.id)
  if (accountError) throw accountError

  revalidatePath('/cuentas')
}

export async function toggleWalletActive(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  const is_active = formData.get('is_active') === 'true'
  const { error } = await supabase.from('wallets').update({ is_active }).eq('id', id)
  if (error) throw error
  revalidatePath('/cuentas')
}

export async function createYieldConfig(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const fail = (message: string): never => {
    redirect(`/cuentas?error=${encodeURIComponent(message)}`)
  }

  const accountId = (formData.get('account_id') as string | null) || null
  const walletId = (formData.get('wallet_id') as string | null) || null
  const startDate = (formData.get('start_date') as string)?.trim()
  const eaPercent = Number(formData.get('ea_percent'))

  if ((accountId ? 1 : 0) + (walletId ? 1 : 0) !== 1) fail('Selecciona una cuenta o bolsillo')
  if (!startDate || !Number.isFinite(eaPercent) || eaPercent < 0 || eaPercent > 100) {
    fail('La tasa y la fecha de inicio no son válidas')
  }

  const { data: config, error: configError } = await supabase
    .from('yield_configs')
    .insert({
      user_id: user.id,
      account_id: accountId,
      wallet_id: walletId,
      start_date: startDate,
    })
    .select('id')
    .single()
  if (configError) {
    if (configError.code === '23505') {
      fail('Este objetivo ya tiene una configuración de alto rendimiento. Agrega una nueva tasa desde su historial.')
    }
    fail(configError.message)
  }
  const configId = config?.id
  if (!configId) fail('No se pudo crear la configuración de rendimiento.')

  const { error: rateError } = await supabase.from('yield_rates').insert({
    user_id: user.id,
    config_id: configId,
    ea_percent: eaPercent,
    valid_from: startDate,
  })
  if (rateError) {
    await supabase.from('yield_configs').delete().eq('id', configId).eq('user_id', user.id)
    if (rateError.code === '23505') {
      fail('Ya existe una tasa registrada para esa fecha. Usa una fecha diferente.')
    }
    fail(rateError.message)
  }

  revalidatePath('/cuentas')
  revalidatePath('/')
}

export async function updateYieldRate(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const fail = (message: string): never => {
    redirect(`/cuentas?error=${encodeURIComponent(message)}`)
  }

  const rateId = (formData.get('rate_id') as string)?.trim()
  const validFrom = (formData.get('valid_from') as string)?.trim()
  const eaPercent = Number(formData.get('ea_percent'))
  if (!rateId || !validFrom || !Number.isFinite(eaPercent) || eaPercent < 0 || eaPercent > 100) {
    fail('La tasa y la fecha de vigencia no son válidas')
  }

  const { error } = await supabase
    .from('yield_rates')
    .update({ ea_percent: eaPercent, valid_from: validFrom })
    .eq('id', rateId)
    .eq('user_id', user.id)
  if (error) {
    if (error.code === '23505') {
      fail('Ya existe una tasa registrada para esa fecha. Usa una fecha diferente.')
    }
    fail(error.message)
  }

  revalidatePath('/cuentas')
  revalidatePath('/')
  redirect('/cuentas?success=Tasa actualizada correctamente')
}

export async function deleteYieldRate(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const fail = (message: string): never => {
    redirect(`/cuentas?error=${encodeURIComponent(message)}`)
  }

  const rateId = (formData.get('rate_id') as string)?.trim()
  if (!rateId) fail('Falta la tasa que deseas eliminar')

  const { data: rate, error: rateError } = await supabase
    .from('yield_rates')
    .select('config_id')
    .eq('id', rateId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (rateError) fail(rateError.message)
  const configId = rate?.config_id
  if (!configId) fail('No se encontró la tasa de rendimiento')

  const { count, error: countError } = await supabase
    .from('yield_rates')
    .select('id', { count: 'exact', head: true })
    .eq('config_id', configId)
    .eq('user_id', user.id)
  if (countError) fail(countError.message)
  if ((count ?? 0) <= 1) {
    fail('No puedes eliminar la única tasa de esta configuración')
  }

  const { error } = await supabase
    .from('yield_rates')
    .delete()
    .eq('id', rateId)
    .eq('user_id', user.id)
  if (error) fail(error.message)

  revalidatePath('/cuentas')
  revalidatePath('/')
}

export async function toggleYieldConfig(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const configId = formData.get('config_id') as string
  const isActive = formData.get('is_active') === 'true'
  if (!configId) throw new Error('Falta la configuración')

  const { error } = await supabase
    .from('yield_configs')
    .update({ is_active: isActive })
    .eq('id', configId)
    .eq('user_id', user.id)
  if (error) throw error

  revalidatePath('/cuentas')
  revalidatePath('/')
}
