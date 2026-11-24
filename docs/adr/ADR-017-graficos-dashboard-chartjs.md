# ADR-017: Dibujar el dashboard con Chart.js, un solo color neutro y tabla accesible

**Estado:** Aceptado
**Fecha:** 2026-11-23
**Autor(es) y equipo:** Jimy Lucero San Lucas · Grupo 5
**Requisitos relacionados:** R4 (dashboard de votos por candidato, por recinto o consolidado).

## Contexto
El provincial necesita ver votos por candidatura y dignidad, consolidado o por recinto. Un gráfico electoral no debe sugerir preferencia por colores de partidos. Los totales no deben calcularse descargando todas las actas.

## Alternativas consideradas
| Alternativa | A favor | En contra |
|---|---|---|
| **Chart.js (barras horizontales) + consultas de agregación de Firestore** | Ligero, conocido; el servidor suma | Máximo 5 agregaciones por consulta |
| ngx-charts | Integrado con Angular | Más pesado; sin necesidad de sus extras |
| SVG a mano | Cero dependencias | Más tiempo |
| Sumar en el cliente descargando las actas | Sin límites de agregación | No escala; más lecturas |

## Decisión
- Totales con `getAggregateFromServer` (`count` y `sum`), divididos en dos consultas por el límite de 5 agregaciones; índice compuesto `actas(dignidad, recintoId)`.
- Barras de un solo color (`--ion-color-primary`), sin animación, en un contenedor de altura fija. Tabla equivalente con `caption` para lectores de pantalla.
- Se recalcula cuando cambian las actas (el `effect` usa `untracked` para no entrar en bucle).

## Consecuencias
- Beneficio: neutralidad visual; números exactos y verificables (válidos + nulos + blancos = sufragantes).
- Riesgos materializados y corregidos: 9 agregaciones en una consulta (error 400), bucle infinito del `effect`, barras invisibles por falta de altura y animación pausada.

## Verificación
`src/app/features/provincial/dashboard.page.ts`, `src/app/data/acta.repository.ts`; con `seed --actas-demo`: 12 actas de alcaldía, 2542 válidos + 56 nulos + 48 blancos = 2646 sufragantes.

## Uso de IA
Claude Code implementó el dashboard; los tres errores se encontraron en la prueba en el navegador y se diagnosticaron con la respuesta del servidor y la consola.

## Trazabilidad
`5bb8bde`.

## Consenso del equipo
[COMPLETAR POR EL GRUPO]
