import { createClient } from '@/lib/supabase/server'
import { OcrUploadForm } from './OcrUploadForm'
import { isGeminiPrivateDataProcessingApproved } from '@/lib/gemini/client'
import { randomUUID } from 'node:crypto'

export const maxDuration = 60

export default async function OcrPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  const supabase = await createClient()

  const [{ data: accounts, error: accountsError }, { data: wallets, error: walletsError }] = await Promise.all([
    supabase.from('accounts').select('id, name, has_wallets').eq('is_active', true).order('name'),
    supabase.from('wallets').select('id, name, account_id').eq('is_active', true).order('name'),
  ])

  const loadError = accountsError ?? walletsError
  const externalProviders = [
    ...(isGeminiPrivateDataProcessingApproved() ? ['Google Gemini'] : []),
    ...(process.env.PADDLEOCR_URL && process.env.PADDLEOCR_PRIVATE_DATA_PROCESSING_APPROVED === 'true' ? ['el servicio OCR configurado por PlaENC'] : []),
  ]

  return (
    <div className="max-w-2xl">
      <header className="border-b border-black/10 pb-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ledger-green">Captura inteligente</p>
      <h1 className="mt-2 font-serif text-3xl text-ledger-text sm:text-4xl">Registrar por foto</h1>
      <p className="mt-1 text-sm text-ledger-muted">
        Toma una foto legible y revisa el borrador antes de confirmar. Tus saldos no cambian hasta entonces.
      </p>
      </header>
      <OcrUploadForm
        accounts={loadError ? [] : accounts ?? []}
        wallets={loadError ? [] : wallets ?? []}
        submissionId={randomUUID()}
        externalProviders={externalProviders}
        error={error ?? (loadError ? 'No se pudieron cargar las cuentas. Intenta actualizar la página.' : undefined)}
      />
    </div>
  )
}
