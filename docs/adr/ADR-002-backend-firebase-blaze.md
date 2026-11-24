# ADR-002: Usar Firebase en plan Blaze como backend

**Estado:** Aceptado (reemplaza la propuesta inicial de Supabase registrada en `docs/PLAN.md` el 21-nov)
**Fecha:** 2026-11-23
**Autor(es) y equipo:** Jimy Lucero San Lucas · Grupo 5
**Requisitos relacionados:** R8 (backend, reglas por rol y pertenencia, persistencia de datos e imágenes), R3 (no exponer claves administrativas), R10.

## Contexto
Se necesita autenticación, base de datos con reglas por rol, almacenamiento de las fotos de las actas y código de servidor para crear cuentas sin exponer credenciales de administrador. Desde el 3-feb-2026 Cloud Storage y Cloud Functions de Firebase exigen el plan Blaze (verificado en la documentación oficial el 23-nov).

## Alternativas consideradas
| Alternativa | A favor | En contra |
|---|---|---|
| **Firebase (Auth, Firestore, Storage, Functions) en Blaze** | Un solo proveedor; reglas de Firestore y Storage declarativas y probables con emulador; caché offline incluida en el SDK; Functions para operaciones de administrador | Requiere cuenta de facturación (tarjeta); consultas agregadas limitadas |
| Supabase | Plan gratuito sin tarjeta; Postgres con RLS y SQL | El grupo eligió Firebase; offline requiere implementación propia |
| Firebase + Supabase (Storage) | Fotos sin Blaze | No evita Blaze (las Functions lo exigen igual); seguridad partida en dos sistemas; dos SDK |

## Decisión
Firebase en plan Blaze, todo en la región `us-central1` (dentro de la cuota sin costo de Storage: 5 GB, 100 GB/mes de descarga). Proyecto `elecciones-epn`. Las Functions limitan `maxInstances: 5`.

## Consecuencias
- Beneficio: autorización real en el servidor con `firestore.rules` y `storage.rules` (ADR-005).
- Beneficio: offline casi gratis con `persistentLocalCache` (ADR-010).
- **Riesgo (de la opción elegida):** cobro inesperado. Mitigación: región us-central1, alerta de presupuesto de 1 USD (solo avisa, no detiene), `maxInstances` bajo, listeners solo en pantallas abiertas (stores por página).
- Riesgo: `createCustomToken` en producción requiere el rol "Service Account Token Creator" para la cuenta de servicio de las Functions.
- Limitación: máximo 5 agregaciones por consulta (se usan dos consultas, ver `acta.repository.ts`).

## Verificación
- `firebase.json`, `firestore.rules`, `storage.rules`, `functions/src/index.ts` (`setGlobalOptions({ region: 'us-central1', maxInstances: 5 })`).
- `npm run test:rules` (30 pruebas) y `tests/integracion/cuentas.mjs` (13 casos) contra los emuladores.

## Uso de IA
Claude Code consultó la documentación oficial de Firebase sobre Blaze y Storage (no respondió de memoria) y explicó por qué la combinación con Supabase no evitaba Blaze. La decisión de usar Firebase la tomó el grupo.

## Trazabilidad
Propuesta y reemplazo: `docs/PLAN.md` (commits `9217378`, `b0b4f68`). Implementación: `41f684c`, `0f4eaed`.

## Consenso del equipo
El grupo eligió Firebase. [COMPLETAR POR EL GRUPO: argumentos de cada integrante, objeciones (costo y tarjeta), acuerdo final y minuto del video.]
