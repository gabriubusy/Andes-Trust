# Supabase — Finca El Progreso

## Setup rápido

```bash
npm i -D supabase
npx supabase init
npx supabase link --project-ref <TU_REF>
npx supabase db push              # aplica migrations/0001_init.sql
npx supabase gen types typescript --linked > src/lib/supabase/database.types.ts
```

Variables de entorno (`.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # sólo server
SUPABASE_JWT_SECRET=...              # para firmar JWTs con claim privy_did
```

## Auth con Privy + RLS

Supabase no conoce a Privy, así que las policies leen el claim
`privy_did` desde el JWT que tú firmas en el server de Next.js tras
validar el access token de Privy. Flujo:

1. Cliente obtiene `accessToken` de Privy.
2. Llama a `/api/supabase-token` (ver `src/lib/supabase/token.ts`, a
   implementar) que verifica el token de Privy y devuelve un JWT
   firmado con `SUPABASE_JWT_SECRET` conteniendo `{ privy_did, sub,
role: 'authenticated' }`.
3. El cliente browser de Supabase usa ese JWT como `accessToken`.
4. `current_privy_did()` en SQL lee el claim y `is_farm_member()`
   resuelve tenancy.

Alternativa simple: hacer todas las queries desde route handlers
server-side con `service_role` y validar manualmente — más rápido de
arrancar, pierdes RLS como defensa en profundidad.

## Convenciones

- Una migración por feature: `0002_xxx.sql`, nunca editar `0001_init.sql`.
- Catálogos (`*_catalog`) son globales; el resto es tenant-scoped por `farm_id`.
- `animal_events` es el timeline append-only; tablas específicas
  (`weighings`, `vaccinations`, …) guardan datos estructurados y
  opcionalmente insertan un registro espejo en `animal_events`.
