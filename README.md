# Control de gastos personales

PWA de control de gastos personales con Next.js, Supabase, clasificación inteligente mediante Gemini API y automatización de notificaciones bancarias.

## Requisitos

- Node.js 20+
- Proyecto de Supabase
- API key de Gemini (opcional, existe fallback local si no está configurada)

## Variables de entorno

Crea un archivo `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GEMINI_API_KEY=...
BANK_WEBHOOK_SECRET=...
```

## Tabla sugerida en Supabase

```sql
create table if not exists expenses (
  id bigint generated always as identity primary key,
  description text not null,
  amount numeric not null,
  category text not null,
  source text not null default 'manual',
  external_reference text,
  created_at timestamptz not null default now()
);
```

## Ejecución local

```bash
npm install
npm run dev
```

## Endpoints

- `POST /api/classify`: clasifica un gasto y opcionalmente lo persiste en Supabase.
- `POST /api/bank-notifications`: webhook para registrar movimientos bancarios, clasificar y guardar.
  - Header opcional/recomendado: `x-bank-signature: <BANK_WEBHOOK_SECRET>`

### Ejemplo webhook bancario

```bash
curl -X POST http://localhost:3000/api/bank-notifications \
  -H "Content-Type: application/json" \
  -H "x-bank-signature: tu-secreto" \
  -d '{"description":"Pago supermercado","amount":45.8,"reference":"txn-1001"}'
```
