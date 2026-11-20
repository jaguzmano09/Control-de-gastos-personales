'use client'

import { useMemo, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { createTransactionFromReceipt } from '@/lib/actions/ocr'

type Account = { id: string; name: string; has_wallets: boolean }
type Wallet = { id: string; name: string; account_id: string }

const inputClass = 'input mt-1 w-full'
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024

async function prepareUpload(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file)
    try {
      const needsResize = file.size > MAX_UPLOAD_BYTES || bitmap.width * bitmap.height > 20_000_000
      if (!needsResize) return file

      let scale = Math.min(1, 2400 / bitmap.width, 3200 / bitmap.height, Math.sqrt(20_000_000 / (bitmap.width * bitmap.height)))
      let quality = 0.88
      let blob: Blob | null = null
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(bitmap.width * scale))
        canvas.height = Math.max(1, Math.round(bitmap.height * scale))
        const context = canvas.getContext('2d')
        if (!context) throw new Error('No pudimos preparar la imagen en este dispositivo.')
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
        blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
        if (blob && blob.size <= MAX_UPLOAD_BYTES) {
          const baseName = file.name.replace(/\.[^.]+$/, '') || 'comprobante'
          return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
        }
        scale *= 0.82
        quality *= 0.85
      }
      throw new Error('No pudimos reducir la imagen a menos de 4 MB. Elige una imagen más pequeña.')
    } finally {
      bitmap.close()
    }
  } catch (error) {
    if (file.size <= MAX_UPLOAD_BYTES) return file
    throw error
  }
}

export function OcrUploadForm({ accounts, wallets, submissionId, externalProviders, error }: {
  accounts: Account[]
  wallets: Wallet[]
  submissionId: string
  externalProviders: string[]
  error?: string
}) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [selectedFileName, setSelectedFileName] = useState('')
  const [busy, setBusy] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [formError, setFormError] = useState('')
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const selectedAccount = accounts.find((a) => a.id === accountId)
  const walletsForAccount = useMemo(() => wallets.filter((w) => w.account_id === accountId), [wallets, accountId])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    setPreparing(true)
    const formData = new FormData(event.currentTarget)
    const cameraFile = formData.get('receipt_camera')
    const fieldName = cameraFile instanceof File && cameraFile.size > 0 ? 'receipt_camera' : 'receipt_upload'
    const file = formData.get(fieldName)
    if (!(file instanceof File) || file.size === 0) {
      setFormError('Selecciona una imagen o toma una foto del comprobante.')
      setPreparing(false)
      return
    }

    try {
      formData.set(fieldName, await prepareUpload(file))
      setPreparing(false)
      setBusy(true)
      await createTransactionFromReceipt(formData)
      setBusy(false)
    } catch (error) {
      setPreparing(false)
      setBusy(false)
      setFormError(error instanceof Error ? error.message : 'No pudimos procesar el comprobante. Inténtalo de nuevo.')
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-5">
      <input type="hidden" name="submission_id" value={submissionId} />
      <div>
        <label className="block text-sm text-ledger-text">Foto o imagen del comprobante</label>
        <div className="mt-1 grid gap-2 sm:grid-cols-2">
          <label className="btn btn-secondary cursor-pointer text-center">
            Tomar foto
            <input
              type="file"
              name="receipt_camera"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="sr-only"
              ref={cameraInputRef}
              onChange={(event) => {
                if (event.target.files?.[0]) uploadInputRef.current!.value = ''
                setSelectedFileName(event.target.files?.[0]?.name ?? '')
              }}
            />
          </label>
          <label className="btn btn-secondary cursor-pointer text-center">
            Subir imagen
            <input
              type="file"
              name="receipt_upload"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              ref={uploadInputRef}
              onChange={(event) => {
                if (event.target.files?.[0]) cameraInputRef.current!.value = ''
                setSelectedFileName(event.target.files?.[0]?.name ?? '')
              }}
            />
          </label>
        </div>
        {selectedFileName ? (
          <p className="mt-2 text-xs text-ledger-green" role="status">
            ✓ Imagen adjuntada correctamente: {selectedFileName}
          </p>
        ) : (
          <p className="mt-1 text-xs text-ledger-muted">Elige una opción para adjuntar el comprobante.</p>
        )}
        <p className="mt-2 text-xs leading-5 text-ledger-muted">Si la imagen supera los límites de tamaño o resolución, intentaremos reducirla en tu dispositivo. El archivo final debe pesar menos de 4 MB y no se guarda como transacción.</p>
      </div>

      <div>
        <label className="block text-sm text-ledger-text">Cuenta</label>
        <select name="account_id" required value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputClass}>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      {selectedAccount?.has_wallets && (
        <div>
          <label className="block text-sm text-ledger-text">Bolsillo</label>
          <select name="wallet_id" required className={inputClass}>
            {walletsForAccount.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
      )}

      {externalProviders.length > 0 && <label className="flex items-start gap-3 rounded-xl border border-ledger-line bg-ledger-paper/60 p-3 text-sm leading-5 text-ledger-muted">
        <input type="checkbox" name="allow_external_processing" className="mt-0.5 h-4 w-4 rounded border-ledger-line text-ledger-green focus:ring-ledger-green" />
        <span>Permito enviar esta imagen a {externalProviders.join(' y ')} para intentar extraer los datos. Si no lo marcas, PlaENC intentará procesarla en sus propios servidores.</span>
      </label>}

      {(error || formError) && <p role="alert" className="text-sm text-red-700">{formError || decodeURIComponent(error ?? '')}</p>}

      <button type="submit" disabled={busy || preparing || accounts.length === 0} className="btn btn-primary btn-full">
        {preparing ? 'Preparando imagen…' : busy ? 'Procesando comprobante…' : 'Subir y extraer datos'}
      </button>
      <p className="text-center text-xs text-ledger-muted">
        El comprobante queda en revisión manual aunque la lectura automática no termine. Revisa los campos antes de confirmar.
      </p>
      <p className="text-center text-sm text-ledger-muted">
        ¿Prefieres no usar OCR?{' '}
        <Link href="/transacciones/nueva" className="text-ledger-green hover:underline">
          Registrar manualmente
        </Link>
      </p>
    </form>
  )
}
