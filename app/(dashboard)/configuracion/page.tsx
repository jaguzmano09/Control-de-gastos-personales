export default function SettingsPage() {
  return (
    <div className="max-w-4xl">
      <header className="border-b border-black/10 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ledger-green">Preferencias</p>
        <h1 className="mt-2 font-serif text-3xl text-ledger-text sm:text-4xl">Configuración</h1>
        <p className="mt-1 text-sm text-ledger-muted">Administra las preferencias generales de tu espacio financiero.</p>
      </header>
      <section className="panel mt-7 p-6 sm:p-8">
        <p className="section-label">Tus datos</p>
        <h2 className="mt-2 font-serif text-2xl text-ledger-text">Consulta y conserva tu información</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ledger-muted">Descarga una copia JSON de tus cuentas, bolsillos, categorías, presupuestos, movimientos, reglas, listas, configuración de rendimiento, eventos de uso, aceptaciones y solicitudes de soporte. La exportación no contiene tokens de conexión de Gmail ni contadores internos de seguridad.</p>
        <a className="btn btn-primary mt-5 w-fit" href="/api/privacy/export">Descargar mis datos</a>
        <div className="mt-7 border-t border-ledger-line pt-5">
          <h3 className="font-medium text-ledger-text">¿Necesitas corregir o eliminar información?</h3>
          <p className="mt-1 text-sm leading-6 text-ledger-muted">Envía una solicitud privada desde soporte. La eliminación de cuenta todavía requiere revisión operativa y no se ejecuta automáticamente.</p>
          <a className="mt-3 inline-flex text-sm font-medium text-ledger-green underline" href="/soporte">Ir a soporte privado</a>
        </div>
      </section>
    </div>
  )
}
