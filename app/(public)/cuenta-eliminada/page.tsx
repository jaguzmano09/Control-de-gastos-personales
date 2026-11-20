import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Cuenta eliminada', robots: { index: false, follow: false } }

export default function AccountDeletedPage() {
  return <main className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
    <div className="panel p-7 sm:p-10">
      <p className="eyebrow">Solicitud completada</p>
      <h1 className="mt-3 font-serif text-3xl text-ledger-text sm:text-4xl">Tu cuenta de PlaENC se cerró</h1>
      <p className="mt-4 text-sm leading-7 text-ledger-muted">El acceso y los datos asociados se eliminaron de los sistemas activos de PlaENC. Las copias de seguridad de proveedores pueden seguir su propio ciclo de retención, cuyos plazos aún están pendientes de verificación.</p>
      <Link href="/inicio" className="btn btn-secondary mt-7">Volver al inicio</Link>
    </div>
  </main>
}
