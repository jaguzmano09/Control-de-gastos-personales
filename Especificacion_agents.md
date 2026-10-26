# Especificación funcional y de datos — PWA Control de Gastos Personales

> Documento vivo de referencia para el desarrollo de la plataforma. Las
> migraciones aplicadas en `supabase/migrations/` son la fuente definitiva del
> esquema de base de datos. Este documento explica las reglas de negocio y los
> flujos que deben respetarse al modificar la aplicación.

---

## 1. Alcance y stack

**Control de Gastos Personales** es una PWA de finanzas personales. Actualmente
la utiliza un usuario, pero todo el modelo debe conservar aislamiento por
`user_id` para permitir multiusuario en el futuro.

Stack actual:

- Next.js 14 con App Router, React 18 y TypeScript.
- Tailwind CSS para la interfaz.
- Supabase PostgreSQL, Auth y Row Level Security (RLS).
- Vercel para despliegue y tareas programadas.
- Gemini para extracción y clasificación asistida.
- Tesseract.js y PaddleOCR opcional para extracción OCR.

Canales de entrada de transacciones:

1. Registro manual.
2. OCR de facturas o comprobantes.
3. Sincronización de notificaciones bancarias mediante Gmail OAuth.
4. Migración histórica desde el Google Sheet original.

La automatización siempre debe ser revisable. Ninguna entrada automática debe
contar en los cálculos financieros antes de ser confirmada.

---

## 2. Cuentas y bolsillos

| Cuenta | Bolsillos iniciales |
|---|---|
| Nequi | Mercado, Servicios, Otros gastos |
| Ualá | No |
| Bancolombia | No |
| DaviPlata | No |
| Efectivo | No |
| Dale | Configuración definida por las migraciones vigentes |

- `accounts` contiene una fila por cuenta y usuario.
- `wallets` son hijos de una cuenta y también pertenecen a un usuario.
- Toda transacción requiere `account_id`; `wallet_id` es opcional.
- Una cuenta con bolsillos no debe recibir una configuración de rendimiento
  directa; el rendimiento debe configurarse por bolsillo.
- Las restricciones de propiedad deben validarse tanto en las acciones de
  servidor como en las políticas y triggers de Supabase.

---

## 3. Categorías

El catálogo funcional actual contiene:

`Mercado, Servicios, Suscripciones, Entretenimiento, Otros, Fondos-Acciones`

Cada categoría pertenece a un usuario. Las categorías históricas
`Comida Fuera`, `Transporte` y `Educación` se remapean a `Otros` durante la
migración histórica.

La categorización combina:

1. Reglas conocidas de `categorization_rules`.
2. Gemini para descripciones sin una regla aplicable.
3. Revisión humana antes de confirmar una transacción automática.

Las reglas pueden ser creadas o ajustadas por el usuario y deben conservar
información de uso (`times_used`, `last_used_at`) cuando esos campos estén
disponibles en el esquema.

---

## 4. Transacciones y ciclo de vida

### 4.1 Tipos y fuentes

Tipos soportados:

`Ingreso`, `Gasto`, `Transferencia`, `Ahorro`, `Inversion`

Fuentes:

`manual`, `ocr`, `email_webhook`, `migration`

Una transacción de tipo `Ahorro` debe indicar `savings_operation`:

- `ingreso`: dinero que entra al ahorro.
- `retiro`: dinero que sale o se retira del ahorro.

Para otros tipos, `savings_operation` debe ser `null`.

### 4.2 Estados

Estados funcionales:

- `pendiente_revision`: entrada automática que necesita validación.
- `confirmada`: entrada válida que puede afectar cálculos.
- `duplicado`: posible duplicado pendiente de decisión.
- `descartada`: entrada que el usuario decidió excluir.

| Canal | Estado inicial | ¿Afecta cálculos? |
|---|---|---|
| Manual | `confirmada` | Sí |
| Migración histórica | `confirmada` | Sí |
| OCR | `pendiente_revision` | No |
| Gmail | `pendiente_revision` | No |
| Gmail con referencia repetida | `duplicado` | No |

Solo `confirmada` participa en dashboards, presupuestos, saldos y resúmenes.
Una transacción `descartada` o `duplicado` nunca debe incorporarse
silenciosamente a esos cálculos.

### 4.3 Campos relevantes

- `occurred_at`: fecha en que ocurrió el movimiento; la confirmación debe
  validarla.
- `external_reference`: identificador del proveedor, usado para detectar
  duplicados.
- `submission_id`: identificador de idempotencia para evitar doble envío del
  mismo formulario del usuario.
- `raw_data`: datos crudos y estructurados de extracción. No se guarda la
  imagen del comprobante como parte de la transacción.
- `ai_confidence`: confianza de la extracción/clasificación cuando esté
  disponible; la bandeja puede ordenar primero los resultados de menor
  confianza.
- `is_necessary`: indicador opcional de necesidad del gasto.

Las mutaciones deben pasar por las acciones de `lib/actions/transactions.ts`,
`lib/actions/ocr.ts` y `lib/actions/review.ts`, según el flujo.

---

## 5. OCR de comprobantes

El flujo OCR es:

```text
Imagen
  ↓
Validación de sesión, tipo y tamaño (máximo 10 MB)
  ↓
Preprocesamiento
  ↓
PaddleOCR configurado o Tesseract.js
  ↓
Parseo del texto y/o Gemini Vision
  ↓
Clasificación y extracción estructurada
  ↓
Transacción pendiente de revisión
```

El sistema intenta aprovechar el tiempo disponible y conserva información del
motor utilizado y de los errores de extracción en `raw_data` cuando aplica.
Gemini puede usar el texto OCR como fuente principal y corregir errores
evidentes.

La imagen no debe persistirse como un secreto o dato financiero innecesario.
La transacción resultante siempre debe poder editarse antes de confirmarse.

---

## 6. Gmail y notificaciones bancarias

### 6.1 Direcciones monitoreadas

`email_sources` relaciona remitentes con cuentas:

- `user_id`
- `account_id`
- `email_address`
- `is_active`
- `created_at`, `updated_at`

Una cuenta puede tener varias direcciones. La unicidad lógica es
`(user_id, email_address)`.

### 6.2 Conexión OAuth

`gmail_connections` representa una conexión Gmail por usuario e incluye el
estado de sincronización, como `gmail_history_id`, tokens y fechas de
expiración.

- El `refresh_token` y las credenciales OAuth son exclusivamente de servidor.
- No se exponen tokens al cliente.
- La sincronización incremental usa el historial de Gmail cuando está
  disponible.
- El Message-ID del correo puede utilizarse como `external_reference`.

El flujo de sincronización es:

```text
Gmail OAuth
  ↓
Historial/mensajes nuevos
  ↓
Filtro por remitentes activos
  ↓
Extracción de transacción
  ↓
Detección de duplicados
  ↓
pendiente_revision o duplicado
```

La tarea programada `/api/gmail/sync` se ejecuta diariamente mediante Vercel.

---

## 7. Presupuestos y rollover

### 7.1 Presupuesto por categoría

`category_budgets` define un monto por categoría y mes. El gasto y el
disponible se calculan a partir de transacciones `confirmada`; no se deben
tratar como saldos manuales independientes.

Campos relevantes:

- `amount`
- `rollover_amount`
- `alert_threshold_percent`
- `period_month`

### 7.2 Presupuesto por bolsillo

`wallet_budgets` separa:

- `assigned_amount`: asignación manual del mes.
- `rollover_amount`: sobrante trasladado desde el mes anterior.
- `total_budget`: monto disponible calculado.
- `alert_threshold_percent`.

El gasto se calcula desde transacciones `confirmada` de tipo `Gasto` asociadas
al bolsillo.

### 7.3 Proceso de rollover

El job `/api/cron/rollover` se ejecuta el primer día de cada mes. Calcula el
sobrante del período anterior, considerando movimientos y rendimiento cuando
corresponda, y lo escribe en el período actual.

- No crea transacciones artificiales.
- Conserva separados los montos asignados y trasladados.
- Es idempotente: ejecutarlo dos veces no debe duplicar el sobrante.
- Los rollovers de categorías y bolsillos se registran en
  `budget_rollover_reviews`.
- La bandeja de revisión permite asignar o revisar los rollovers pendientes.

---

## 8. Rendimiento de cuentas y bolsillos

Las tablas `yield_configs` y `yield_rates` permiten configurar rendimiento
para una cuenta sin bolsillos o para un bolsillo específico.

Reglas:

- Una configuración apunta a una cuenta o a un bolsillo, nunca a ambos.
- Una cuenta con bolsillos debe configurar el rendimiento en sus bolsillos.
- `start_date` define desde cuándo aplica la configuración.
- `ea_percent` es una tasa efectiva anual entre 0 y 100.
- Las tasas se versionan por `valid_from`.
- La tasa vigente se usa para calcular el rendimiento diario.

El cálculo compartido está en `lib/yield-calculation.ts`. El rendimiento se
integra en el dashboard y en el cálculo de rollover, pero no se debe convertir
en una transacción ficticia del libro mayor.

---

## 9. Listas de mercado e historial de precios

El módulo `/mercado` incluye:

- `stores`: comercios del usuario.
- `shopping_lists`: listas activas o completadas.
- `shopping_list_items`: productos, cantidades, unidades, precios estimados y
  precios reales.
- `price_history`: historial de precios observado por producto, unidad y
  comercio.

Al completar una lista, los artículos marcados y con precio real pueden generar
registros de historial. Reabrir una lista elimina los registros de historial
originados exclusivamente por esa lista.

Las operaciones deben usar `lib/actions/shopping-lists.ts` y respetar las
validaciones de propietario de lista, artículo y comercio.

---

## 10. Multiusuario y seguridad

Las entidades financieras y módulos auxiliares deben estar vinculados a
`user_id` y protegidos con RLS. Un usuario nunca puede consultar o modificar
datos de otro usuario.

Reglas obligatorias:

- Validar autenticación en cada route handler y server action.
- Usar el cliente de servidor para operaciones protegidas.
- Usar `SUPABASE_SERVICE_ROLE_KEY` solo en backend y nunca en componentes de
  cliente.
- No exponer `refresh_token`, claves OAuth, `GEMINI_API_KEY` ni secretos de
  cron.
- Añadir migraciones para cambios de esquema; no editar datos de producción
  desde una página.
- Verificar políticas RLS y propiedad cruzada al crear relaciones entre
  cuentas, bolsillos, listas, presupuestos y transacciones.

---

## 11. Variables de entorno

Variables utilizadas:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
PADDLEOCR_URL
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
GOOGLE_OAUTH_REDIRECT_URI
NEXT_PUBLIC_SITE_URL
CRON_SECRET
```

`PADDLEOCR_URL` es opcional si se utiliza Tesseract.js como fallback.
`.env.local` no debe versionarse ni copiarse a documentación o snapshots
compartidos.

---

## 12. Convenciones de desarrollo

- Páginas protegidas: `app/(dashboard)/`.
- Componentes reutilizables: `components/`.
- Server actions e integraciones: `lib/`.
- Migraciones: `supabase/migrations/`.
- Tipos generados de Supabase: `src/types/database.types.ts`.
- Cliente Supabase de navegador: `lib/supabase/client.ts`.
- Cliente Supabase de servidor: `lib/supabase/server.ts`.
- Middleware de sesión: `middleware.ts` y `lib/supabase/middleware.ts`.

Mantener los textos de interfaz en español, reutilizar los patrones de Tailwind
existentes y evitar duplicar lógica de dominio en las páginas.

---

## 13. Validación antes de integrar cambios

Ejecutar, como mínimo:

```bash
npm run typecheck
npm run lint
npm run build
```

Para cambios en cálculos, ejecutar también las pruebas existentes, incluyendo
`lib/yield-calculation.test.ts`.

Todo cambio visible para el usuario debe reflejarse en
[`readme.md`](./readme.md). Todo cambio de esquema o regla de negocio debe
actualizar esta especificación y añadir la migración correspondiente.
