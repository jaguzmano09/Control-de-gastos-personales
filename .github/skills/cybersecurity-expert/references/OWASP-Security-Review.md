# Revisión OWASP del proyecto

Este checklist adapta prácticas de revisión OWASP y API Security al stack local.
Es una guía de análisis defensivo, no una autorización para probar sistemas
externos.

## Contexto específico

Revisar siempre:

- `app/api/**`, `middleware.ts` y `lib/actions/**`.
- `lib/supabase/client.ts` y `lib/supabase/server.ts`.
- `supabase/migrations/**`, especialmente políticas RLS y funciones SQL.
- Flujos de `review.ts`, Gmail OAuth, OCR, Gemini y cron.
- Variables privadas: `SUPABASE_SERVICE_ROLE_KEY`, secretos OAuth,
  `GEMINI_API_KEY` y `CRON_SECRET`.

## Checklist

### Identidad y acceso

- Cada endpoint y server action valida la sesión en servidor.
- Las consultas filtran por el usuario autenticado o dependen de RLS verificable.
- `account_id`, `wallet_id`, `category_id`, `transaction_id` y otros IDs se
  validan por pertenencia al mismo `user_id`.
- No se usa el cliente service role en código cliente ni para saltarse controles.
- Las rutas de cron y webhooks requieren un secreto o firma y no confían solo en
  un header controlable por el cliente.
- OAuth valida `state`, redirect URI, expiración y asociación con el usuario.

### Entradas y salidas

- Los esquemas validan tipo, longitud, rangos, enumeraciones y tamaño de cargas.
- Las consultas Supabase no interpolan SQL ni construyen filtros inseguros.
- Datos OCR, Gmail y Gemini se tratan como no confiables.
- El texto mostrado en la UI se escapa según el contexto; no se usa HTML crudo
  sin sanitización.
- URLs externas se validan con allowlist, protocolo permitido y límites de
  redirección para evitar SSRF.
- Las respuestas no incluyen tokens, secretos, trazas, datos de otros usuarios
  ni campos internos innecesarios.

### Lógica financiera

- Solo `confirmada` afecta balances, dashboards y presupuestos.
- Las entradas automáticas permanecen revisables y no se confirman por defecto.
- La confirmación y descarte pasan por `lib/actions/review.ts`.
- Transferencias, ahorros, duplicados, rollover y estados inválidos no pueden
  crear saldos o transacciones fantasma.
- Se consideran replay, duplicación, concurrencia, límites monetarios y
  consistencia entre cuenta y bolsillo.

### Configuración y dependencias

- No hay secretos en código, logs, respuestas, commits o documentación.
- Cookies tienen `HttpOnly`, `Secure`, `SameSite` y alcance apropiados.
- Errores de producción no revelan internals; logs no contienen PII innecesaria.
- CORS, headers, métodos HTTP y cache no permiten acceso cross-origin indebido.
- Se revisan `package.json` y lockfile con el gestor disponible, sin aplicar
  actualizaciones no solicitadas.

## Criterio de severidad

- **CRITICAL:** compromiso probable de cuentas, secretos o datos de múltiples
  usuarios, o ejecución remota con impacto amplio.
- **HIGH:** acceso no autorizado a datos/acciones sensibles, bypass de RLS,
  OAuth comprometible o inyección con impacto material.
- **MEDIUM:** exposición limitada, controles incompletos o explotación que exige
  precondiciones relevantes.
- **LOW:** defensa en profundidad, información menor o mejora de observabilidad.

## Formato de salida

```text
## [SEVERITY] Título
- Archivo: ruta:línea
- Confianza: n/10
- Evidencia: comportamiento concreto observado
- Impacto: qué puede lograr un atacante autorizado a probar el sistema
- Corrección: cambio mínimo recomendado
- Validación: prueba segura que demostraría la corrección
```

No presentar una ausencia de evidencia como prueba de seguridad. Declarar las
áreas que requieren configuración de despliegue, credenciales sintéticas o
pruebas de integración.

## Fuente y adaptación

La estructura de procedimientos se inspiró en
[Anthropic Cybersecurity Skills](https://github.com/mukul975/Anthropic-Cybersecurity-Skills),
en particular sus guías de revisión de API, control de acceso y funciones
serverless. El contenido aquí está reducido y adaptado a este repositorio.
