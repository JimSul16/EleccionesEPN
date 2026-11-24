# ADR-013: Estilar con variables CSS de Ionic y SCSS, sin Tailwind

**Estado:** Aceptado
**Fecha:** 2026-11-21
**Autor(es) y equipo:** Jimy Lucero San Lucas · Grupo 5
**Requisitos relacionados:** R9.

## Contexto
Los componentes de Ionic se personalizan con variables CSS (`--ion-color-primary`, etc.). Hay que evitar que los colores se dispersen por el código.

## Alternativas consideradas
| Alternativa | A favor | En contra |
|---|---|---|
| **Variables CSS de Ionic + SCSS; tokens en `src/theme/`; un `.scss` por página** | Es el mecanismo nativo de Ionic; sin dependencias | Más CSS escrito a mano |
| Tailwind | Rápido para maquetar | Duplica el theming de Ionic; dependencia extra; no alcanza el shadow DOM de los componentes |
| CSS-in-JS | Estilos junto al código | No es idiomático en Angular |

## Decisión
Tokens y variables en `src/theme/tokens.scss` y `variables.scss`. Cada página nueva declara `styleUrl` con su `.page.scss` (estilos encapsulados). Regla: cero colores hex fuera de `src/theme/`.

## Consecuencias
- Beneficio: cambiar un token cambia toda la app.
- Riesgo: las pantallas de acceso se cargaron como estilos globales desde `variables.scss` porque sus `.ts` no declaraban `styleUrl`; para las pantallas nuevas se agregó `styleUrl` (commit `f7bce52`).

## Verificación
`git grep -nE "#[0-9a-fA-F]{3,8}\b" -- "src/app/**/*.scss" "src/app/**/*.html"` no devuelve resultados.

## Uso de IA
El skill `ui-styling` (shadcn/Tailwind) se descartó y no se instaló para OpenCode ni Antigravity por contradecir esta decisión.

## Trazabilidad
`8e44622`, `f7bce52`.

## Consenso del equipo
[COMPLETAR POR EL GRUPO]
