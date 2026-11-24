# ADR-012: Empaquetar IBM Plex con fontsource

**Estado:** Aceptado
**Fecha:** 2026-11-21
**Autor(es) y equipo:** Jimy Lucero San Lucas · Grupo 5
**Requisitos relacionados:** R9 (UX), R10 (la app debe verse bien sin conexión).

## Contexto
Carbon usa IBM Plex. Los números de las actas se leen mejor con una fuente monoespaciada. La app debe funcionar sin red.

## Alternativas consideradas
| Alternativa | A favor | En contra |
|---|---|---|
| **`@fontsource/ibm-plex-sans` y `@fontsource/ibm-plex-mono` (npm)** | Fuentes dentro del APK; funcionan offline | Aumenta el tamaño del APK |
| Google Fonts por CDN | Cero peso en el APK | Falla sin conexión |
| Clonar el repositorio `google/fonts` | Todas las fuentes | Unos 3,3 GB |
| Fuentes del sistema | Cero peso | Pierde la identidad de Carbon |

## Decisión
Plex Sans para la interfaz y Plex Mono (clase `.tabular`) para votos y totales, importadas en `src/theme/tokens.scss` con los pesos usados.

## Consecuencias
- Beneficio: tipografía consistente también en modo avión.
- Riesgo: peso del APK; se importan solo los pesos necesarios.

## Verificación
`src/theme/tokens.scss`; con el APK en modo avión la fuente sigue cargando.

## Uso de IA
Claude Code verificó en npm que los paquetes existían antes de proponerlos; OpenCode los integró.

## Trazabilidad
`9217378` (instalación), `8e44622` (uso en el tema).

## Consenso del equipo
[COMPLETAR POR EL GRUPO]
