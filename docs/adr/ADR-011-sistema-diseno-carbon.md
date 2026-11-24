# ADR-011: Adoptar el sistema de diseño IBM Carbon adaptado a móvil

**Estado:** Aceptado
**Fecha:** 2026-11-21
**Autor(es) y equipo:** Jimy Lucero San Lucas · Grupo 5
**Requisitos relacionados:** R9 (UX), criterio de rúbrica "Diseño y experiencia de usuario".

## Contexto
App de datos electorales usada en campo: debe ser legible, densa en datos, sobria y neutral (sin parecer de un partido).

## Alternativas consideradas
| Alternativa | A favor | En contra |
|---|---|---|
| **IBM Carbon (`DESIGN.md` de awesome-design-md)** | Plano, un solo acento azul, pensado para datos y formularios | Diseñado para escritorio: hay que agrandar áreas táctiles |
| Estilo por defecto de Ionic | Cero trabajo | Genérico |
| Wise | Amigable y claro | Demasiado lúdico para datos electorales (se usa solo como referencia de mensajes) |
| Angular Material | Componentes completos | Choca con los componentes de Ionic |

## Decisión
Tokens de `DESIGN.md` (primary `#0f62fe`, ink `#161616`, success `#24a148`, warning `#f1c21b` con texto oscuro, error `#da1e28`, espaciado de 4 px, radios de 0 a 4 px) en `src/theme/`. Ajustes móviles: texto base 16 px, áreas táctiles de 44 px o más, estados con color y texto. Gráficos sin colores de partidos.

## Consecuencias
- Beneficio: identidad sobria y coherente.
- Riesgo: contraste del amarillo de advertencia; se usa con texto oscuro.

## Verificación
`src/theme/tokens.scss`, `src/theme/variables.scss`; capturas en `docs/design/`; `npx impeccable detect src/`.

## Uso de IA
OpenCode implementó los tokens y las pantallas de acceso con los skills impeccable y ui-ux-pro-max; Claude Code verificó que no se tocaran los bindings.

## Trazabilidad
Propuesta: `docs/PLAN-AGENTES.md` (`9217378`). Implementación: `8e44622`.

## Consenso del equipo
[COMPLETAR POR EL GRUPO]
