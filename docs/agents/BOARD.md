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
| A-01 | `npm install -D @firebase/rules-unit-testing` y script `test:rules`. (23/24 pasan; falla 1 en Storage cross-service rules, ver reporte para Claude) | done |
| A-02 | Crear `functions/.env.elecciones-epn` con `WEB_API_KEY` (pública; no versionada en git) | done |
| A-03 | Rol "Service Account Token Creator" para cuenta de servicio de Functions (pendiente del usuario en consola GCP IAM; gcloud no instalado) | blocked |
| A-04 | `firebase deploy --only firestore:rules,storage,functions` (bloqueado hasta resolver fallo de Storage rules y que el usuario active Blaze en consola) | blocked |
| A-05 | Unificar bucket: ambos entornos usan `elecciones-epn.firebasestorage.app` | done |
| A-06 | Documentación de emuladores y `JAVA_TOOL_OPTIONS` en `docs/setup/EMULADORES.md` | done |
| S-06 | Generación del APK debug (`android/app/build/outputs/apk/debug/app-debug.apk`, 9.18 MB) | done |
| T-007 | Assets visuales: icon.png, splash.png, recursos Android generados con `@capacitor/assets`, 4 SVGs de estados y MANIFEST.md | done |
| T-008 | Motion: `sincronizando.lottie`, `acta-guardada.lottie`, `motion.scss` con reduced-motion | done |

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
