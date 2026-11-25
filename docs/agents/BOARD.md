# BOARD

Estados: `todo`, `in-progress`, `blocked`, `done`.
Actualizado: martes 24-nov (noche). Todo unido en `main` (commit `7471958` y siguientes).
Backend: **Firebase gratuito (Spark)**, solo Auth y Firestore, sin Functions ni Storage ([ADR-018](../adr/ADR-018-firebase-spark-sin-functions.md)).
Verificación sobre `main`: lint, 41 unitarias, 4 E2E, 45 de reglas, 13 de integración y build, todo en verde.

## Claude

| ID | Tarea | Estado |
|---|---|---|
| C-01..C-11 | Dominio, reglas, datos, tres roles, dashboard, offline, seed, pruebas, ADR, README, IA.md, DEFENSA.md | done |
| C-14 | Migración al plan gratuito: roles en `usuarios`, alta de cuentas desde la app, fotos en Firestore, auditoría en el lote del acta; ADR-018 | done |
| C-13 | Revisar y unir OpenCode (T-010..T-012) | done |
| C-12 | Calibrar `UMBRAL_NITIDEZ` con la prueba en el teléfono | done (80: 3/3 nítidas aceptadas, 3/3 borrosas rechazadas; ADR-008) |
| C-15 | Corregir las FALLAS de la prueba en el teléfono: dashboard (suma en el cliente, ADR-017) y aviso verde ilegible | done (re-probado OK en el teléfono) |
| C-16 | Enlace del APK (GitHub Release v1.0.0) en el README | done (apunta a `releases/tag/v1.0.0`; funciona cuando A-12 publique el Release) |

## OpenCode

| ID | Tarea | Estado |
|---|---|---|
| T-004, T-009 | Tokens Carbon y pantallas de acceso | done |
| T-010, T-011, T-012 | Estilo de las pantallas nuevas, errores de formulario, estados vacío/error y aviso de conexión | done (unido en `main`) |
| T-013 | Revisión visual final en `main` con capturas a 360 px (claro/oscuro) y ajustes menores | todo, opcional |

## Antigravity

| ID | Tarea | Estado |
|---|---|---|
| A-11 | Configuración web real en `environment.prod.ts` | done |
| A-08 (guía) | `docs/setup/PRUEBA-TELEFONO.md` corregida | done |
| A-04 | Deploy **solo** `firestore:rules,firestore:indexes` (plan gratuito: nada de Functions ni Storage) | done (`Deploy complete!` en `elecciones-epn`) |
| A-09 | Seed de producción con la clave de servicio fuera del repo | done (6 recintos, 33 JRV, 5 orgs, 10 candidaturas, 4 cuentas + 24 actas demo en `elecciones-epn`) |
| S-08 | APK debug desde `main` y prueba en el teléfono (llenar PRUEBA-TELEFONO.md y los 6 puntajes de nitidez) | done (APK `10.05 MB` instalado en TECNO LH7n; 15/15 pasos OK tras `C-15`; 3 nítidas aceptadas y 3 borrosas rechazadas con `80`) |
| A-10 | Subir `main` a https://github.com/JimSul16/EleccionesEPN | done (push inicial `d544fe3` verificado; rama `agent/antigravity/A-07` subida para merge final de Claude) |
| A-12 | Miércoles: APK release firmado + GitHub Release v1.0.0 | done (`app-release.apk` `7.57 MB` / `7,941,736 bytes`, firmado fuera del repo, verificado con `apksigner` + login en `TECNO LH7n` y publicado en `releases/tag/v1.0.0`) |

## Usuario

| ID | Tarea | Estado |
|---|---|---|
| U-00 | **No activar Blaze.** En la consola: Firestore creado, proveedor Correo/contraseña activo, plantillas de correo en español | done (Firestore y Correo/contraseña activos en `elecciones-epn`) |
| U-01 | Mover la carpeta `.env2/` (clave de servicio) fuera del proyecto | todo |
| U-02 | Prueba en el teléfono con Antigravity | done |
| U-03 | `docs/IA.md`: prompts literales y sección 7; consenso del grupo en los ADR (incluido ADR-018) | todo |
| U-04 | Entregables de grupo y coevaluación | todo |
