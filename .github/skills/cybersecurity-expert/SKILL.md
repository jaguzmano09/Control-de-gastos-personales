---
name: cybersecurity-expert
description: "Audita y endurece aplicaciones Next.js/TypeScript con enfoque OWASP, API Security, control de acceso, Supabase/RLS, OAuth, secretos, SSRF, inyección, validación y dependencias. Usar cuando el usuario pida una auditoría de seguridad, revisión de vulnerabilidades, threat modeling, hardening o un security review del proyecto. Solo para análisis y pruebas autorizadas; no usar para intrusión, evasión o acceso no autorizado."
argument-hint: "[archivo, módulo, endpoint o alcance de la auditoría]"
user-invocable: true
---

# Experto en ciberseguridad

## Objetivo

Realizar revisiones de seguridad reproducibles y defensivas, priorizando
vulnerabilidades explotables, aislamiento por `user_id` y protección de secretos.
La salida debe distinguir hechos verificados, hipótesis y límites de la revisión.

## Cuándo usar

- Auditorías de archivos, rutas API, server actions, migraciones o integraciones.
- Revisión OWASP Top 10 y OWASP API Security Top 10.
- Evaluación de RLS, autenticación, autorización horizontal/vertical y multiusuario.
- Threat modeling de flujos OCR, Gmail OAuth, cron jobs, Gemini y Supabase.
- Hardening antes de desplegar y revisión de dependencias o configuración.

## Límites de seguridad

1. Trabajar únicamente sobre este repositorio, entornos locales o objetivos con
   autorización explícita.
2. No solicitar, imprimir, copiar ni probar credenciales reales, refresh tokens,
   claves privadas, valores de `.env.local` ni datos financieros.
3. No ejecutar explotación activa, fuerza bruta, evasión, persistencia,
   exfiltración ni pruebas destructivas. Preferir inspección estática y tests
   locales controlados.
4. Si falta contexto esencial, declarar la limitación o pedir datos sintéticos;
   no inventar resultados.

## Procedimiento de auditoría

### 1. Definir alcance y contexto

- Identificar archivos, rutas, flujo y cambios incluidos.
- Leer [`Especificacion_agents.md`](../../../Especificacion_agents.md) y las
  instrucciones del repositorio antes de evaluar reglas de negocio.
- Mapear entradas controladas por usuario, límites de confianza, datos sensibles,
  secretos, actores y salidas.
- Revisar el historial o diff cuando el usuario solicite una revisión de cambios.

### 2. Mapear la superficie

- Enumerar rutas en `app/api/`, server actions en `lib/actions/`, middleware,
  clientes Supabase, migraciones y adaptadores externos.
- Seguir el flujo completo de autenticación y autorización hasta la consulta o
  mutación de datos.
- Identificar llamadas a Gmail, Gemini, OCR, cron y URLs derivadas de entrada.

### 3. Aplicar los controles

Usar el checklist detallado de
[`OWASP-Security-Review.md`](./references/OWASP-Security-Review.md). Como mínimo:

- **A01 Broken Access Control:** sesión validada en servidor, propiedad por
  `user_id`, RLS habilitado y consistente, y ausencia de IDOR o bypass por
  parámetros, métodos alternativos o service role.
- **A02 Cryptographic Failures:** secretos solo en servidor, cookies seguras,
  tokens no expuestos en logs/respuestas y transporte seguro.
- **A03 Injection:** validación de entrada, consultas parametrizadas, prevención
  de XSS, SSRF, command injection y prompt injection en integraciones.
- **A04 Insecure Design:** estados de transacción, revisión humana de entradas
  automáticas, límites de negocio y protección contra replay o duplicados.
- **A05 Security Misconfiguration:** headers, CORS, errores, debug, cron secret,
  rutas internas y configuración de despliegue.
- **A06 Vulnerable Components:** `package.json`, lockfile y uso seguro de
  dependencias; no actualizar paquetes automáticamente durante una auditoría.
- **A07 Identification and Authentication Failures:** middleware, callbacks
  OAuth, expiración, CSRF/state y separación cliente-servidor.
- **A08 Software and Data Integrity:** validación de webhooks, firmas, fuentes
  externas, migraciones y pipelines.
- **A09 Logging and Monitoring:** eventos útiles sin secretos ni PII excesiva,
  y errores observables sin revelar internals.
- **A10 SSRF:** allowlists y validación de URL para OCR, Gmail, imágenes y
  cualquier fetch cuyo destino tenga influencia externa.

### 4. Verificar evidencia

- Citar archivo y líneas exactas para cada hallazgo.
- Confirmar cada posible vulnerabilidad siguiendo sus callers, tipos, políticas
  y tests; no marcar patrones aislados sin probar su impacto.
- Ejecutar únicamente validaciones seguras y focalizadas. Para cambios de código,
  usar como mínimo `npm run typecheck`, `npm run lint` y `npm run build`.
- No modificar código durante una auditoría salvo que el usuario pida corregir
  los hallazgos.

### 5. Reportar

Ordenar por severidad e impacto: CRITICAL, HIGH, MEDIUM, LOW. Para cada hallazgo
incluir:

1. Título y severidad.
2. Archivo y líneas.
3. Evidencia verificable y flujo afectado.
4. Impacto y precondiciones.
5. Confianza de 1 a 10.
6. Corrección mínima y pruebas recomendadas.

Separar hallazgos confirmados de observaciones que requieren configuración,
credenciales sintéticas o pruebas de runtime. Si no hay vulnerabilidades,
indicar qué se revisó y qué no pudo verificarse.

## Recursos

- [`OWASP-Security-Review.md`](./references/OWASP-Security-Review.md): checklist y
  formato de revisión adaptados al proyecto.
- Repositorio de referencia: [Anthropic Cybersecurity Skills](https://github.com/mukul975/Anthropic-Cybersecurity-Skills).
