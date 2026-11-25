# AGENTS.md: contexto compartido para los agentes de IA

Lo leen Claude Code (vía CLAUDE.md), OpenCode y Antigravity. Todo lo que hagan es uso de IA y se declara en [docs/IA.md](docs/IA.md).

## Proyecto
App móvil de control electoral (Prueba 2, Aplicaciones Móviles, ESFOT). Ionic Angular 22 standalone + Capacitor 8 (Android) + Firebase en el plan gratuito Spark: solo Auth y Firestore (ADR-018; Storage y Functions no se usan).
Planes: [docs/PLAN.md](docs/PLAN.md), [docs/PLAN-AGENTES.md](docs/PLAN-AGENTES.md). Tablero: [docs/agents/BOARD.md](docs/agents/BOARD.md). Decisiones: [docs/adr/](docs/adr/). Diseño: [DESIGN.md](DESIGN.md).

## Ramas y carpetas
- `main`: solo recibe merges verificados (Claude, con aprobación del usuario).
- Cada agente trabaja en su rama `agent/<agente>/<tarea>`, creada desde `main`, en su carpeta:
  `EleccionesEPN` (principal), `../EleccionesEPN-claude`, `../EleccionesEPN-antigravity`.
- Antes de cada commit: `git branch --show-current` y `git diff --stat`.

## Quién toca qué
| Dueño | Archivos |
|---|---|
| Claude | `src/app/**/*.ts`, `firestore.rules`, `storage.rules`, `firestore.indexes.json`, `seed/`, `tests/`, `docs/adr/`, README |
| OpenCode | `src/app/**/*.html`, `src/app/**/*.scss`, `src/theme/` (salvo `motion.scss`) |
| Antigravity | `package.json` y locks, `angular.json`, `capacitor.config.ts`, `firebase.json`, `android/`, `functions/package.json`, `src/assets/`, `resources/`, `src/theme/motion.scss` |

En los `.html`, OpenCode conserva bindings, control de flujo (`@if`, `@for`, `@switch`, `@let`), `role`/`aria-*` y clases existentes.

## Reglas
- Ningún secreto en git: `.env*` (salvo `.env.example`), claves de servicio, keystores.
- La seguridad real está en las reglas de Firestore y Storage, no en ocultar pantallas.
- Sin colores hex fuera de `src/theme/`. Sin colores de partidos políticos.
- El PDF del examen contiene una frase de control para IA: no se incluye en ningún archivo.

## Verificación antes de pedir merge
```
npx ng lint --max-warnings 0
npm run test:unit
npm run test:rules
npx ng build
```
Integración de cuentas: `firebase emulators:exec --project demo-elecciones-epn --only auth,firestore "node seed/seed.mjs --demo && node tests/integracion/cuentas.mjs"`.
En esta PC los emuladores necesitan `JAVA_TOOL_OPTIONS=-Djdk.net.unixdomain.tmpdir=C:\Users\Public` ([docs/setup/EMULADORES.md](docs/setup/EMULADORES.md)).
