# ADR-014: Usar SVG y CSS para los estados, y dotLottie solo en momentos puntuales

**Estado:** Aceptado
**Fecha:** 2026-11-21
**Autor(es) y equipo:** Jimy Lucero San Lucas · Grupo 5
**Requisitos relacionados:** R9 (estados explícitos de carga, éxito, error y vacío).

## Contexto
Los estados vacíos, de error y sin conexión necesitan apoyo visual. La app corre en teléfonos de gama media y el APK debe ser liviano.

## Alternativas consideradas
| Alternativa | A favor | En contra |
|---|---|---|
| **SVG + transiciones CSS; dotLottie (< 150 KB) solo para "sincronizando" y "acta guardada"** | Liviano; respeta "reducir movimiento" | Animaciones más simples |
| `lottie-web` para todo | Animaciones ricas | Más peso y CPU |
| GIF o MP4 | Fácil | Pesados, sin modo oscuro |
| Sin animación | Cero costo | Menos feedback |

## Decisión
SVG de estados en `src/assets/svg/` (usan `currentColor`), dotLottie en `src/assets/lottie/`, tokens de movimiento y regla `prefers-reduced-motion` en `src/theme/motion.scss`, importado desde `variables.scss`. Presupuesto total de `src/assets` menor a 1 MB, registrado en `src/assets/MANIFEST.md`.

## Consecuencias
- Riesgo: `motion.scss` quedó sin importar al principio; se conectó en `f7bce52`.
- Pendiente: los Lottie no se reproducen todavía en la app (requiere un reproductor; los SVG cubren los estados).

## Verificación
`src/assets/MANIFEST.md` (pesos y orígenes); el CSS final contiene `--app-motion-duration-fast`.

## Uso de IA
Antigravity generó los assets; Claude Code detectó que `motion.scss` no estaba conectado.

## Trazabilidad
`d8dfa5e`, `104c97a`, `f7bce52`.

## Consenso del equipo
[COMPLETAR POR EL GRUPO]
