# ADR-006: Manejar el estado con signals y stores por pantalla

**Estado:** Aceptado
**Fecha:** 2026-11-21 (propuesta) · 2026-11-24 (registro)
**Autor(es) y equipo:** Jimy Lucero San Lucas · Grupo 5
**Requisitos relacionados:** R9 (estrategia de manejo de estado; estados explícitos de carga, éxito, error y validación).

## Contexto
Cada pantalla combina datos en tiempo real de Firestore (mesas, actas, veedores) y debe mostrar carga, vacío, error y éxito. La sesión es global. Hay que evitar suscripciones que queden vivas tras cerrar sesión.

## Alternativas consideradas
| Alternativa | A favor | En contra |
|---|---|---|
| **Signals + stores `@Injectable()` provistos por página; sesión en un servicio raíz** | Nativo de Angular 22; poco código; suscripciones atadas a la vida de la página | Hay que cuidar los `effect` |
| NgRx Store | Estado global predecible, devtools | Mucho boilerplate para el plazo |
| Servicios con BehaviorSubject | Conocido | Más manejo manual de suscripciones |

## Decisión
- `AuthService` (raíz): signals `usuario`, `rol`, `autenticado`, `listo`.
- Stores por pantalla (`MisMesasStore`, `MesasRecintoStore`, `ProvincialStore`, `RegistroActaStore`) en `providers` del componente: combinan observables de los repositorios y los exponen con `toSignal`, como unión discriminada `{ estado: 'cargando' | 'error' | 'listo' }`.
- Navegación: rutas por rol con `authGuard`, `primerAccesoGuard`, `rolGuard`, `invitadoGuard`. Los guards solo mejoran la UX; la seguridad está en las reglas.

## Consecuencias
- Beneficio: el estado de carga y error es explícito en cada plantilla (`@let v = store.vista()`).
- Riesgo: un `effect` que lee y escribe el mismo signal entra en bucle. Ocurrió en el dashboard y se corrigió con `untracked`.
- Riesgo: un store en la raíz deja listeners vivos tras el logout; por eso `ProvincialStore` se provee por página.

## Verificación
- `src/app/core/guards.spec.ts` (4 pruebas; fallan con la versión anterior que tenía el bug NG0203).
- Plantillas con estados `cargando`, `error` y `listo` en `features/**`.

## Uso de IA
Claude Code implementó stores y guards. Los dos errores (NG0203 y el bucle del `effect`) los encontró la prueba manual en el navegador; la IA los diagnosticó con la consola y la red, y se agregó una prueba para el primero.

## Trazabilidad
`41f684c` (AuthService, guards), `0f4eaed`, `bccef3f` (guards corregidos), `5bb8bde` (dashboard).

## Consenso del equipo
[COMPLETAR POR EL GRUPO]
