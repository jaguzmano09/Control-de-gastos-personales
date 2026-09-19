# Especificación funcional — PWA Control de Gastos Personales
### Documento de validación previo al schema SQL

Este documento consolida todas las decisiones tomadas hasta ahora. Antes de generar el SQL definitivo, valida que todo esté correcto o pide ajustes.

---

## 1. Alcance y stack

- PWA personal de control de gastos — **hoy solo para ti, pero el modelo debe soportar multiusuario a futuro** (otra persona con su propia cuenta, datos completamente separados).
- Stack: Next.js (App Router) + Tailwind CSS + Supabase (Postgres + Auth + RLS).
- Canales de entrada de transacciones: **manual**, **OCR de facturas** (vía Gemini API), **webhook de notificaciones bancarias**.
- Clasificación automática por IA con **aprendizaje continuo** (tanto para categorización como para detección de duplicados).
- Migración completa del histórico desde el Google Sheet actual.

---

## 2. Cuentas y bolsillos

| Cuenta | ¿Tiene bolsillos? |
|---|---|
| Nequi | Sí → Mercado, Servicios, Otros gastos |
| Ualá | No |
| Bancolombia | No |
| DaviPlata | No |
| Efectivo | No |
| Dale | No |

- `accounts`: una fila por cuenta, propiedad de un usuario.
- `wallets`: bolsillos, hijos de una cuenta. Solo Nequi tendrá filas aquí (de momento — el modelo permite que cualquier cuenta tenga bolsillos en el futuro sin cambiar el schema).
- Toda transacción se asocia siempre a una `account_id`; `wallet_id` es opcional y solo se usa cuando la cuenta es Nequi.

---

## 3. Categorías — lista definitiva (actualizada)

Reemplaza la lista original del Sheet. Categorías finales:

`Mercado, Servicios, Suscripciones, Entretenimiento, Otros, Fondos-Acciones`

Se eliminaron `Comida Fuera`, `Transporte` y `Educación` respecto al Sheet original, para reducir la ambigüedad que mencionaste. Una fila por categoría, propiedad de un usuario.

> ⚠️ Esto afecta la migración histórica: las transacciones del Sheet que tenían `Comida Fuera`, `Transporte` o `Educación` se remapean todas a **`Otros`** al migrar (confirmado).

---

## 4. Transacciones — flujo por canal

| Canal | Estado inicial | ¿Cuenta para presupuestos? |
|---|---|---|
| Manual | `confirmada` (entra directo) | Sí, de inmediato |
| Migración del Sheet | `confirmada` (ya estaba validada en el Sheet) | Sí, de inmediato |
| OCR (factura) | `pendiente_revision` | No, hasta que la confirmes/edites |
| Webhook bancario (nueva) | `pendiente_revision` | No, hasta que la confirmes/edites |
| Webhook bancario (con `external_reference` repetido) | `duplicado` | No — queda para que decidas si era o no un duplicado real |

**Solo las transacciones en estado `confirmada` cuentan** en dashboards, presupuestos y saldos de bolsillos.

Campos clave de `transactions`:
- `type`: Ingreso / Gasto / Transferencia / Ahorro / Inversion
- `source`: manual / ocr / email_webhook / migration
- `status`: pendiente_revision / confirmada / duplicado
- `external_reference`: identificador único que envía el banco (usado para deduplicar)
- `raw_data` (jsonb): el texto/campos crudos que devolvió Gemini al procesar el OCR o el correo — **no se guarda la imagen de la factura**, solo el dato extraído.
- `is_necessary`: booleano opcional (equivalente al "Necesario" sí/no del Sheet).

---

## 5. Presupuestos — dos conceptos independientes

### 5.1 Presupuesto por categoría (`category_budgets`)
- Monto asignado por categoría, por mes.
- "Gastado" y "Disponible" se calculan automáticamente sumando transacciones `confirmada` de esa categoría en ese mes — no se guardan como número fijo, siempre reflejan la realidad.
- Incluye `alert_threshold_percent` (ej. 80) para disparar una alerta cuando el gasto cruce ese % del presupuesto.

### 5.2 Presupuesto por bolsillo (`wallet_budgets`)
- **Fondeo manual**: cada mes asignas un monto fijo a cada bolsillo de Nequi (independiente del registro de transacciones).
- "Gastado" se calcula automático desde las transacciones `confirmada` de tipo Gasto asociadas a ese bolsillo.
- Incluye `alert_threshold_percent` igual que el anterior.
- **Rollover automático — diseño confirmado**: el saldo restante de un bolsillo se suma al presupuesto del bolsillo del mes siguiente, pero **sin mezclarse como un solo número ciego**. `wallet_budgets` tendrá dos columnas separadas:
  - `assigned_amount`: lo que asignas manualmente ese mes.
  - `rollover_amount`: lo que se trasladó automáticamente del sobrante del mes anterior (calculado y escrito por un job el día 1 de cada mes).
  - El presupuesto real disponible del bolsillo ese mes = `assigned_amount + rollover_amount` (columna calculada).

  Así el rollover suma al monto disponible (no genera una transacción "fantasma" en el libro mayor), pero sigues pudiendo ver por separado cuánto pusiste tú y cuánto vino arrastrado — mantiene el concepto de rollover visible y auditable sin tocar `transactions`.

---

## 6. Categorización automática con aprendizaje (`categorization_rules`)

- Cuando Gemini sugiere una categoría y tú la corriges, el sistema crea o actualiza automáticamente una regla (`pattern` → `category_id`) para que la próxima vez con una descripción similar, sugiera bien de una.
- Cada regla lleva `times_used`, `last_used_at` y un flag de si fue creada automáticamente o por ti a mano — para que en el futuro puedas ver/depurar qué aprendió el sistema.

---

## 7. Detección de duplicados con aprendizaje — **confirmado**

- Cuando llega un webhook con un `external_reference` que ya existe, la transacción entra como `status = 'duplicado'` en vez de bloquearse.
- Cuando tú revisas esa transacción y decides si **sí era duplicado** (la descartas) o **no lo era en realidad** (la confirmas como una transacción nueva y válida), esa decisión queda registrada en la tabla **`duplicate_review_log`** (transacción revisada, transacción con la que hizo match, tu decisión final, fecha).
- Ese log sirve como base para, más adelante, ajustar qué tan estricta es la detección de duplicados.

---

## 8. Multiusuario y seguridad

- Cada tabla (`accounts`, `wallets`, `categories`, `transactions`, `category_budgets`, `wallet_budgets`, `categorization_rules`, `duplicate_review_log`) tiene `user_id` y RLS habilitado — cada usuario solo ve y modifica sus propios datos.
- No hay concepto de "hogar compartido": si a futuro otra persona usa la PWA, tiene su propio set de cuentas/categorías/transacciones, completamente aislado del tuyo.

---

## 9.5 Direcciones de correo monitoreadas (`email_sources`) — pieza nueva

Pediste poder asignar a qué dirección(es) de correo específicas debe ir el sistema a leer para completar la captura de transacciones bancarias. Tabla `email_sources`:

- `user_id`
- `account_id` (a qué cuenta pertenece esa dirección — ej. las notificaciones de `alertas@bancolombia.com.co` mapean a la cuenta "Bancolombia")
- `email_address` (la dirección remitente a monitorear/reconocer)
- `is_active` (para poder pausar el monitoreo de una dirección sin borrarla)
- `created_at`, `updated_at`
- **Confirmado: relación 1 a muchos** — una cuenta puede tener varias direcciones remitentes autorizadas (ej. Bancolombia notificando desde 2 direcciones distintas). No hay restricción `unique` sobre `account_id`, solo sobre `(user_id, email_address)`.

**Pendiente: mecanismo de ingesta del correo — confirmado: Gmail API con OAuth.**

Esto agrega una tabla más al modelo, `gmail_connections`:

- `user_id` (única por usuario — una conexión de Gmail por cuenta de la PWA)
- `refresh_token` (guardado de forma segura; nunca se expone al cliente — ver nota de seguridad abajo)
- `access_token` y `token_expires_at` (opcional cachear, se puede refrescar bajo demanda con el `refresh_token`)
- `gmail_history_id` (el `historyId` de Gmail para sincronización incremental — evita releer todo el correo cada vez)
- `watch_expiration` (si usas Gmail push notifications vía Pub/Sub, esta suscripción expira cada ~7 días y hay que renovarla; si prefieres solo *polling* periódico este campo no aplica)
- `is_active`, `created_at`, `updated_at`

🔒 **Nota de seguridad**: esta tabla tendrá RLS habilitado pero **sin ninguna política para `authenticated`/`anon`** — solo el backend (con `service_role`, que ignora RLS) puede leer/escribir los tokens. Ningún usuario, ni siquiera el dueño, puede leer su propio `refresh_token` desde el cliente. Si necesitas mostrar en la UI "Gmail conectado ✅", se expone a través de una vista separada que solo devuelve `is_active`, nunca la tabla completa.

💡 De paso, esto resuelve el `external_reference` para deduplicar correos: puedes usar el **Message-ID de Gmail** como `external_reference` — es único por correo, así que dos lecturas del mismo mensaje nunca generan una transacción duplicada real (si de casualidad matchea, cae en `status='duplicado'` como ya definimos).

## 9. Cantidad de categorías vs. precisión de la IA — preocupación de Javier

Señalaste que las 9 categorías actuales (`Mercado, Comida Fuera, Transporte, Servicios, Suscripciones, Entretenimiento, Educación, Otros, Fondos-Acciones`) podrían dificultar que la IA (Gemini) clasifique bien — algunas se solapan semánticamente (ej. una compra en una tienda de conveniencia ¿es "Mercado" o "Comida Fuera"? una membresía de gimnasio ¿es "Suscripciones" o "Entretenimiento"?).

El riesgo real no es tanto el *número* de categorías (9 es un catálogo manejable) sino la **ambigüedad entre algunas de ellas**, que es lo que confunde tanto a una IA como a un humano llenando el Sheet a mano. El diseño que ya tenemos mitiga esto de tres formas:

1. **`categorization_rules` como primer filtro**: antes de preguntarle a Gemini, el sistema busca coincidencias exactas/aprendidas (ej. "Rappi" → siempre Comida Fuera) — Gemini solo entra para casos nuevos sin regla previa.
2. **Todo lo automático pasa por revisión** (`pendiente_revision`) — un error de clasificación nunca llega a contar en tus presupuestos sin que lo veas primero.
3. **Se puede agregar un campo `ai_confidence`** en `transactions` (0–1) que Gemini reporte junto con la categoría sugerida — así en la bandeja de revisión puedes ordenar primero las de menor confianza, en vez de revisar todo por igual.

Lo que sí valdría la pena resolver ahora, antes del SQL, es **la ambigüedad puntual entre categorías** (no la cantidad). Ejemplos concretos que probablemente generen confusión:

- Tienda de conveniencia / minimercado de barrio → ¿Mercado o Comida Fuera?
- Gimnasio / clases (ej. yoga) → ¿Suscripciones o Entretenimiento?
- Plataformas de streaming vs. una entrada de cine puntual → ambas ¿Entretenimiento, o la recurrente es Suscripciones?

¿Quieres que dejemos esas reglas de desambiguación como parte de los datos semilla de `categorization_rules` (para que la IA no tenga que adivinar en esos casos límite desde el día uno), o prefieres resolverlo sobre la marcha a medida que aparezcan?

---

## 10. Pendiente de tu confirmación antes de generar el SQL

1. ✅ Rollover — confirmado (punto 5.2, `assigned_amount` + `rollover_amount`).
2. ✅ `duplicate_review_log` — confirmado (punto 7).
3. ✅ Categorías reducidas a 6, remapeo histórico a `Otros` — confirmado.
4. ✅ Ingesta de correo vía Gmail API OAuth (`gmail_connections`) — confirmado.
5. **Última pregunta abierta**: ¿agregamos `ai_confidence` (0–1) a `transactions` para poder priorizar la bandeja de revisión por confianza, o con las categorías ya reducidas a 6 prefieres dejarlo fuera por ahora y agregarlo después si hace falta?

Cuando respondas el punto 5, genero el script SQL definitivo con el modelo completo.