# ADR-007: Validar con Reactive Forms sobre reglas puras, repetidas en el servidor

**Estado:** Aceptado
**Fecha:** 2026-11-23
**Autor(es) y equipo:** Jimy Lucero San Lucas · Grupo 5
**Requisitos relacionados:** R2 (cédula ecuatoriana validada), R3 (política de contraseña), R6 (consistencia de totales del acta).

## Contexto
La validación en el cliente da feedback inmediato pero se puede saltar. Los inputs numéricos entregan texto, lo que puede producir sumas por concatenación ("10" + "5").

## Alternativas consideradas
| Alternativa | A favor | En contra |
|---|---|---|
| **Funciones puras en `domain/` + adaptadores a Reactive Forms + misma regla en el servidor** | Una lógica, probada; feedback en vivo; no se puede saltar | Regla escrita dos veces (TS y reglas/Functions) |
| Validadores solo en la plantilla (template-driven) | Rápido | No testeable aislado; sin validación en servidor |
| Solo validación en servidor | Una sola fuente | Mala UX: el error llega al guardar |

## Decisión
- Cédula: módulo 10, provincia 01-24 o 30, tercer dígito menor que 6; en `cedula.validator.ts` y en `functions/src/shared/validaciones.ts`.
- Acta: cada campo entero, no negativo y hasta 100 000; suma de votos + nulos + blancos igual al total; mensaje "Faltan N" o "Sobran N". En `acta.rules.ts` y en `firestore.rules` (`conteoValido`). `aEntero()` convierte los valores de los inputs antes de sumar.
- Contraseña: mínimo 8, mayúscula, minúscula, número y distinta de la inicial; en cliente y en `cambiarPassword`.

## Consecuencias
- Beneficio: el botón Guardar se habilita solo si el acta cuadra y hay foto y GPS.
- Riesgo: que las dos copias diverjan. Mitigación: comentarios cruzados y pruebas en ambos lados.

## Verificación
- `cedula.validator.spec.ts`, `acta.rules.spec.ts`, `models.spec.ts` (`npm run test:unit`).
- `tests/rules/reglas.spec.ts`: el servidor rechaza actas que no cuadran, negativos y decimales.
- `tests/integracion/cuentas.mjs`: cédula inválida rechazada por la Function.

## Uso de IA
Claude Code generó las reglas y las pruebas; las cédulas válidas de prueba se calcularon con el algoritmo (no se inventaron) y se verificaron con los tests.

## Trazabilidad
`41f684c`, `0f4eaed` (formulario de acta).

## Consenso del equipo
[COMPLETAR POR EL GRUPO]
