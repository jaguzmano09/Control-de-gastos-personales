# Contexto del proyecto para agentes

## Propósito

**Control de Gastos Personales** es una PWA de finanzas personales para registrar
ingresos, gastos, transferencias, ahorros e inversiones. La aplicación está
orientada actualmente a un usuario, pero el modelo de datos y las políticas RLS
deben mantener aislamiento completo por `user_id` para permitir multiusuario en el
futuro.

La especificación funcional detallada está en
[`Especificacion_agents.md`](../Especificacion_agents.md). Consultarla antes de
modificar el modelo de datos, los estados de transacción o los flujos de
presupuesto.

## Stack y estructura

- Next.js 14 con App Router, React 18 y TypeScript.
- Tailwind CSS para estilos.
- Supabase para PostgreSQL, autenticación y Row Level Security.
- Vercel para despliegue y cron jobs.
- Gemini para extracción/clasificación asistida.
- Tesseract.js y un servicio PaddleOCR opcional para OCR.
- La UI vive en `app/` y los componentes reutilizables en `components/`.
- Las acciones de servidor y adaptadores están en `lib/`.
- Las migraciones están en `supabase/migrations/`.
- Las definiciones generadas de Supabase están en
  `src/types/database.types.ts`; no editar ese archivo manualmente si el cambio
  debe provenir del esquema.

## Flujos funcionales importantes

- Solo las transacciones con estado `confirmada` deben afectar balances,
  dashboards y presupuestos.
- Las entradas OCR y Gmail llegan normalmente como `pendiente_revision`.
- Los duplicados se conservan con estado `duplicado` para revisión; una entrada
  descartada usa `descartada`.
- La confirmación y descarte pasan por `lib/actions/review.ts`; no implementar
  actualizaciones directas que salten las validaciones existentes.
- Los presupuestos de categorías y bolsillos se calculan para un mes. El
  presupuesto de bolsillo separa `assigned_amount` y `rollover_amount`.
- El rollover se revisa desde la bandeja de revisión y no debe crear
  transacciones fantasma.
- Los rendimientos se calculan con la lógica de `lib/yield-calculation.ts` y
  las configuraciones de `yield_configs`/`yield_rates`.
- La integración de correo usa OAuth de Gmail. Los refresh tokens y las claves
  privadas solo pueden usarse en servidor.

## Convenciones de implementación

- Usa los clientes existentes de Supabase:
  `lib/supabase/client.ts` para cliente y `lib/supabase/server.ts` para servidor.
- Las páginas protegidas están bajo `app/(dashboard)/`; el middleware mantiene
  la sesión.
- Las operaciones que cambian datos deben reutilizar las server actions de
  `lib/actions/`, validar la sesión y revalidar las rutas afectadas.
- Mantén los mensajes y etiquetas de la interfaz en español y respeta los
  patrones visuales existentes en Tailwind.
- Para cambios de base de datos, crea una migración nueva, actualiza los tipos
  generados cuando corresponda y verifica las políticas RLS.
- No expongas `SUPABASE_SERVICE_ROLE_KEY`, secretos OAuth ni `GEMINI_API_KEY` al
  cliente. Nunca incluyas valores de `.env.local` en commits o documentación.

## Variables de entorno

Las variables usadas por la aplicación son:

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `PADDLEOCR_URL`,
`GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`,
`GOOGLE_OAUTH_REDIRECT_URI`, `NEXT_PUBLIC_SITE_URL` y `CRON_SECRET`.

Usa `.env.local` para desarrollo. Las variables privadas deben configurarse
también en Vercel cuando se despliegue.

## Validación

Después de cambios de código, ejecuta como mínimo:

```bash
npm run typecheck
npm run lint
npm run build
```

Para cambios en cálculos, prioriza también las pruebas existentes, por ejemplo
`lib/yield-calculation.test.ts`. No ejecutes migraciones destructivas ni cambies
datos reales sin confirmación explícita.

## Documentación

Al añadir una capacidad visible al usuario, actualiza `readme.md`. Al cambiar
decisiones funcionales, seguridad, esquema o flujos de negocio, actualiza
`Especificacion_agents.md` o enlaza la documentación específica correspondiente.
