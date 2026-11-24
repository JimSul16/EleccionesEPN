# ADR-015: Coordinar tres agentes de IA con ramas, worktrees y propiedad de carpetas

**Estado:** Aceptado (decisión individual de forma de trabajo)
**Fecha:** 2026-11-23
**Autor(es) y equipo:** Jimy Lucero San Lucas
**Requisitos relacionados:** Sección 7 del enunciado (uso de IA declarado y verificado).

## Contexto
Se usaron tres herramientas de IA: Claude Code (lógica y datos), OpenCode (interfaz) y Antigravity (instalación, deploy, APK y assets). Trabajando en la misma carpeta, un agente puede incluir en su commit los cambios de otro.

## Alternativas consideradas
| Alternativa | A favor | En contra |
|---|---|---|
| **Una rama y un git worktree por agente; propiedad de carpetas; tablero en el repo; merge a `main` solo con verificación** | Sin pisarse; trazabilidad por commit | Hay que unir ramas |
| 1code (orquestador) | Interfaz para varios agentes | Solo orquesta Claude Code y Codex; requiere compilar con bun o suscripción |
| Una sola carpeta para todos | Simple | Commits mezclados |

## Decisión
Carpetas `EleccionesEPN` (main), `../EleccionesEPN-claude` y `../EleccionesEPN-antigravity`. Reglas en `AGENTS.md`; tareas en `docs/agents/BOARD.md`; prompts en `docs/agents/PROMPTS.md`. Solo Claude une ramas a `main`, con lint, pruebas y build en verde y aprobación del usuario.

## Consecuencias
- Riesgo materializado: un agente commiteó en la rama de otro (`1b33051`) y otro agregó una dependencia errónea `file:..` en Functions. Se detectaron al revisar las ramas y se corrigieron al unir (`6d4bd21`).
- Obligación: cada agente revisa `git branch --show-current` y `git diff --stat` antes de commitear.

## Verificación
`git log --graph --all`; merges `a6489d1` y `6d4bd21` con lint, 41 pruebas unitarias, 30 de reglas, 13 de integración y build en verde.

## Uso de IA
Esta decisión trata del propio uso de IA; detalles en `docs/IA.md`.

## Trazabilidad
`a6489d1`, `6d4bd21`, `b0b4f68`.

## Consenso del equipo
No aplica (forma de trabajo individual).
