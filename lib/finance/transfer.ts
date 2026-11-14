type TransferLocation = {
  accountId: string
  walletId?: string | null
  hasWallets: boolean
}

export function isSameTransferLocation(sourceAccountId: string, sourceWalletId: string | null, destinationAccountId: string, destinationWalletId: string | null) {
  return sourceAccountId === destinationAccountId && sourceWalletId === destinationWalletId
}

export function getTransferLocationError(source: TransferLocation, destination: TransferLocation): string | null {
  if (!source.accountId || !destination.accountId) return 'Selecciona las cuentas de origen y destino.'
  if (source.hasWallets && !source.walletId) return 'Elige un bolsillo de origen.'
  if (destination.hasWallets && !destination.walletId) return 'Elige un bolsillo de destino.'
  if (isSameTransferLocation(source.accountId, source.walletId || null, destination.accountId, destination.walletId || null)) {
    return 'El origen y el destino deben ser ubicaciones diferentes.'
  }
  return null
}

/** Applies an internal movement without changing the sum of tracked endpoints. */
export function applyTransferDelta(balances: Map<string, number>, sourceId: string | null, destinationId: string | null, amount: number) {
  if (sourceId) balances.set(sourceId, (balances.get(sourceId) ?? 0) - amount)
  if (destinationId) balances.set(destinationId, (balances.get(destinationId) ?? 0) + amount)
}
