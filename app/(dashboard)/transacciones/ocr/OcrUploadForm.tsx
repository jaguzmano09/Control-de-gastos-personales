'use client'

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
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
  const [walletId, setWalletId] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [formError, setFormError] = useState('')
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const selectedAccount = accounts.find((a) => a.id === accountId)
  const walletsForAccount = useMemo(() => wallets.filter((w) => w.account_id === accountId), [wallets, accountId])
  const requiresWallet = Boolean(selectedAccount?.has_wallets || walletsForAccount.length > 0)

  useEffect(() => {
    if (!selectedFile) return
    const url = URL.createObjectURL(selectedFile)
    setPreviewUrl(url)
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [selectedFile])

  function selectFile(file: File | undefined, source: 'camera' | 'upload') {
    if (source === 'camera' && uploadInputRef.current) uploadInputRef.current.value = ''
    if (source === 'upload' && cameraInputRef.current) cameraInputRef.current.value = ''
    if (file && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      if (source === 'camera' && cameraInputRef.current) cameraInputRef.current.value = ''
      if (source === 'upload' && uploadInputRef.current) uploadInputRef.current.value = ''
      setSelectedFile(null)
      setPreviewUrl('')
      setFormError('Elige una imagen JPG, PNG o WebP.')
      return
    }
    setSelectedFile(file ?? null)
    setPreviewUrl('')
    setFormError('')
  }

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
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setFormError('Elige una imagen JPG, PNG o WebP.')
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
    <form onSubmit={submit} className="mt-8 space-y-6">
      <input type="hidden" name="submission_id" value={submissionId} />
      <section className="rounded-2xl border border-ledger-line bg-white p-4 sm:p-5">
        <h2 className="text-base font-semibold text-ledger-text">El comprobante</h2>
        <p className="mt-1 text-sm text-ledger-muted">Asegúrate de que se vean la fecha y el total.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <label className="btn btn-secondary cursor-pointer text-center focus-within:ring-2 focus-within:ring-ledger-green">
            Tomar foto
            <input
              type="file"
              name="receipt_camera"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="sr-only"
              ref={cameraInputRef}
              onChange={(event) => selectFile(event.target.files?.[0], 'camera')}
            />
          </label>
          <label className="btn btn-secondary cursor-pointer text-center focus-within:ring-2 focus-within:ring-ledger-green">
            Subir imagen
            <input
              type="file"
              name="receipt_upload"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              ref={uploadInputRef}
              onChange={(event) => selectFile(event.target.files?.[0], 'upload')}
            />
          </label>
        </div>
        {selectedFile && previewUrl ? (
          <div className="mt-4 grid items-center gap-4 rounded-xl border border-ledger-line bg-ledger-paper/40 p-3 sm:grid-cols-[minmax(0,10rem)_1fr]">
            {/* Local object URLs keep the preview in the browser until submission. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Vista previa del comprobante seleccionado" className="max-h-44 w-full rounded-lg bg-white object-contain" />
            <div className="min-w-0">
              <p role="status" className="text-sm font-medium text-ledger-text">Imagen lista para revisar</p>
              <p className="mt-1 break-words text-xs text-ledger-muted">{selectedFile.name}</p>
              <p className="mt-2 text-xs leading-5 text-ledger-muted">Si la fecha o el total están cortados, elige otra foto.</p>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-ledger-muted">Aún no has elegido una imagen.</p>
        )}
        <p className="mt-3 text-xs leading-5 text-ledger-muted">Si la imagen supera los límites, intentaremos reducirla en tu dispositivo. El archivo final admite máximo 4 MB. PlaENC crea un borrador, pero no guarda la foto.</p>
      </section>

      <section className="rounded-2xl border border-ledger-line bg-white p-4 sm:p-5">
        <h2 className="text-base font-semibold text-ledger-text">Dónde ocurrió el movimiento</h2>
        <p className="mt-1 text-sm text-ledger-muted">El borrador quedará asociado a esta cuenta o bolsillo.</p>
        <label className="mt-4 block text-sm text-ledger-text" htmlFor="ocr-account">Cuenta</label>
        <select id="ocr-account" name="account_id" required value={accountId} onChange={(e) => { setAccountId(e.target.value); setWalletId('') }} className={inputClass}>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        {accounts.length === 0 && !error && <p className="mt-2 text-sm text-amber-800">Para registrar por foto, primero <Link href="/cuentas" className="font-semibold underline">crea una cuenta</Link>.</p>}

        {requiresWallet && (
          <div className="mt-4">
            <label className="block text-sm text-ledger-text" htmlFor="ocr-wallet">Bolsillo</label>
            <select id="ocr-wallet" name="wallet_id" required value={walletId} onChange={(e) => setWalletId(e.target.value)} className={inputClass}>
              <option value="">Selecciona un bolsillo</option>
              {walletsForAccount.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            {walletsForAccount.length === 0 && <p role="alert" className="mt-2 text-sm text-amber-800">Esta cuenta necesita un bolsillo activo. Puedes configurarlo en <Link href="/cuentas" className="font-semibold underline">Cuentas</Link>.</p>}
          </div>
        )}
      </section>

      {externalProviders.length > 0 && <label className="flex items-start gap-3 rounded-xl border border-ledger-line bg-ledger-paper/60 p-3 text-sm leading-5 text-ledger-muted">
        <input type="checkbox" name="allow_external_processing" className="mt-0.5 h-4 w-4 rounded border-ledger-line text-ledger-green focus:ring-ledger-green" />
        <span>Permito enviar esta imagen a {externalProviders.join(' y ')} para intentar extraer los datos. Si no lo marcas, PlaENC intentará procesarla en sus propios servidores.</span>
      </label>}

      {(error || formError) && <p role="alert" className="text-sm text-red-700">{formError || error}</p>}

      <button type="submit" disabled={busy || preparing || accounts.length === 0 || (requiresWallet && walletsForAccount.length === 0)} className="btn btn-primary btn-full">
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
