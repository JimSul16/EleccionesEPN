# ADR-009: Probar contra los emuladores de Firebase y traducir los errores para el usuario

**Estado:** Aceptado
**Fecha:** 2026-11-23
**Autor(es) y equipo:** Jimy Lucero San Lucas · Grupo 5
**Requisitos relacionados:** R8 (demostrar que un veedor no accede a mesas ajenas), R9 (estados de error), entregable "pruebas" del README.

## Contexto
La seguridad vive en reglas y Functions; hay que probarlas sin tocar producción ni gastar cuota. La defensa pide mostrar dónde se valida y cómo se comprueba.

## Alternativas consideradas
| Alternativa | A favor | En contra |
|---|---|---|
| **Tres niveles: unitarias (Vitest), reglas (`@firebase/rules-unit-testing` + emulador), integración de Functions (SDK cliente + emuladores)** | Cubre lo que importa sin producción; repetible | Requiere Java y emuladores |
| Probar solo a mano en el teléfono | Realista | No repetible ni demostrable en la defensa |
| Probar contra el proyecto real | Entorno real | Costo, datos sucios, riesgo |

## Decisión
- `npm run test:unit`: `domain/` y guards (41 pruebas).
- `npm run test:rules`: 30 pruebas de reglas con el proyecto `demo-elecciones-epn`.
- `tests/integracion/cuentas.mjs`: 13 casos de cuentas y acceso.
- Errores: `core/errores.ts` traduce códigos de Firebase a mensajes; los de las Functions ya vienen en español. Los errores de red ofrecen reintento.

## Consecuencias
- Beneficio: cada bug encontrado se cubrió con una prueba (guards, lectura de actas inexistentes).
- Riesgo: en esta PC el emulador de Firestore no arranca por el espacio en la ruta de TEMP. Mitigación: `JAVA_TOOL_OPTIONS=-Djdk.net.unixdomain.tmpdir=C:\Users\Public` (documentado en `docs/setup/EMULADORES.md`).
- Riesgo: usar un ID de proyecto distinto entre emulador y prueba hace fallar la regla cruzada de Storage; por eso `test:rules` fija `--project demo-elecciones-epn`.

## Verificación
Los tres comandos anteriores, en verde al 23-nov sobre `main`.

## Uso de IA
Claude Code escribió las pruebas; un caso inicialmente prometía verificar la auditoría sin comprobarla y se corrigió para consultar la colección `auditoria`. Antigravity reportó un falso fallo de Storage que resultó ser el ID de proyecto.

## Trazabilidad
`41f684c`, `0f4eaed`, `6d4bd21` (script `test:rules` corregido).

## Consenso del equipo
[COMPLETAR POR EL GRUPO]
