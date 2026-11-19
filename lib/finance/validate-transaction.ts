const transactionTypes = new Set(['Ingreso', 'Gasto', 'Transferencia', 'Inversion', 'Ahorro'])

export function validTransactionFields(date: unknown, type: unknown, amount: number, description: unknown): boolean {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  const parsedDate = new Date(`${date}T00:00:00Z`)
  if (!Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) return false
  return typeof type === 'string' && transactionTypes.has(type)
    && Number.isFinite(amount) && amount > 0
    && (description === null || (typeof description === 'string' && description.length <= 2000))
}
