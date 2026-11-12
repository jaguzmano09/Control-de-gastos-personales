import { redirect } from 'next/navigation'

export default async function PresupuestoBolsillosPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month } = await searchParams
  const yearMonth = month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month : undefined
  redirect(yearMonth ? `/cuentas?month=${yearMonth}` : '/cuentas')
}
