import { EmptyState } from "@/components/ui";
export default function SettingsPage() {
  return (
    <div className="max-w-4xl">
      <header className="border-b border-black/10 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ledger-green">Preferencias</p>
        <h1 className="mt-2 font-serif text-3xl text-ledger-text sm:text-4xl">Configuración</h1>
        <p className="mt-1 text-sm text-ledger-muted">Administra las preferencias generales de tu espacio financiero.</p>
      </header>
      <div className="mt-7 rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <EmptyState title="Preferencias" description="Aquí estarán las preferencias de cuenta, moneda e integraciones." />
      </div>
    </div>
  )
}
