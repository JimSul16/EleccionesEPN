# ADR-005: Modelar los datos en Firestore y autorizar con reglas por rol y pertenencia

**Estado:** Aceptado
**Fecha:** 2026-11-23
**Autor(es) y equipo:** Jimy Lucero San Lucas · Grupo 5
**Requisitos relacionados:** R1 (datos iniciales), R5, R6, R8 (reglas por rol y pertenencia; un veedor no accede a mesas ajenas).

## Contexto
La autorización debe aplicarse en el backend, no ocultando pantallas. Las reglas de Firestore no filtran resultados: una consulta que pueda devolver un documento prohibido se rechaza entera. Además debe haber una sola acta por mesa y dignidad.

## Alternativas consideradas
| Alternativa | A favor | En contra |
|---|---|---|
| **Colecciones planas con IDs deterministas y `recintoId` copiado; reglas con claims + `get()` a la mesa** | Reglas simples y probables; un acta por mesa y dignidad garantizada por el ID; reintentos idempotentes | Datos duplicados (`recintoId` en el acta) |
| Subcolecciones `recintos/{id}/jrv/{id}/actas` | Jerarquía natural | Consultas de colección para el dashboard más complejas; mismas reglas |
| Toda la autorización en Functions | Control total | Pierde la caché offline y el tiempo real del SDK |

## Decisión
- Colecciones: `recintos`, `jrv` (`{recintoId}_{numero}`), `organizaciones`, `candidatos`, `usuarios`, `cedulas` (índice privado), `actas` (`{jrvId}_{dignidad}`), `auditoria`.
- Fotos en Storage: `actas/{recintoId}/{jrvId}/{dignidad}-{uuid}.jpg`; el acta guarda solo la ruta.
- Reglas: el veedor lee mesas con `where('veedorId','==',uid)` y actas por ID; el coordinador solo su recinto; el provincial lee todo y no escribe actas. En el servidor se validan enteros, cuadre de totales, versión `+1` y que no se falsifiquen `registradoPor` ni `recintoId`. Storage: solo JPEG de menos de 2 MB, solo en mesas propias, sin sobrescribir.
- La mesa de un acta se obtiene del ID (`mesaDeActa`), así se puede consultar un acta que aún no existe.

## Consecuencias
- Beneficio: R8 se demuestra con pruebas automáticas.
- Riesgo: las reglas se volvieron complejas. Mitigación: 30 pruebas. Se detectó con la prueba en navegador que leer un acta inexistente fallaba (`resource` nulo) y se corrigió.
- Obligación: cada consulta debe llevar el filtro que exige la regla.

## Verificación
`npm run test:rules` (30 pruebas): el veedor A no lee ni escribe la mesa ni el acta del veedor B; no sube fotos a mesas ajenas; totales que no cuadran, negativos o decimales se rechazan; conflicto de versión; coordinador limitado a su recinto; nadie cambia su rol.

## Uso de IA
Claude Code escribió las reglas y las pruebas. El error de las actas inexistentes no lo previó la IA: apareció probando la app en el navegador contra el emulador.

## Trazabilidad
`41f684c` (reglas y pruebas), `0f4eaed` (lectura por ID y `existsAfter`).

## Consenso del equipo
[COMPLETAR POR EL GRUPO]
