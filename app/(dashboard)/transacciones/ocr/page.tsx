import { createClient } from '@/lib/supabase/server'
import { OcrUploadForm } from './OcrUploadForm'

export default async function OcrPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  const supabase = await createClient()

  const [{ data: accounts }, { data: wallets }] = await Promise.all([
    supabase.from('accounts').select('id, name, has_wallets').eq('is_active', true).order('name'),
    supabase.from('wallets').select('id, name, account_id').eq('is_active', true).order('name'),
  ])

  return (
    <div className="max-w-lg">
      <h1 className="font-serif text-2xl text-ledger-text">Registrar por foto</h1>
      <p className="mt-1 text-sm text-ledger-muted">
        Sube la foto de una factura o recibo — la IA extrae los datos y queda pendiente de tu revisión.
      </p>
      <div className="mt-2 h-px w-10 bg-ledger-green" />
      <OcrUploadForm accounts={accounts ?? []} wallets={wallets ?? []} error={error} />
    </div>
  )
}