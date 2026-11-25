# Guía de defensa y estudio

## 0. Qué se evalúa (enunciado, secciones 6 a 8)

**Defensa individual: 3 de 20 puntos.**

| Criterio | Puntos | Qué hay que hacer |
|---|---|---|
| Código y funcionamiento | 1,2 | Demostrar la app funcionando y ubicar en el código las implementaciones principales |
| Arquitectura y decisiones | 1,0 | Explicar las capas y justificar las decisiones con sus ADR |
| Uso de IA y límites | 0,8 | Declarar las herramientas, mostrar instrucciones reales, decir qué se aceptó o descartó y demostrar que se entiende, se probó y se puede modificar el código |

El enunciado advierte que una explicación memorizada sin evidencia en el proyecto no suma. Cada respuesta debe ir acompañada de un archivo, una prueba o una pantalla.

**Examen teórico:** jueves 26 de noviembre, de 14:00 a 14:45. Vale el 20 % de la nota; el práctico vale el 80 %.

## 1. Requisitos R1 a R10: qué pide cada uno y dónde está

| Req. | Qué pide | Dónde está | Cómo se demuestra |
|---|---|---|---|
| R1 | Precargar recintos, 5 organizaciones y candidaturas a alcaldía y prefectura | `seed/seed.mjs`: 6 recintos de Quito, 33 JRV, 5 organizaciones, 10 candidaturas | Lista de recintos del provincial |
| R2 | Sin autorregistro; provincial crea coordinadores y coordinador crea veedores; cédula validada; correo de confirmación | `UsuarioRepository.crear` (instancia secundaria de Auth + lote) y reglas de `usuarios` en `firestore.rules`; `sendEmailVerification` | Crear un veedor; prueba de reglas "Alta de cuentas por jerarquía" y `tests/integracion/cuentas.mjs` |
| R3 | Login con cédula, contraseña inicial `Ecuador2026`, cambio obligatorio, recuperación por correo, sin claves administrativas en la app | `core/auth.service.ts`: busca `cedulas/{cédula}`, luego `signInWithEmailAndPassword`; `primerAccesoGuard`; `sendPasswordResetEmail` | Primer login de cualquier cuenta; "¿Olvidó su contraseña?" |
| R4 | Provincial: recintos, coordinador por recinto, avance, GPS y dashboard por candidato, recinto o consolidado | `features/provincial/` y `provincial.store.ts`; `domain/totales.ts` | Recintos, Dashboard, Ubicaciones GPS |
| R5 | Coordinador de recinto: mesas y estados, crear veedores, asignar y reasignar, corregir actas y fotos | `features/recinto/` y `mesas-recinto.store.ts` | Selector de veedor por mesa; "Ver o corregir" |
| R6 | Veedor: solo sus mesas, actas de alcalde y prefecto, totales consistentes, correcciones | `features/veedor/`, `features/actas/`, `domain/acta.rules.ts` | "Faltan N" o "Sobran N" en vivo; corrección con versión 2 |
| R7 | Foto con nitidez comprobada, GPS en el registro, permisos y errores | `data/foto.service.ts`, `domain/nitidez.ts`, `data/ubicacion.service.ts` | Foto movida rechazada; negar el permiso de cámara |
| R8 | Backend justificado por ADR, reglas por rol y pertenencia, datos e imágenes, veedor sin acceso a mesas ajenas | `firestore.rules` y sus 45 pruebas (`tests/rules/reglas.spec.ts`); ADR-018 | `npm run test:rules`, prueba "NO lee la mesa de otro veedor" |
| R9 | Separar presentación, lógica y datos; estrategia de estado; estados de carga, éxito, error y validación | Capas `features/`, `domain/`, `data/`, `core/`; signals (ADR-003, ADR-006) | Spinners, mensajes de error, estados vacíos, aviso de guardado |
| R10 (extra) | Persistencia local, sincronización automática y estrategia de conflictos | Caché persistente de Firestore (`core/firebase.ts`), lote atómico en `ActaRepository.guardar`, versión optimista | Modo avión, registrar, volver a conectar |

## 2. Dónde vive cada validación

La seguridad está en el servidor; la validación del cliente solo ayuda al usuario.

| Validación | Cliente | Servidor (`firestore.rules`) | Prueba |
|---|---|---|---|
| Cédula (módulo 10) | `domain/cedula.validator.ts` | 10 dígitos y cédula única. El módulo 10 solo se valida en la app: riesgo declarado en ADR-018 | `cedula.validator.spec.ts`; regla "NO se repite una cédula ya registrada" |
| Votos + nulos + blancos = total | `domain/acta.rules.ts` (`validarActa`) | `conteoValido` | "rechaza un acta cuyos totales no cuadran" |
| Enteros no negativos | `aEntero` en `acta.rules.ts` | `enteroValido` | Pruebas de votos negativos o decimales |
| Foto nítida | `domain/nitidez.ts` (varianza del Laplaciano, umbral 80) | Colección `fotos`: solo JPEG, tamaño máximo, solo de mesas propias | Foto movida en el teléfono |
| Veedor solo ve sus mesas | Consulta `where('veedorId', '==', uid)` | `jrv`, `actas` y `fotos` comparan `veedorId` con el usuario | "NO lee la mesa de otro veedor" |
| Jerarquía de cuentas | Pantallas por rol y guards | `perfilNuevoValido` y reglas de creación en `usuarios` | Bloque "Alta de cuentas por jerarquía" |
| Contraseña nueva | `domain/usuario.rules.ts` | Firebase Auth; las reglas solo dejan cambiar `debeCambiarPassword` a `false` | Intentar usar `Ecuador2026` como nueva |
| Conflicto de versión | `ActaRepository.guardar` envía `version + 1` | Regla de `update` de `actas` | "corrección: exige version + 1 (detecta conflictos)" |

## 3. Las 5 preguntas orientadoras del enunciado

**1. ¿Cómo se distribuyen las responsabilidades entre interfaz, lógica de negocio y persistencia?**
- `features/`: páginas que solo muestran estado y reciben eventos.
- `*.store.ts`: orquestan cada pantalla con signals.
- `domain/`: reglas puras, sin Angular ni Firebase (validar acta, cédula, nitidez, distancia GPS, totales). Por eso se prueban fácil.
- `data/` y `core/`: único lugar que habla con Firebase y con el teléfono (cámara, GPS, red).

Ninguna página importa Firebase (ADR-003).

**2. ¿Qué ADR determina esta dependencia o patrón y qué alternativas se descartaron?**
Índice en [adr/README.md](adr/README.md). Las que más conviene saber:
- **ADR-001:** Ionic Angular standalone frente a Ionic React.
- **ADR-002 y ADR-018:** Firebase frente a Supabase y Appwrite. Luego Blaze frente a Spark: Blaze pedía 30 USD de tarjeta y se pasó al plan gratuito. Se descartaron Cloudinary y la mezcla Firebase + Supabase.
- **ADR-006:** signals frente a NgRx.
- **ADR-008:** Laplaciano propio frente a OpenCV.js, que agrega varios MB al APK.
- **ADR-017:** suma en el cliente frente a agregaciones en el servidor (estas fallaron en producción).

**3. ¿Dónde se implementa una validación y cómo se comprueba?**
Con la tabla de la sección 2. Mostrar `acta.rules.ts` y su prueba, luego la misma regla en `firestore.rules` (`conteoValido`) y su prueba de reglas.

**4. ¿Qué parte del código fue asistida por IA y cómo se verificó?**
Ver [IA.md](IA.md):
- tres agentes con roles separados;
- seis prompts literales;
- lo aceptado y lo descartado;
- nueve errores, todos encontrados al probar y no por la IA, cada uno con su verificación.

**5. ¿Qué ocurre cuando una operación falla o no hay conectividad?**
- **Errores:** `core/errores.ts` traduce los códigos de Firebase a mensajes claros y deja en la consola los que no reconoce.
- **Sin red:**
  - Firestore guarda el acta, su foto y su auditoría en un solo lote en la caché local (IndexedDB) y lo envía al reconectar.
  - La pantalla dice "Guardada en el teléfono" y el aviso de red muestra "Sincronizando…".
- **Conflicto:** si alguien corrigió el acta mientras tanto, la versión no coincide y las reglas rechazan el lote. Gana lo que ya está en el servidor (ADR-010 y ADR-018).

## 4. Preguntas difíciles probables

- **¿Por qué no Cloud Functions ni Storage?** En 2026 ambos exigen el plan Blaze con tarjeta. Las fotos van en Firestore como JPEG en base64, de menos de 700 KB (el límite de un documento es 1 MiB), y las cuentas se crean desde la app con reglas por jerarquía (ADR-018).
- **¿Cómo crea cuentas el coordinador sin cerrar su propia sesión?** Usa una segunda instancia de Firebase Auth en memoria. El perfil y el índice de cédula se escriben en un lote que las reglas validan. Si el lote falla, se borra la cuenta recién creada.
- **¿Qué riesgos tiene ese diseño?** Pueden quedar cuentas de Auth sin perfil, pero no tienen ningún permiso. Además, quien conozca una cédula exacta puede ver su correo, aunque las cédulas no se pueden listar.
- **¿Por qué el ID del acta es `{jrvId}_{dignidad}`?** Garantiza una sola acta por mesa y dignidad, y hace que reintentar no duplique.
- **"Las reglas no son filtros": ¿qué significa?** Firestore rechaza una consulta completa si podría devolver algo prohibido. Por eso cada consulta lleva el mismo filtro que exige la regla, por ejemplo `veedorId == uid`.
- **¿Por qué la foto va en el mismo lote que el acta?** Es atómico: o se guarda todo o nada. Además funciona sin red sin necesitar una cola propia.
- **¿Cómo se mide la nitidez?** La imagen se reduce a 640 px, se pasa a escala de grises, se aplica el Laplaciano y se calcula la varianza: los bordes nítidos dan valores altos. Con el umbral 80, el teléfono aceptó 3 de 3 fotos nítidas y rechazó 3 de 3 borrosas.
- **¿Por qué falló el dashboard en el teléfono si las pruebas pasaban?** Los emuladores no exigen índices y Firestore real sí. Se cambió a sumar en el cliente las actas que el provincial ya recibe en tiempo real (ADR-017).
- **¿Por qué `inject()` va antes del primer `await`?** Angular solo permite `inject()` dentro de su contexto de inyección, que se pierde después de un `await` (error NG0203).
- **¿Por qué el `effect` usaba `untracked`?** Si un `effect` lee el mismo signal que escribe, se vuelve a ejecutar sin fin.
- **¿Cómo está protegida la clave de administración?** La clave de servicio nunca está en la app ni en git. La app solo lleva la configuración web pública; la protección real son las reglas.
- **¿Cómo se firmó el APK?** Con un keystore fuera del repositorio, cuyas contraseñas se pasan por variables de entorno a Gradle. Está publicado en GitHub Releases v1.0.0.

## 5. Guion de demostración (unos 8 minutos)

Antes: ejecutar `npm run test:rules` una vez y abrir el APK en el teléfono con buena señal.

1. **Veedor** (`1700000027`): login con cédula; solo ve sus 2 mesas. Registrar el acta de alcaldía con un total que no cuadra ("Faltan 5"), corregirlo, tomar una foto movida (rechazada) y luego una nítida, obtener el GPS y guardar ("Acta guardada y sincronizada").
2. **Sin red:** activar modo avión, registrar el acta de prefectura ("Guardada en el teléfono"), desactivar modo avión y ver la sincronización.
3. **Coordinador de recinto** (`1700000019`): estado de las mesas, crear un veedor, reasignar una mesa, corregir un acta (versión 2).
4. **Provincial** (`1712345675`): avance por recinto, dashboard consolidado y por recinto, ubicaciones GPS con la alerta "Lejos del recinto".
5. **Seguridad:** en la terminal, `npm run test:rules`; mostrar "NO lee la mesa de otro veedor".
6. **Código:** abrir `acta.rules.ts` y su equivalente en `firestore.rules`. Si lo piden, cambiar un mensaje en vivo (ver [IA.md](IA.md), sección 7).

## 6. Repaso para el teórico (lo que usa este proyecto)

- **Ionic:** componentes web (`ion-*`), modos `md` e `ios`, theming con variables CSS (`--ion-color-*`), navegación con `ion-router-outlet` y back button.
- **Angular standalone:** componentes sin `NgModule`, `loadComponent` para carga diferida, guards funcionales (`CanActivateFn`), `inject()`.
- **Signals:** `signal`, `computed`, `effect`, `untracked`, `toSignal` para convertir un Observable en signal.
- **Reactive Forms:** `FormGroup`, `FormControl`, validadores síncronos personalizados (cédula, totales).
- **Control de flujo en plantillas:** `@if`, `@for` con `track`, `@switch`, `@let`.
- **Capacitor:** puente entre la web y el sistema nativo; plugins `@capacitor/camera` (`takePhoto`), `@capacitor/geolocation` (`getCurrentPosition`), `@capacitor/network`. Comandos `npx cap sync android` y Gradle `assembleDebug` / `assembleRelease`.
- **Permisos Android:** se piden en tiempo de ejecución. Si el usuario los niega, la app muestra un mensaje y no se cierra.
- **Firebase:** Auth (correo y contraseña, verificación y restablecimiento por correo), Firestore (documentos, colecciones, consultas, lotes, caché offline), reglas de seguridad con `get()` y `getAfter()`, emuladores.
- **Pruebas:** Vitest para unidades, `@firebase/rules-unit-testing` para reglas, Playwright para E2E.
