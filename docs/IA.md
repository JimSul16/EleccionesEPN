# Anexo de uso de inteligencia artificial

Requisito: sección 7 del enunciado (declarar herramientas, mostrar instrucciones relevantes, qué se aceptó o descartó, y demostrar que se entiende, probó y puede modificar el código).

> **Para completar por el autor:** donde dice **[AGREGAR PROMPT LITERAL]**, pega el texto exacto que escribiste. Revisa cada sección y corrige lo que no refleje tu experiencia.

## 1. Herramientas y rol de cada una

| Herramienta | Rol en el proyecto | Qué hizo |
|---|---|---|
| Claude Code (modelo Claude Opus) | Arquitectura, lógica, datos, seguridad, pruebas, documentación | Plan, `domain/`, `data/`, `core/`, stores y páginas, reglas de Firestore y Storage, Cloud Functions (luego reemplazadas por el plan gratuito, ADR-018), seed, pruebas, ADR, README |
| OpenCode | Interfaz | Tokens de diseño Carbon, estilo de las pantallas de acceso, capturas responsive |
| Antigravity | Setup y assets | Scaffold de Ionic y Capacitor, instalación de librerías, `firebase init`, emuladores, APK, ícono, splash, SVG, Lottie |
| Skills de apoyo | Calidad de diseño | `impeccable` (detector de diseño genérico), `ui-ux-pro-max`, `design-taste-frontend`, `playwright-cli` |

Cada agente trabajó en su propia rama y carpeta; solo se unió a `main` lo que pasó lint, pruebas y build ([ADR-015](adr/ADR-015-coordinacion-multiagente-worktrees.md)).

## 2. Ejemplos de instrucciones dadas

| Momento | Instrucción (resumen) | Literal |
|---|---|---|
| Inicio | Pedir un plan a partir del PDF del examen que cubra programación, seguridad, escalabilidad, bugs y la construcción del APK por terminal | [AGREGAR PROMPT LITERAL] |
| Backend | Cambiar a Firebase con Blaze "porque debemos guardar las actas"; preguntar si se puede combinar Firebase con Supabase | [AGREGAR PROMPT LITERAL] |
| Reparto | Delegar instalaciones y framework a Antigravity y dejar a Claude solo programación | [AGREGAR PROMPT LITERAL] |
| Implementación | "Continúa con el plan… programa todo, deja las pruebas al final" | [AGREGAR PROMPT LITERAL] |
| Integración | Unir las ramas de los tres agentes y corregir los problemas encontrados | [AGREGAR PROMPT LITERAL] |

## 3. Qué se aceptó y qué se descartó

| Propuesta de la IA | Decisión | Motivo |
|---|---|---|
| Supabase como backend (plan inicial) | **Descartada** | El grupo eligió Firebase; se documentó el riesgo de Blaze en ADR-002 |
| Combinar Firebase con Supabase para no pagar Storage | **Descartada** | No evita Blaze (las Functions lo exigen) y parte la seguridad en dos sistemas |
| Cloudinary para las fotos cuando Blaze pidió 30 USD | **Descartada** | Tampoco evitaba Blaze (las Functions lo exigían) y sus subidas con preset público no se pueden restringir por mesa |
| Pasar al plan gratuito Spark: fotos en Firestore y cuentas creadas desde la app con reglas | **Aceptada** | Costo cero manteniendo la seguridad por mesa en reglas; se declaran sus riesgos en ADR-018 |
| Login con una callable que devuelve el correo de una cédula | **Descartada** | Permite enumerar cédulas y correos; se usó custom token (ADR-004) |
| Cola offline propia para todo | **Descartada** | La caché del SDK de Firestore ya encola las escrituras; solo las fotos necesitan cola (ADR-010) |
| Tailwind y el skill `ui-styling` | **Descartados** | Duplican el theming de Ionic (ADR-013) |
| Clonar `google/fonts` (3,3 GB) | **Descartado** | Se usó fontsource (ADR-012) |
| Orquestador 1code | **Descartado** | Solo orquesta Claude Code y Codex; se coordinó con ramas y worktrees |
| WebGPU / Three.js | **Descartado** | Sin valor para los requisitos (ADR-016) |
| Arquitectura por capas, reglas puras, signals, custom claims | **Aceptadas** | ADR-003 a ADR-007 |

## 4. Errores encontrados y cómo se verificó cada corrección

Ninguno de estos errores lo detectó la IA al escribir el código: aparecieron al **probar** la app.

| # | Error | Cómo apareció | Corrección | Verificación |
|---|---|---|---|---|
| 1 | Las reglas negaban leer un acta que todavía no existe ("No tiene permiso" en Mis mesas) | Probando en el navegador contra el emulador | La mesa se obtiene del ID del acta, no del documento | 3 pruebas nuevas en `tests/rules/reglas.spec.ts` |
| 2 | Los guards llamaban `inject()` después de `await` (NG0203); la navegación se trababa tras cambiar la contraseña | Consola del navegador | `inject()` al inicio de cada guard | `src/app/core/guards.spec.ts`: sus 4 pruebas fallan con la versión anterior y pasan con la corregida |
| 3 | Bucle infinito en el dashboard: un `effect` leía el signal que escribía | La pestaña se colgaba | `untracked` | Prueba manual del dashboard; nota en `CLAUDE.md` |
| 4 | Error 400: Firestore admite como máximo 5 agregaciones por consulta y se pedían 9 | Respuesta del servidor en la pestaña de red | Dos consultas en paralelo | Totales verificados a mano: 2542 + 56 + 48 = 2646 |
| 5 | Dependencia errónea `"elecciones-epn": "file:.."` en Functions (introducida por un agente) | Revisión de las ramas antes de unir | Se quitó y se restauró el lock | Compilación de Functions y prueba de integración |
| 6 | Prueba de Storage fallaba (23/24) por usar otro ID de proyecto en el emulador | Reporte de Antigravity | `test:rules` con `--project demo-elecciones-epn` | 30/30 |
| 7 | Tras el cambio a Spark, el provincial no podía asignar coordinador a los recintos del seed: las reglas comparaban un campo `coordinadorId` que no existía | Prueba de integración (`cuentas.mjs`) | `get('coordinadorId', null)` en las reglas y `coordinadorId: null` en el seed | 13/13 y 45/45 |

Además: un caso de prueba decía verificar la auditoría pero no la comprobaba; se corrigió para consultar la colección `auditoria`.

## 5. Cómo se verificó lo que generó la IA

- APIs y versiones consultadas en la fuente antes de usarlas: tipos instalados de `@capacitor/camera` y `@capacitor/geolocation` (así se vio que `getPhoto` está deprecada), documentación oficial de Firebase sobre Blaze, `npm view` para cada paquete.
- Cédulas de prueba generadas con el algoritmo, no inventadas.
- Cuatro niveles de pruebas automáticas (41 unitarias, 45 de reglas, 13 de integración, 4 E2E) y prueba manual en el navegador de los tres roles.
- Prueba en el teléfono: [setup/PRUEBA-TELEFONO.md](setup/PRUEBA-TELEFONO.md).

## 6. Límites reconocidos

- La IA no detectó por sí sola los errores de la sección 4; los encontraron las pruebas.
- El umbral de nitidez se calibra con fotos reales del teléfono de la demo; el valor inicial fue una estimación.
- La cámara, el GPS y los permisos solo se pueden comprobar en el dispositivo.
- El PDF del examen incluía una instrucción dirigida a herramientas de IA; se identificó y no se siguió.

## 7. Qué puedo explicar y modificar en la defensa

[COMPLETAR POR EL AUTOR: por ejemplo, cambiar el mensaje de "Faltan N" en `acta.rules.ts`, agregar una regla de validación en `firestore.rules` y su prueba, o cambiar el umbral de nitidez.]
