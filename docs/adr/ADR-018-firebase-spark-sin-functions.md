# ADR-018: Usar Firebase en el plan gratuito Spark, sin Cloud Functions ni Storage

**Estado:** Aceptado. Reemplaza a ADR-002 y ADR-004; actualiza ADR-005 (fotos) y ADR-010 (cola de fotos).
**Fecha:** 2026-11-24
**Autor(es) y equipo:** Jimy Lucero San Lucas · Grupo 5
**Requisitos relacionados:** R2, R3, R7, R8, R10.

## Contexto
ADR-002 eligió el plan Blaze. Al activarlo, Google pidió un cobro de 30 USD a la tarjeta que el autor no puede cubrir. Desde febrero de 2026, Cloud Storage y Cloud Functions solo funcionan en Blaze. En el plan gratuito Spark siguen disponibles Authentication y Firestore. Quedaba un día para la entrega.

## Alternativas consideradas
| Alternativa | A favor | En contra |
|---|---|---|
| **Spark: Auth + Firestore; fotos en Firestore; lógica de cuentas en el cliente validada por reglas** | Sin costo ni tarjeta; la seguridad por mesa sigue en reglas (también para las fotos); el offline mejora (la foto viaja en el mismo lote) | Las reglas crecen; dos riesgos nuevos (ver Consecuencias); sin validación módulo 10 en el servidor |
| Cloudinary para las fotos | Gratis para imágenes | No evita Blaze (las Functions lo exigen igual); subidas con preset público, sin control por mesa; URLs públicas; sin offline |
| Migrar todo a Supabase | Plan gratuito | Reescribir backend, reglas y pruebas: no llega a tiempo |
| Pagar Blaze | Diseño original | No es posible para el autor |

## Decisión
- **Roles:** en `usuarios/{uid}` (`rol`, `recintoId`); las reglas los leen con `get()`. Un usuario sin perfil no tiene permisos.
- **Alta de cuentas (R2):** la app del coordinador crea la cuenta con una instancia secundaria de Firebase Auth (en memoria, para no cerrar su propia sesión) y escribe perfil + `cedulas/{cédula}` (+ `recintos.coordinadorId`) en un lote. Las reglas validan la jerarquía, el recinto, el formato de los datos y que la cédula no exista. Si el lote falla, la app borra la cuenta recién creada. Se envía `sendEmailVerification`.
- **Login por cédula (R3):** `cedulas/{cédula}` (lectura por ID, sin listado) da el correo; luego `signInWithEmailAndPassword`. Error genérico.
- **Cambio y recuperación de contraseña (R3):** `updatePassword` y `sendPasswordResetEmail`; las reglas solo dejan al usuario marcar `debeCambiarPassword: false`.
- **Fotos (R7):** JPEG en base64 (comprimido por debajo de 700 KB) en `fotos/{actaId}_{uuid}`, con las mismas reglas por mesa que las actas. El acta guarda `fotoPath = fotos/...`.
- **Auditoría:** la app la escribe en el mismo lote que el acta; las reglas exigen que el acta se escriba en la misma petición, por el mismo usuario y con la misma versión.
- **Offline (R10):** acta, foto y auditoría van en un solo lote que Firestore encola sin red; ya no hay cola de fotos propia.
- `storage.rules` niega todo; el código de `functions/` queda en el repositorio sin desplegar (referencia del diseño Blaze).

## Consecuencias
- Beneficio: costo cero; el deploy es solo `firestore:rules,firestore:indexes`.
- **Riesgo 1:** con el proveedor Correo/contraseña activo, cualquiera con la configuración web puede crear una cuenta de Auth. Mitigación: sin perfil creado por un coordinador no tiene ningún permiso (pruebas "una cuenta de Auth sin perfil no lee nada" y "nadie se crea su propio perfil").
- **Riesgo 2:** quien conozca una cédula registrada puede leer el correo asociado (`cedulas/{cédula}` es legible sin sesión para permitir el login). No se puede listar el índice.
- **Riesgo 3:** el servidor valida que la cédula tenga 10 dígitos y sea única, pero el algoritmo módulo 10 solo se aplica en la app. Un cliente modificado por un coordinador podría registrar una cédula con verificador incorrecto.
- Límite: cada foto ocupa un documento (máximo 1 MiB); la cuota gratuita de Firestore (1 GiB) alcanza para miles de actas.
- Las reglas leen el perfil en cada acceso (lecturas extra dentro de la cuota gratuita).

## Verificación
- `npm run test:rules`: 45 pruebas (aislamiento, validaciones, fotos, auditoría, alta por jerarquía, cédula duplicada, cuentas sin perfil, índice de cédulas).
- `tests/integracion/cuentas.mjs`: 13 casos con emuladores de Auth y Firestore, sin Functions.
- `src/app/core/auth.service.ts`, `src/app/data/usuario.repository.ts`, `src/app/data/acta.repository.ts`, `firestore.rules`.

## Uso de IA
Claude Code propuso la alternativa (fotos en Firestore en lugar de Cloudinary) explicando por qué Cloudinary no evitaba Blaze. Al reescribir, las pruebas detectaron un error: las reglas fallaban si un recinto no tenía el campo `coordinadorId`; se corrigió con `get('coordinadorId', null)` y el seed ahora lo inicializa.

## Trazabilidad
`2a32cff`.

## Consenso del equipo
[COMPLETAR POR EL GRUPO: el cambio de plan afecta la línea base acordada (ADR-002).]
