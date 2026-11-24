# ADR-016: No usar WebGPU ni Three.js

**Estado:** Aceptado
**Fecha:** 2026-11-21
**Autor(es) y equipo:** Jimy Lucero San Lucas
**Requisitos relacionados:** R9.

## Contexto
Se instaló un skill de WebGPU con Three.js como parte del kit de herramientas. La app es de formularios y datos.

## Alternativas consideradas
| Alternativa | A favor | En contra |
|---|---|---|
| **No usar gráficos 3D** | APK liviano; rendimiento en gama media | Ninguno funcional |
| Mapa o dashboard 3D con WebGPU | Vistoso | Soporte irregular en la WebView de Android; peso; sin valor para los requisitos |

## Decisión
No se usa WebGPU ni Three.js. El dashboard es un gráfico de barras 2D (ADR-017).

## Consecuencias
Ninguna sobre los requisitos. El skill queda instalado solo en Claude Code y sin uso.

## Verificación
`package.json` no incluye `three`.

## Uso de IA
Decisión tomada al revisar los repositorios propuestos para el kit de IA.

## Trazabilidad
`docs/PLAN-AGENTES.md` (`9217378`).

## Consenso del equipo
No aplica.
