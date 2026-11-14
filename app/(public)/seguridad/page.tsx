export const metadata = { title: 'Seguridad' }

export default function SeguridadPage() {
  return <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16"><p className="eyebrow">Confianza</p><h1 className="page-title mt-3">Seguridad y control</h1><p className="mt-3 text-sm text-ledger-muted">Cómo protegemos el flujo de información dentro de la plataforma.</p><div className="panel mt-8 space-y-7 p-6 leading-7 sm:p-8">
    <Section title="Tu revisión es parte del sistema"><p>Los movimientos provenientes de automatizaciones se mantienen pendientes hasta que los revisas y confirmas. Solo los movimientos confirmados participan en saldos, presupuestos y resúmenes.</p></Section>
    <Section title="Acceso e integraciones"><p>Las conexiones de correo son opcionales. Puedes administrar remitentes autorizados y desactivar funciones cuando ya no las necesites. Las credenciales sensibles de integración no se muestran en la interfaz.</p></Section>
    <Section title="Reportar un problema"><p>Si encuentras un fallo, comportamiento inesperado o posible problema de seguridad, repórtalo por el canal de <a href="/soporte" className="font-medium text-ledger-green underline">soporte</a>. No incluyas contraseñas, tokens ni datos bancarios completos en el reporte.</p></Section>
  </div></article>
}
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section><h2 className="font-serif text-xl text-ledger-text">{title}</h2><div className="mt-2 text-sm text-ledger-muted">{children}</div></section> }
