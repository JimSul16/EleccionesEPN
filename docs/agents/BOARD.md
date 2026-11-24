# BOARD

Estados: `todo`, `in-progress`, `review`, `done`, `blocked`.
Actualizado: lunes 23-nov, tras unir las ramas de Claude, OpenCode y Antigravity en `main`.

## Claude (programación)

| ID | Tarea | Estado |
|---|---|---|
| C-01 | `domain/`: modelos, cédula, reglas de acta, nitidez, contraseña, geo, validadores de formulario | done |
| C-02 | `firestore.rules` y `storage.rules` por rol y pertenencia | done |
| C-03 | `tests/rules/reglas.spec.ts`: 30 tests (aislamiento del veedor, validaciones, Storage, recintos) | done, 30/30 con `npm run test:rules` |
| C-04 | Functions: `crearUsuario`, `loginCedula`, `recuperarPassword`, `cambiarPassword`, `auditarActa` | done, 13 pruebas de integración (`tests/integracion/cuentas.mjs`) |
| C-05 | `core/`: FirebaseService, AuthService, guards (con test), errores; login, cambio y recuperación de contraseña | done |
| C-06 | Seed R1 (`seed/seed.mjs`, con `--demo` y `--actas-demo`) | done |
| C-07 | `data/` + veedor: mis mesas, acta con validación en vivo, cámara, nitidez, GPS, corrección | done (falta probar cámara y GPS en teléfono) |
| C-08 | Coordinador de recinto: mesas, crear veedor, asignar/reasignar, corregir actas | done |
| C-09 | Provincial: recintos, crear coordinador, avance, dashboard, ubicaciones GPS | done |
| C-10 | Offline: caché de Firestore, cola de fotos en IndexedDB, indicador, conflictos por versión | done |
| C-11 | ADR-001..017, README, `docs/IA.md`, `docs/DEFENSA.md`, AGENTS.md/CLAUDE.md; `motion.scss` conectado; `styleUrl` por pantalla para OpenCode | done (24-nov). El autor completa en IA.md sus prompts literales y el grupo el consenso de cada ADR |
| C-12 | Calibrar `UMBRAL_NITIDEZ` con los puntajes de fotos reales | todo: espera el reporte de Antigravity (A-08) |
| C-13 | Revisar y unir la rama de OpenCode (T-010..T-012) | todo: espera a OpenCode |

## OpenCode (UI)

| ID | Tarea | Estado |
|---|---|---|
| T-004 | Tokens Carbon y variables de Ionic en `src/theme/` | done |
| T-009 | Estilo de login, cambio y recuperación de contraseña | done |
| T-010 | Estilo de las pantallas nuevas: `features/veedor`, `features/actas`, `features/recinto`, `features/provincial`, `features/usuarios`, `features/shared/estado-red` | todo |
| T-011 | En formularios, el texto de error (`errorText`) queda tapado por el campo siguiente: dar espacio inferior a `ion-input` | todo |
| T-006 | Componentes compartidos (state-view, chips de estado) | todo, baja prioridad |

## Antigravity (setup, deploy, APK, assets)

| ID | Tarea | Estado |
|---|---|---|
| A-01 | `@firebase/rules-unit-testing` y script `test:rules` | done. El fallo 23/24 de Storage era por correr sin `--project demo-elecciones-epn`; corregido en `main`, ahora 30/30 |
| A-02 | `functions/.env.elecciones-epn` con `WEB_API_KEY` (no versionado) | done |
| A-03 | Rol "Service Account Token Creator" a la cuenta de servicio de Functions | blocked: lo hace el usuario en la consola de Google Cloud (IAM) |
| A-04 | `firebase deploy --only firestore:rules,firestore:indexes,storage,functions` | todo: ya no está bloqueado por las reglas; falta Blaze y A-03 |
| A-05 | Bucket unificado a `elecciones-epn.firebasestorage.app` | done |
| A-06 | `docs/setup/EMULADORES.md` | done |
| A-07 | Quitar la dependencia errónea `"elecciones-epn": "file:.."` de `functions/package.json` | done en `main` (Claude). Antigravity: correr `npm --prefix functions install` para regenerar el lock |
| S-06 | APK debug | done, pero se compiló antes de unir las ramas: **hay que regenerarlo desde `main`** |
| T-007 | Ícono, splash, recursos Android, 4 SVG de estados, MANIFEST.md | done |
| T-008 | dotLottie de sincronización y guardado, `motion.scss` con reduced-motion | done |

## Usuario (consola)

| ID | Tarea | Estado |
|---|---|---|
| U-00 | Activar el plan Blaze, bucket en us-central1, alerta de presupuesto de 1 USD | por confirmar |
| U-01 | Authentication: activar el proveedor Correo/contraseña | todo |
| U-02 | Authentication > Templates: correos de verificación y restablecimiento en español | todo |
| U-03 | A-03 (rol Token Creator en IAM) | todo |
