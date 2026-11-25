# ADR-017: Dibujar el dashboard con Chart.js, un solo color neutro y tabla accesible

**Estado:** Aceptado (revisado el 2026-11-25 tras la prueba en el teléfono)
**Fecha:** 2026-11-23
**Autor(es) y equipo:** Jimy Lucero San Lucas · Grupo 5
**Requisitos relacionados:** R4 (dashboard de votos por candidato, por recinto o consolidado).

## Contexto
El provincial necesita ver votos por candidatura y dignidad, consolidado o por recinto. Un gráfico electoral no debe sugerir preferencia por colores de partidos. Los totales no deben calcularse descargando todas las actas.

## Alternativas consideradas
| Alternativa | A favor | En contra |
|---|---|---|
| Chart.js (barras horizontales) + consultas de agregación de Firestore | Ligero, conocido; el servidor suma | Máximo 5 agregaciones por consulta; en producción falló (ver Consecuencias) |
| ngx-charts | Integrado con Angular | Más pesado; sin necesidad de sus extras |
| SVG a mano | Cero dependencias | Más tiempo |
| **Chart.js + sumar en el cliente las actas que el provincial ya escucha** | Sin consultas extra ni índices; se actualiza en tiempo real | Con miles de actas habría que volver a agregar en el servidor |

## Decisión
- Totales con `sumarActas` (`src/app/domain/totales.ts`) sobre las actas que `ProvincialStore` ya recibe en tiempo real para el avance por recinto. El cantón tiene 66 actas como máximo (33 JRV x 2 dignidades), así que no se descarga nada adicional.
- Barras de un solo color (`--ion-color-primary`), sin animación, en un contenedor de altura fija. Tabla equivalente con `caption` para lectores de pantalla.
- Se recalcula solo (signals `computed`) cuando cambian las actas, la dignidad o el recinto.

## Consecuencias
- Beneficio: neutralidad visual; números exactos y verificables (válidos + nulos + blancos = sufragantes).
- Riesgos materializados y corregidos: 9 agregaciones en una consulta (error 400), bucle infinito del `effect`, barras invisibles por falta de altura y animación pausada.
- En el teléfono, contra el Firestore real, el dashboard mostró "Ocurrió un error inesperado" aunque en los emuladores funcionaba. La documentación de Firestore advierte que agregar varios campos en una consulta con filtro puede exigir un índice compuesto, y el emulador no exige índices. En vez de crear un índice por cada suma, se pasó a sumar en el cliente. Los errores no traducidos ahora quedan en la consola para diagnosticarlos.

## Verificación
`src/app/features/provincial/dashboard.page.ts`, `src/app/domain/totales.ts` y su prueba unitaria; con `seed --actas-demo`: 12 actas de alcaldía, 2542 válidos + 56 nulos + 48 blancos = 2646 sufragantes.

## Uso de IA
Claude Code implementó el dashboard; los tres errores se encontraron en la prueba en el navegador y se diagnosticaron con la respuesta del servidor y la consola.

## Trazabilidad
`5bb8bde`.

## Consenso del equipo
[COMPLETAR POR EL GRUPO]
