# ADR-003: Separar la app en capas core, domain, data y features

**Estado:** Aceptado
**Fecha:** 2026-11-21 (propuesta) · 2026-11-24 (registro)
**Autor(es) y equipo:** Jimy Lucero San Lucas · Grupo 5
**Requisitos relacionados:** R9 (separar presentación, lógica de negocio y acceso a datos).

## Contexto
La defensa pregunta cómo se distribuyen responsabilidades entre interfaz, lógica y persistencia. Las reglas de negocio (cédula, cuadre de actas, nitidez) deben poder probarse sin Angular ni Firebase, y las pantallas no deben conocer el backend.

## Alternativas consideradas
| Alternativa | A favor | En contra |
|---|---|---|
| **Capas: core / domain / data / features (+ stores por pantalla)** | Reglas puras testeables; un único lugar que importa Firebase; páginas delgadas | Más archivos |
| Páginas que llaman a Firebase directamente | Menos código | Lógica duplicada, imposible de probar sin backend, acopla la UI a Firebase |
| Feature modules con NgRx | Escala bien | Sobredimensionado para el plazo; más boilerplate |

## Decisión
- `domain/`: modelos y funciones puras (`cedula.validator.ts`, `acta.rules.ts`, `nitidez.ts`, `geo.ts`, `usuario.rules.ts`). Sin Angular ni Firebase (salvo el adaptador `form-validators.ts`, que solo depende de `@angular/forms`).
- `data/`: repositorios y servicios de dispositivo. Única capa que importa el SDK de Firebase o los plugins de Capacitor.
- `core/`: inicialización de Firebase, sesión (`AuthService`), guards y traducción de errores.
- `features/`: páginas por rol y sus stores (`*.store.ts`), que orquestan repositorios y exponen signals.
Regla: una página nunca importa `firebase/*`.

## Consecuencias
- Beneficio: 41 pruebas unitarias corren sin emuladores.
- Beneficio: la misma regla de cuadre se usa en el formulario y se replica en `firestore.rules`.
- Riesgo: la lógica de validación existe dos veces (cliente y servidor: `functions/src/shared/validaciones.ts`, `firestore.rules`). Mitigación: comentarios cruzados en ambos archivos y pruebas en los dos lados.

## Verificación
- `grep -rn "from 'firebase" src/app/features` no devuelve resultados.
- `npm run test:unit` (pruebas de `domain/` y guards).

## Uso de IA
Claude Code propuso la estructura en el plan y la implementó. Se verificó con el grep anterior y con las pruebas.

## Trazabilidad
Propuesta: `docs/PLAN.md` sección 2 (`9217378`). Implementación: `41f684c` (domain, core), `0f4eaed` (data, stores).

## Consenso del equipo
[COMPLETAR POR EL GRUPO]
