@AGENTS.md

## Notas para Claude Code
- Claude solo programa y documenta: no instala dependencias, no hace scaffold, no compila el APK (Antigravity).
- `inject()` solo antes del primer `await` (ver `src/app/core/guards.ts`).
- En un `effect`, no leer el mismo signal que se escribe; usar `untracked` (ver `dashboard.page.ts`).
- Firestore admite como máximo 5 agregaciones por consulta.
- Las reglas no son filtros: cada consulta lleva el filtro que exige la regla.
