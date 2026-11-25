# Registro de decisiones de arquitectura (ADR)

Plantilla: Anexo A del enunciado. Un archivo por decisión. Una decisión aceptada no se reescribe: se reemplaza con un ADR nuevo.

Las propuestas se registraron en [docs/PLAN.md](../PLAN.md) y [docs/PLAN-AGENTES.md](../PLAN-AGENTES.md) antes de implementar (commit `9217378`, previo al primer commit de código `41f684c`). Los campos marcados **[COMPLETAR POR EL GRUPO]** dependen de la reunión grabada.

| ADR | Decisión | Requisitos |
|---|---|---|
| [001](ADR-001-ionic-angular-standalone.md) | Ionic Angular standalone | R9, condiciones técnicas |
| [002](ADR-002-backend-firebase-blaze.md) | Firebase en plan Blaze (**reemplazado por 018**) | R8 |
| [003](ADR-003-arquitectura-por-capas.md) | Capas core / domain / data / features | R9 |
| [004](ADR-004-autenticacion-cedula-claims-functions.md) | Login por cédula, custom claims y Cloud Functions (**reemplazado por 018**) | R2, R3 |
| [005](ADR-005-modelo-firestore-y-reglas.md) | Modelo Firestore + Storage y reglas por rol y pertenencia | R1, R8 |
| [006](ADR-006-estado-signals-y-navegacion.md) | Estado con signals y stores por pantalla; guards | R9 |
| [007](ADR-007-validacion-formularios-y-reglas-de-acta.md) | Reactive Forms + reglas puras validadas también en servidor | R2, R6 |
| [008](ADR-008-plugins-capacitor-camara-gps-nitidez.md) | Plugins Capacitor de cámara y GPS; nitidez por Laplaciano | R7 |
| [009](ADR-009-pruebas-emulador-y-errores.md) | Pruebas con emuladores y manejo de errores | R8, R9 |
| [010](ADR-010-offline-cache-y-cola-de-fotos.md) | Offline: caché Firestore, cola de fotos, conflictos por versión | R10 |
| [011](ADR-011-sistema-diseno-carbon.md) | Sistema de diseño IBM Carbon adaptado a móvil | R9 (UX) |
| [012](ADR-012-tipografia-plex-fontsource.md) | IBM Plex empaquetada con fontsource | R9, R10 |
| [013](ADR-013-estilos-ionic-css-vars-scss.md) | Variables CSS de Ionic + SCSS, sin Tailwind | R9 |
| [014](ADR-014-motion-y-assets.md) | SVG + CSS; dotLottie solo en estados puntuales | R9 |
| [015](ADR-015-coordinacion-multiagente-worktrees.md) | Coordinación de agentes de IA con ramas y worktrees | Uso de IA |
| [016](ADR-016-sin-webgpu.md) | No usar WebGPU / Three.js | R9 |
| [017](ADR-017-graficos-dashboard-chartjs.md) | Chart.js con color neutro y tabla accesible | R4 |
| [018](ADR-018-firebase-spark-sin-functions.md) | **Firebase gratuito (Spark): sin Functions ni Storage**; reemplaza 002 y 004 | R2, R3, R7, R8, R10 |
