export const metadata = { title: 'Términos de uso | Control de gastos' }

export default function TerminosPage() {
  return <LegalPage title="Términos de uso" intro="Versión beta · vigente desde el 8 de noviembre de 2026">
    <Section title="Uso de la plataforma"><p>Control de gastos ofrece herramientas para registrar, organizar y revisar información financiera personal. La información mostrada es de apoyo para tus decisiones y no constituye asesoría financiera, contable, tributaria o legal.</p></Section>
    <Section title="Tu responsabilidad"><p>Debes usar una cuenta propia, proteger tus credenciales y revisar los movimientos antes de confirmarlos. Las funciones de captura inteligente y correo pueden cometer errores; ningún resultado automático debe sustituir tu revisión.</p></Section>
    <Section title="Funciones beta"><p>Algunas funciones, incluidas la captura por foto y la sincronización de correo, pueden cambiar, limitarse o suspenderse mientras se validan. Siempre podrás decidir si deseas usarlas.</p></Section>
    <Section title="Cambios"><p>Podemos actualizar estos términos para reflejar cambios del producto o requisitos aplicables. Cuando el cambio sea relevante, se solicitará una nueva aceptación antes de continuar con las funciones afectadas.</p></Section>
    <Section title="Contacto"><p>Consulta el canal de <a href="/soporte" className="font-medium text-ledger-green underline">soporte</a> para reportar problemas o enviar preguntas sobre el uso de la plataforma.</p></Section>
  </LegalPage>
}

function LegalPage({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16"><p className="eyebrow">Información legal</p><h1 className="page-title mt-3">{title}</h1><p className="mt-3 text-sm text-ledger-muted">{intro}</p><div className="panel mt-8 space-y-7 p-6 leading-7 text-ledger-text sm:p-8">{children}</div></article>
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section><h2 className="font-serif text-xl text-ledger-text">{title}</h2><div className="mt-2 text-sm text-ledger-muted">{children}</div></section> }
