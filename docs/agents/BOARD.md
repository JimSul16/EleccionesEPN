# BOARD

Estados: `todo`, `in-progress`, `review`, `done`, `blocked`.

## Hecho (lunes 23)

| ID | Tarea | Dueño | Estado |
|---|---|---|---|
| S-01..S-04 | Scaffold, librerías, firebase init, primer APK | antigravity | done |
| C-01 | `domain/`: modelos, cédula, reglas de acta, nitidez, contraseña, validadores de formulario + 31 tests | claude | done |
| C-02 | `firestore.rules` y `storage.rules` por rol y pertenencia (reemplazan las abiertas del init) | claude | done |
| C-03 | `tests/rules/reglas.spec.ts` (aislamiento del veedor, validaciones, Storage) | claude | blocked por A-01 |
| C-04 | Functions: `crearUsuario`, `loginCedula`, `recuperarPassword`, `cambiarPassword`, `auditarActa` | claude | done (sin probar en emulador) |
| C-05 | `core/`: FirebaseService, AuthService (signals), guards, errores; pantallas de login, cambio y recuperación; rutas por rol | claude | done |

## Pedidos para Antigravity

| ID | Tarea | Estado |
|---|---|---|
| A-01 | `npm install -D @firebase/rules-unit-testing` y agregar a package.json el script `"test:rules": "firebase emulators:exec --project demo-elecciones-epn --only firestore,storage \"vitest run --config vitest.rules.config.mts\""` | done |
| A-02 | Crear `functions/.env.elecciones-epn` con `WEB_API_KEY=<apiKey web del proyecto>` (pública; no commitear igual) | done |
| A-03 | Dar a la cuenta de servicio de Cloud Functions el rol **Service Account Token Creator** (lo necesita `createCustomToken` en producción; en el emulador no) | pendiente en consola |
| A-04 | `firebase deploy --only firestore:rules,storage,functions` después de A-01..A-03 y de que pasen los tests de reglas | todo |
| A-05 | Revisar el bucket real: unificado a `elecciones-epn.firebasestorage.app` en `environment.ts`, `environment.prod.ts` y `environment.example.ts` | done |
| A-06 | Nota para esta PC: emuladores funcionando y 24/24 tests de reglas pasando | done |

## Pedidos para ti (consola de Firebase)

| ID | Tarea | Estado |
|---|---|---|
| U-01 | Authentication: activar el proveedor Correo/contraseña | todo |
| U-02 | Authentication > Templates: poner en español los correos de verificación y de restablecimiento | todo |

## Siguiente (Claude)

| ID | Tarea | Estado |
|---|---|---|
| C-06 | Seed R1 (recintos, 5 organizaciones, 5+5 candidatos, coordinador provincial) con Admin SDK | todo |
| C-07 | Repositorios `data/` + flujo del veedor: mis mesas, acta, cámara, nitidez, GPS, corrección | todo |
| C-08 | Coordinador de recinto: mesas, crear veedor, asignar/reasignar, corregir actas | todo |
| C-09 | Provincial: recintos, crear coordinador, avance, GPS, dashboard | todo |
| C-10 | Offline: cola de fotos + indicador de pendientes | todo |
