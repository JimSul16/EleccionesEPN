# ADR-004: Autenticar por cédula con Cloud Functions y custom claims

**Estado:** Reemplazado por [ADR-018](ADR-018-firebase-spark-sin-functions.md): sin Cloud Functions, la cuenta se crea desde la app y el rol vive en `usuarios/{uid}`.
**Fecha:** 2026-11-23
**Autor(es) y equipo:** Jimy Lucero San Lucas · Grupo 5
**Requisitos relacionados:** R2 (sin autorregistro, jerarquía de creación, cédula validada, confirmación de cuenta), R3 (cédula como identificador, contraseña inicial Ecuador2026, cambio obligatorio, recuperación por correo, no exponer claves administrativas).

## Contexto
Firebase Auth identifica por correo, pero el usuario ingresa su cédula. Crear cuentas de otros usuarios y asignar roles requiere el Admin SDK, que no puede ir en la app. Hay que evitar que alguien averigüe qué cédulas existen o a qué correo corresponden.

## Alternativas consideradas
| Alternativa | A favor | En contra |
|---|---|---|
| **Functions callable: crearUsuario, loginCedula (custom token), recuperarPassword, cambiarPassword; roles en custom claims** | Correo nunca sale del servidor; jerarquía validada en servidor; roles inalterables por el cliente | Requiere Blaze y el rol Token Creator en producción |
| Callable que devuelve el correo de una cédula y login normal en el cliente | Simple | Permite enumerar cédulas y correos |
| Correo sintético `cedula@dominio` | Sin Functions para el login | La recuperación por correo no llegaría a nadie (R3) |
| Rol guardado solo en Firestore | Sin claims | Las reglas tendrían que leer el perfil en cada acceso; el rol sería editable si una regla falla |

## Decisión
- `crearUsuario`: verifica el rol del que llama (PROVINCIAL crea RECINTO, RECINTO crea VEEDOR de su recinto), valida cédula, teléfono y correo, reserva la cédula con `create()` (atómico), crea la cuenta con `Ecuador2026`, pone claims `{ rol, recintoId }` y envía el correo de verificación.
- `loginCedula`: busca el correo en servidor, valida la contraseña con la API REST de Identity Toolkit y devuelve un custom token. Error siempre genérico.
- `recuperarPassword`: misma respuesta exista o no la cédula; Firebase envía su correo de restablecimiento.
- `cambiarPassword`: valida la política en servidor y limpia `debeCambiarPassword`; revoca sesiones, por eso la app vuelve a iniciar sesión.
- Los correos los envía Firebase Auth con sus plantillas (sin SMTP propio).

## Consecuencias
- Beneficio: no hay claves administrativas en el APK; la config web de Firebase es pública por diseño.
- **Riesgo:** en producción `createCustomToken` falla sin el rol Token Creator. Mitigación: tarea U-03 en `docs/agents/BOARD.md`.
- Riesgo: arranque en frío de las Functions en la demo. Mitigación: llamar una vez antes de la defensa.

## Verificación
- `functions/src/usuarios.ts`, `functions/src/shared/identity-toolkit.ts`.
- `tests/integracion/cuentas.mjs`: 13 casos (login correcto, contraseña incorrecta y cédula inexistente con el mismo error, jerarquía, cédula repetida, cédula inválida en servidor, recinto con dos coordinadores, cambio de contraseña, recuperación indistinguible, auditoría).
- `src/app/core/guards.ts` (`primerAccesoGuard`).

## Uso de IA
Claude Code diseñó el flujo con custom token tras descartar la callable que devolvía el correo por riesgo de enumeración. Los nombres de endpoints de la API REST se verificaron ejecutando la prueba de integración contra el emulador de Auth.

## Trazabilidad
Implementación: `41f684c`. Pruebas: `0f4eaed`.

## Consenso del equipo
[COMPLETAR POR EL GRUPO]
