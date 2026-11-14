export const metadata = { title: 'Privacidad' }

export default function PrivacidadPage() {
  return <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16"><p className="eyebrow">Información legal</p><h1 className="page-title mt-3">Política de privacidad</h1><p className="mt-3 text-sm text-ledger-muted">Vigente desde el 8 de noviembre de 2026</p><div className="panel mt-8 space-y-7 p-6 leading-7 sm:p-8">
    <Section title="Información que administras"><p>La plataforma almacena la información que registras para ofrecer tus cuentas, categorías, presupuestos, movimientos y listas de mercado. Cada espacio financiero está diseñado para mantenerse aislado por usuario.</p></Section>
    <Section title="Datos de correo y captura"><p>La conexión de correo y la captura de facturas son opcionales. Los resultados se presentan para tu revisión antes de afectar cálculos financieros. Las imágenes de recibos no se conservan como registros financieros permanentes.</p></Section>
    <Section title="Uso de la información"><p>Usamos los datos necesarios para operar las funciones que solicitas, mantener la seguridad y mejorar la estabilidad del producto. Las métricas de producto deben ser agregadas o seudonimizadas; no se utilizan para mostrar información financiera individual a otras personas.</p></Section>
    <Section title="Tus controles"><p>Puedes dejar de usar integraciones opcionales, revisar información registrada y solicitar ayuda sobre tus datos a través de <a href="/soporte" className="font-medium text-ledger-green underline">soporte</a>. Las solicitudes se atenderán conforme al proceso aplicable antes de la apertura pública definitiva.</p></Section>
    <Section title="Cambios"><p>Esta política se actualizará cuando cambien las funciones, proveedores o prácticas de tratamiento. Los cambios relevantes requerirán una aceptación renovada.</p></Section>
  </div></article>
}
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section><h2 className="font-serif text-xl text-ledger-text">{title}</h2><div className="mt-2 text-sm text-ledger-muted">{children}</div></section> }
