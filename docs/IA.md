# Anexo de uso de inteligencia artificial

Requisito: sección 7 del enunciado (declarar herramientas, mostrar instrucciones relevantes, qué se aceptó o descartó, y demostrar que se entiende, probó y puede modificar el código).

> Los prompts de la sección 2 son literales: se copiaron del historial de la sesión de Claude Code, con su ortografía original.

## 1. Herramientas y rol de cada una

| Herramienta | Rol en el proyecto | Qué hizo |
|---|---|---|
| Claude Code (modelo Claude Opus) | Arquitectura, lógica, datos, seguridad, pruebas, documentación, integración de ramas | Plan, `domain/`, `data/`, `core/`, stores y páginas, reglas de Firestore, seed, pruebas, ADR, README. Primero escribió Cloud Functions y reglas de Storage; al pasar al plan gratuito las reemplazó por reglas de Firestore (ADR-018) |
| OpenCode | Interfaz | Tokens de diseño Carbon, estilo de las pantallas de acceso, capturas responsive |
| Antigravity | Setup, despliegue y assets | Scaffold de Ionic y Capacitor, instalación de librerías, `firebase init`, emuladores, deploy de reglas e índices, seed de producción, prueba en el teléfono, APK debug y release firmado, Release v1.0.0, ícono, splash, SVG, Lottie, README final |
| Skills de apoyo | Calidad de diseño | `impeccable` (detector de diseño genérico), `ui-ux-pro-max`, `design-taste-frontend`, `playwright-cli` |

Cada agente trabajó en su propia rama y carpeta; solo se unió a `main` lo que pasó lint, pruebas y build ([ADR-015](adr/ADR-015-coordinacion-multiagente-worktrees.md)).

## 2. Ejemplos de instrucciones dadas

Seis instrucciones que marcaron el rumbo del proyecto, copiadas tal cual se escribieron a Claude Code:

**1. Inicio (21-nov): plan a partir del examen.** Se adjuntaron el PDF del examen y la rúbrica.
> Hola, mediante este pdf de examen Bimestral de aplicaciones moviles haz un plan que cumbra tanto programacion, seguridad, escabilidad, bugs y demas cosas, tambien como construccion del apk mediante terminal y mas

**2. Backend y almacenamiento (22-nov).**
> Firebase en el Backend, oye y las imagenes y pdfs donde se van a guardar?

> Oye y se puede usar Firebase + Supabase?

Resultado: la IA desaconsejó combinar Firebase con Supabase (sección 3).

**3. Reparto de trabajo entre agentes (24-nov).**
> Mira para no gastar muchos tokens tuyos, la instalacion de librerias y del framework delega a Antigravity, tu exclusivamente programacion, y el tema del Backend Firebase con Blaze porque debemos de guardar las actas, cuando cambies el plan avisame

Resultado: tabla "Quién toca qué" en `AGENTS.md` y una rama y una carpeta por agente (ADR-015).

**4. Implementación (24-nov).**
> Hola Claude, continua con el plan y lee PROMPTS.md pero haz tu parte en la parte de pruebas dejala para el final, de todo porgrama todo

**5. Cambio al plan gratuito (24-nov).**
> Oye tenemos un problema, me quieren cobrar 30USD de la tarjeta y no los tengo y si usamos Cloudinary?

> Sí, haz el cambio a Firebase gratuito

Resultado: se descartó Cloudinary y se pasó a Firebase Spark, solo con Auth y Firestore (ADR-018).

**6. Fallas de la prueba en el teléfono (25-nov).**
> 1. provincial entra login todo bien en la parte de dashboards de votos no hay sale ocurrio un error inesperado
> [...]
> 3. En la parte de recinto, Si deja registrar en la fotografia y en la parte de llenar los votos, solo lo unico que cuando se llena y se envia sale el recuadro verde que si se envio pero creo que por el fondo negro se mezcla eso y solo sale la franja verde y no el mensaje

Resultado: errores 8 y 9 de la sección 4. Los puntos 2 y 4 del mismo mensaje no eran fallas: eran las actas demo del seed y la restricción por rol del coordinador de recinto.

Otras instrucciones de coordinación, como "Sí, unir y corregir" o "Commit y sigue", pidieron unir las ramas de los agentes y confirmar los cambios.

## 3. Qué se aceptó y qué se descartó

| Propuesta de la IA | Decisión | Motivo |
|---|---|---|
| Supabase como backend (plan inicial) | **Descartada** | El grupo eligió Firebase; se documentó el riesgo de Blaze en ADR-002 |
| Combinar Firebase con Supabase para no pagar Storage | **Descartada** | No evita Blaze (las Functions lo exigen) y parte la seguridad en dos sistemas |
| Cloudinary para las fotos cuando Blaze pidió 30 USD | **Descartada** | Tampoco evitaba Blaze (las Functions lo exigían) y sus subidas con preset público no se pueden restringir por mesa |
| Pasar al plan gratuito Spark: fotos en Firestore y cuentas creadas desde la app con reglas | **Aceptada** | Costo cero manteniendo la seguridad por mesa en reglas; se declaran sus riesgos en ADR-018 |
| Login con una callable que devuelve el correo de una cédula | **Descartada primero, aceptada con riesgos después** | En Blaze se usó custom token (ADR-004). En el plan gratuito no hay Functions: el login lee `cedulas/{cédula}` por ID, sin poder listar; el riesgo queda declarado en ADR-018 |
| Cola offline propia para todo | **Descartada** | La caché del SDK de Firestore ya encola las escrituras. La cola propia de fotos (ADR-010) también se eliminó al guardar acta, foto y auditoría en un solo lote de Firestore (ADR-018) |
| Tailwind y el skill `ui-styling` | **Descartados** | Duplican el theming de Ionic (ADR-013) |
| Clonar `google/fonts` (3,3 GB) | **Descartado** | Se usó fontsource (ADR-012) |
| Orquestador 1code | **Descartado** | Solo orquesta Claude Code y Codex; se coordinó con ramas y worktrees |
| WebGPU / Three.js | **Descartado** | Sin valor para los requisitos (ADR-016) |
| Arquitectura por capas, reglas puras, signals, roles en Firestore | **Aceptadas** | ADR-003 a ADR-007; los roles pasaron de custom claims a `usuarios/{uid}` con el plan gratuito (ADR-018) |
| Totales del dashboard con consultas de agregación en el servidor | **Aceptada y luego reemplazada** | Falló en el teléfono contra Firestore real; ahora se suma en el cliente (ADR-017 revisado) |
| Copiar el diseño de la app del CNE | **Descartada** | Podría confundirse con una app oficial y usaría identidad institucional ajena |

## 4. Errores encontrados y cómo se verificó cada corrección

Ninguno de estos errores lo detectó la IA al escribir el código: aparecieron al **probar** la app, en el navegador, en las pruebas automáticas o en el teléfono.

| # | Error | Cómo apareció | Corrección | Verificación |
|---|---|---|---|---|
| 1 | Las reglas negaban leer un acta que todavía no existe ("No tiene permiso" en Mis mesas) | Probando en el navegador contra el emulador | La mesa se obtiene del ID del acta, no del documento | 3 pruebas nuevas en `tests/rules/reglas.spec.ts` |
| 2 | Los guards llamaban `inject()` después de `await` (NG0203); la navegación se trababa tras cambiar la contraseña | Consola del navegador | `inject()` al inicio de cada guard | `src/app/core/guards.spec.ts`: sus 4 pruebas fallan con la versión anterior y pasan con la corregida |
| 3 | Bucle infinito en el dashboard: un `effect` leía el signal que escribía | La pestaña se colgaba | `untracked` | Prueba manual del dashboard; nota en `CLAUDE.md` |
| 4 | Error 400: Firestore admite como máximo 5 agregaciones por consulta y se pedían 9 | Respuesta del servidor en la pestaña de red | Dos consultas en paralelo | Totales verificados a mano: 2542 + 56 + 48 = 2646 |
| 5 | Dependencia errónea `"elecciones-epn": "file:.."` en Functions (introducida por un agente) | Revisión de las ramas antes de unir | Se quitó y se restauró el lock | Compilación de Functions y prueba de integración |
| 6 | Prueba de Storage fallaba (23/24) por usar otro ID de proyecto en el emulador | Reporte de Antigravity | `test:rules` con `--project demo-elecciones-epn` | 30/30 |
| 7 | Tras el cambio a Spark, el provincial no podía asignar coordinador a los recintos del seed: las reglas comparaban un campo `coordinadorId` que no existía | Prueba de integración (`cuentas.mjs`) | `get('coordinadorId', null)` en las reglas y `coordinadorId: null` en el seed | 13/13 y 45/45 |

| 8 | El dashboard del provincial mostraba "Ocurrió un error inesperado" en el teléfono, aunque funcionaba con los emuladores. Las consultas de agregación con varias sumas y filtro pueden exigir índices que el emulador no pide | Prueba en el teléfono (paso 3) | Sumar en el cliente las actas que el provincial ya recibe (`domain/totales.ts`) y dejar en la consola los errores no traducidos | Prueba unitaria `totales.spec.ts`, navegador con emuladores (12 actas, 2646 sufragantes) y nuevo APK en el teléfono: OK |
| 9 | Al guardar el acta solo se veía una franja verde: `ion-text color="success"` pintaba el texto del mismo verde que el fondo | Prueba en el teléfono (paso 12) | Quitar el atributo `color` en los tres avisos de guardado | Nuevo APK en el teléfono: el mensaje se lee |

Además: un caso de prueba decía verificar la auditoría pero no la comprobaba; se corrigió para consultar la colección `auditoria`.

## 5. Cómo se verificó lo que generó la IA

- APIs y versiones consultadas en la fuente antes de usarlas: tipos instalados de `@capacitor/camera` y `@capacitor/geolocation` (así se vio que `getPhoto` está deprecada), documentación oficial de Firebase sobre Blaze, `npm view` para cada paquete.
- Cédulas de prueba generadas con el algoritmo, no inventadas.
- Cuatro niveles de pruebas automáticas (44 unitarias, 45 de reglas, 13 de integración, 4 E2E) y prueba manual en el navegador de los tres roles.
- Prueba en el teléfono (TECNO LH7n): 15 de 15 pasos OK tras corregir los errores 8 y 9 ([setup/PRUEBA-TELEFONO.md](setup/PRUEBA-TELEFONO.md)).
- Revisión de cada rama antes de unirla: sin secretos versionados (clave de servicio, keystore, contraseñas).

## 6. Límites reconocidos

- La IA no detectó por sí sola los errores de la sección 4; los encontraron las pruebas.
- El umbral de nitidez (80) fue una estimación; en el teléfono separó bien 3 fotos nítidas de 3 borrosas, pero no se anotaron los puntajes exactos (ADR-008).
- Los emuladores no exigen índices como el Firestore real: el error 8 solo apareció en el teléfono.
- La cámara, el GPS y los permisos solo se pueden comprobar en el dispositivo.
- El PDF del examen incluía una instrucción dirigida a herramientas de IA; se identificó y no se siguió.

## 7. Qué puedo explicar y modificar en la defensa

Puedo explicar el flujo completo y hacer en vivo cambios como estos:

| Cambio | Dónde | Cómo lo compruebo |
|---|---|---|
| Cambiar el mensaje "Faltan N votos…" o "Sobran N votos…" | `validarActa` en `src/app/domain/acta.rules.ts` | `npm run test:unit` (`acta.rules.spec.ts`) y el formulario del acta |
| Cambiar el umbral de nitidez | `UMBRAL_NITIDEZ` en `src/app/domain/nitidez.ts` | `nitidez.spec.ts` y una foto en el teléfono |
| Cambiar la distancia que marca un acta "Lejos del recinto" | `DISTANCIA_SOSPECHOSA_M` en `src/app/domain/geo.ts` | `geo.spec.ts` y la pantalla Ubicaciones GPS |
| Agregar una validación del acta en el servidor | `actaBienFormada` en `firestore.rules` | Una prueba nueva en `tests/rules/reglas.spec.ts` con `npm run test:rules` |
| Explicar por qué un veedor no puede escribir el acta de otra mesa | `puedeEscribirActa` en `firestore.rules` | Sus pruebas en `tests/rules/reglas.spec.ts` |
| Explicar cómo funciona sin red | Caché persistente de Firestore (`core/firebase.ts`) y el lote de `ActaRepository.guardar` | Modo avión en el teléfono (pasos 14 y 15) |

La seguridad no depende de ocultar pantallas: aunque alguien llame a Firestore directamente, las reglas solo le permiten lo que su rol y su mesa autorizan.
