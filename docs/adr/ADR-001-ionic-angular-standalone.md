# ADR-001: Usar Ionic Angular con componentes standalone

**Estado:** Aceptado
**Fecha:** 2026-11-21 (propuesta) · 2026-11-24 (registro)
**Autor(es) y equipo:** Jimy Lucero San Lucas · Grupo 5
**Requisitos relacionados:** R9 (separar presentación, lógica y datos; manejo de estado), condiciones técnicas (Ionic Angular standalone o Ionic React con Capacitor).

## Contexto
El enunciado admite solo Ionic Angular (standalone) o Ionic React, con Capacitor y compilación para Android. La app tiene muchos formularios con validación (cédula, actas, cuentas), tres roles con rutas protegidas y varias capas que deben quedar separadas y explicables en la defensa. Hay menos de cinco días.

## Alternativas consideradas
| Alternativa | A favor | En contra |
|---|---|---|
| **Ionic Angular standalone** | Inyección de dependencias nativa para separar servicios, repositorios y stores; guards de ruta; Reactive Forms con validadores componibles; signals para estado | Más código ceremonial; curva de Angular |
| Ionic React | Ecosistema grande, JSX conocido | Sin inyección de dependencias (separar capas depende de disciplina o librerías extra); formularios y guards requieren librerías adicionales (react-hook-form, rutas protegidas manuales) |

## Decisión
Ionic Angular 22 con componentes standalone (sin NgModules), `@ionic/angular` 9 y Capacitor 8. Rutas con `loadComponent` (carga diferida por pantalla) y `withComponentInputBinding` para recibir parámetros de ruta como `input()`.

## Consecuencias
- Beneficio: `inject()` permite que las páginas dependan de stores y los stores de repositorios, sin que una página toque Firebase (ADR-003).
- Beneficio: Reactive Forms reutiliza las reglas puras de `domain/` mediante adaptadores (`form-validators.ts`).
- Riesgo: `inject()` solo funciona en contexto de inyección. Ocurrió el bug NG0203 en los guards al llamar `inject()` después de un `await`; se corrigió y quedó cubierto por `src/app/core/guards.spec.ts`.
- Obligación: Angular 22 genera pruebas con Vitest (`ng test`), no Karma.

## Verificación
- `src/main.ts`: `bootstrapApplication` sin módulos.
- `src/app/app.routes.ts`: todas las pantallas con `loadComponent`.
- `npx ng build` genera un chunk por pantalla.

## Uso de IA
Claude Code propuso la comparación y el scaffold lo generó Antigravity con el CLI de Ionic. Se verificó compilando y ejecutando la app; el bug NG0203 lo detectó la prueba en el navegador, no la IA al escribir el código.

## Trazabilidad
Propuesta: `docs/PLAN.md` (commit `9217378`). Implementación: `9217378` (scaffold), `41f684c` (rutas y guards), `bccef3f` (corrección de guards).

## Consenso del equipo
[COMPLETAR POR EL GRUPO: argumentos de cada integrante, objeciones, acuerdo final y minuto del video.]
