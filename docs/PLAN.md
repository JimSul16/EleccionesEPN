# Plan de trabajo: Control Electoral (Prueba 2, Ionic + Capacitor + Firebase)

Plazo duro: **miércoles 25-nov-2026, 14:00 (Ecuador)**. No hay entregas tardías.
Revisión: lunes 23-nov. Backend acordado: **Firebase con plan Blaze** (hace falta guardar las fotos de las actas).
Reparto: **Antigravity** instala el framework y las librerías, configura Firebase y genera el APK. **Claude Code** solo programa. Ver [PLAN-AGENTES.md](PLAN-AGENTES.md).
Congelar el código el miércoles a las 11:00.

---

## 0. Dónde están los puntos (rúbrica, 20 pts de práctica)

| Bloque | Pts | Prioridad |
|---|---|---|
| Veedor, actas y validaciones (R6, R7) | 4,2 | 1 |
| Acceso, autenticación y roles (R2, R3) | 2,2 | 2 |
| Coordinador de recinto (R5) | 2,0 | 3 |
| Coordinador provincial y dashboard (R4) | 2,0 | 3 |
| Arquitectura y seguridad (R8, R9) | 1,8 | transversal |
| UX: navegación, validaciones, carga/error (R9) | 1,0 | transversal |
| Entrega, README, APK | 0,8 | **sin APK = -4,2** |
| ADR grupal + video + coevaluación | 3,0 | grupo |
| Defensa (código, arquitectura, IA) | 3,0 | miércoles/jueves |
| Extra offline (R10) | +2,1 | Firestore ya trae caché offline; ver sección 7 |

Regla de oro: el APK se genera **hoy** y se regenera cada día.

---

## 1. Línea base tecnológica

| Decisión | Elegido | Alternativa descartada | Por qué |
|---|---|---|---|
| Framework | **Ionic Angular standalone** | Ionic React | Inyección de dependencias para separar capas, guards y Reactive Forms |
| Backend | **Firebase (Auth, Firestore, Storage, Cloud Functions) en plan Blaze** | Supabase; Firebase + Supabase | Un solo proveedor para datos, fotos y reglas; caché offline incluida en Firestore. La mezcla no evita Blaze y parte la seguridad en dos |
| Estado | **Signals de Angular + servicios store** | NgRx | Suficiente y fácil de defender |
| Formularios | Reactive Forms + validadores puros en `domain/` | Template-driven | Validadores testeables |
| Plugins | `@capacitor/camera`, `@capacitor/geolocation`, `@capacitor/network` | Cordova | Oficiales |

Versiones en npm (23-nov): `firebase` 13.4.0, `firebase-admin` 14.5.1, `firebase-functions` 7.4.0, `firebase-tools` 15.37.0, `@firebase/rules-unit-testing` 6.0.0, `@capacitor/camera` 8.2.6, `@capacitor/geolocation` 8.2.5, `@capacitor/network` 8.0.1.

### Condiciones de Blaze (verificadas en la documentación de Firebase)
- Desde el 3-feb-2026, Cloud Storage y Cloud Functions exigen Blaze.
- Cuota sin costo de Storage: 5 GB almacenados, 100 GB/mes de descarga, 5K subidas/mes y 50K descargas/mes, **solo con el bucket en us-central1, us-east1 o us-west1**.
- Se crea una alerta de presupuesto de 1 USD. Solo avisa por correo, no detiene el servicio.
- Todo en **us-central1**: el bucket, las Functions y Firestore (si la consola lo ofrece; si no, la región multi `nam5`).
- Este es el **riesgo de la opción elegida** que va en el ADR-002.

---

## 2. Arquitectura por capas (R9)

```
src/app/
  core/       firebase.ts (init), AuthService, guards (auth, rol, primer-acceso), ErrorHandler
  domain/     modelos, enums (Rol, Dignidad, EstadoActa), cedula.validator.ts, acta.rules.ts, nitidez.ts
  data/       repositorios: RecintoRepo, JrvRepo, ActaRepo, UsuarioRepo, FotoRepo (Storage)
              offline/: cola-fotos.service.ts (R10)
  features/   auth/, provincial/, recinto/, veedor/
  shared/ui/  componentes de presentación (state-view, chips, inputs)
functions/    Cloud Functions (TypeScript): crearUsuario, loginCedula, recuperarPassword, auditoría
firestore.rules  storage.rules  firestore.indexes.json  firebase.json
tests/rules/  pruebas de reglas con el emulador
seed/         script de seed R1 (Admin SDK contra el emulador o el proyecto)
```

Reglas: las páginas no llaman a Firebase directamente, solo a stores. Los repositorios son la única capa que importa el SDK de Firebase. La lógica vive en funciones puras con tests.

---

## 3. Modelo de datos (Firestore + Storage)

| Colección | Documento | Campos |
|---|---|---|
| `recintos` | auto | provincia, canton, parroquia, nombre, numJrv, lat, lng, coordinadorId |
| `jrv` | `{recintoId}_{numero}` | recintoId, numero, veedorId (null), estado |
| `organizaciones` | `o1..o5` | nombre, siglas, lista |
| `candidatos` | auto | organizacionId, dignidad (`ALCALDE` o `PREFECTO`), nombre |
| `usuarios` | `{uid}` | cedula, nombres, apellidos, telefono, email, rol, recintoId, debeCambiarPassword, creadoPor |
| `cedulas` | `{cedula}` | uid (índice único; solo lo escriben las Functions) |
| `actas` | `{jrvId}_{dignidad}` | jrvId, recintoId, dignidad, votos `{o1..o5}`, nulos, blancos, totalSufragantes, fotoPath, lat, lng, precisionM, estado, version, registradoPor, updatedBy, timestamps |
| `auditoria` | auto | actaId, usuario, antes, despues, fecha (la escribe una Function trigger) |

- El ID determinista `{jrvId}_{dignidad}` garantiza **un acta por mesa y dignidad**, y que reintentar sea idempotente.
- `recintoId` va copiado en el acta para que las reglas no tengan que hacer lecturas extra.
- **Fotos en Storage**: `actas/{recintoId}/{jrvId}/{dignidad}-{uuid}.jpg`. El acta guarda `fotoPath`, nunca la imagen.
- **PDFs** (opcional, no lo pide el examen): `reportes/{recintoId}/...`.
- Dashboard: consultas de agregación de Firestore (`sum`, `count`) por candidato y dignidad, con filtro de recinto o consolidado. Si escala, una Function trigger mantiene `resumenes/{recintoId}` con incrementos.
- Índices compuestos en `firestore.indexes.json`, por ejemplo `jrv(recintoId, numero)`, `jrv(veedorId)`, `actas(recintoId, dignidad)`.

---

## 4. Seguridad (R2, R3, R8)

1. **Sin claves administrativas en la app.** La config web de Firebase (apiKey, projectId) es pública por diseño. La cuenta de servicio y los secretos (SMTP) solo viven en Functions (`defineSecret`). `.env` en `.gitignore`.
2. **Roles con custom claims.** La Function `crearUsuario` (callable):
   - lee `request.auth.token.rol` del que llama;
   - permite PROVINCIAL -> RECINTO y RECINTO -> VEEDOR (solo de su recinto); lo demás devuelve `permission-denied`;
   - valida cédula (módulo 10), email y teléfono, y comprueba que la cédula no exista en `cedulas`;
   - `admin.auth().createUser({ email, password: 'Ecuador2026' })` + `setCustomUserClaims({ rol, recintoId })` + documentos `usuarios` y `cedulas`;
   - envía el correo de confirmación: `generateEmailVerificationLink` + envío por SMTP con nodemailer (secreto en Functions).
   - No hay registro público: la app nunca llama `createUserWithEmailAndPassword`.
3. **Login con cédula sin exponer correos.** La Function `loginCedula(cedula, password)` busca el email en servidor, valida la contraseña con el endpoint REST de Identity Toolkit (`accounts:signInWithPassword`) y, si es correcta, devuelve un **custom token**. La app hace `signInWithCustomToken`. El error es siempre genérico.
4. **Primer acceso.** `primerAccesoGuard` lee `debeCambiarPassword`. Tras `updatePassword`, una callable limpia la bandera. Contraseña: mínimo 8, mayúscula, número y distinta de Ecuador2026.
5. **Recuperación por correo.** La Function `recuperarPassword(cedula)` busca el email y dispara el correo de reseteo de Firebase (`accounts:sendOobCode`, tipo `PASSWORD_RESET`). La respuesta es siempre "si la cuenta existe, se envió un correo".
6. **Firestore Rules** (la autorización real):
   - Helpers: `rol()`, `recinto()` desde `request.auth.token`.
   - `jrv` read: PROVINCIAL todo; RECINTO si `resource.data.recintoId == recinto()`; VEEDOR si `resource.data.veedorId == request.auth.uid`.
   - `jrv` update (asignar veedor): solo RECINTO de ese recinto y solo el campo `veedorId`.
   - `actas` create/update: VEEDOR si la JRV le está asignada (`get()` a `jrv`); RECINTO si es de su recinto; PROVINCIAL solo lectura.
   - En las reglas: enteros >= 0, `o1+..+o5+nulos+blancos == totalSufragantes`, `version == resource.data.version + 1`, y que `rol`, `recintoId` y `registradoPor` no se puedan falsificar.
   - `usuarios`: cada uno lee el suyo; nadie escribe `rol` ni `recintoId` desde el cliente.
   - `cedulas` y `auditoria`: sin acceso del cliente.
7. **Storage Rules**: el path se cruza con los claims. VEEDOR solo en las mesas asignadas (`firestore.get()` cruzado a `jrv`), RECINTO en su recinto, PROVINCIAL solo lectura. `size < 2 MB` y `contentType == 'image/jpeg'`.
8. **Prueba de aislamiento (R8)**: `tests/rules/veedor.spec.ts` con `@firebase/rules-unit-testing` y el emulador. El veedor A lee la JRV de B y debe fallar; escribe un acta de B y debe fallar. Se corre en vivo en la defensa.
9. Ojo: **las reglas no son filtros**. El cliente debe consultar `where('veedorId','==',uid)`; una consulta sin filtro se rechaza entera.

---

## 5. Funcionalidad por rol

### Coordinador provincial (R4)
- Listar y crear recintos; crear y asignar un coordinador por recinto.
- Avance: JRV con 0/2, 1/2 y 2/2 actas por recinto.
- GPS de las actas: lista con coordenadas (mapa con Leaflet si sobra tiempo).
- Dashboard: votos por candidato, por dignidad, por recinto o consolidado (Chart.js).

### Coordinador de recinto (R5)
- Mesas del recinto con estado; crear veedores; asignar y reasignar a JRV.
- Corregir datos y foto de las actas del recinto (queda en auditoría).

### Veedor (R6, R7): 4,2 pts
- "Mis mesas": `where('veedorId','==',uid)`.
- Acta de alcalde y de prefecto: 5 organizaciones, nulos, blancos, total. Validación en vivo con la diferencia visible; guardar deshabilitado mientras no cuadre.
- Foto obligatoria con `CameraSource.Camera`, comprimida (calidad ~70, ancho máximo ~1600 px).
- Nitidez: varianza del Laplaciano en canvas (`nitidez.ts`, con test y umbral calibrado con fotos reales).
- GPS: `getCurrentPosition({ enableHighAccuracy: true, timeout })` guardando lat, lng y precisión, con reintento.
- Permisos: `checkPermissions` y `requestPermissions`; si están denegados, guiar a los ajustes. Cancelar la cámara no es un error.
- Corrección: editar mientras sea suya (sube `version`, queda en auditoría).

---

## 6. UX (R9)
- `state-view` para carga, vacío, error con "Reintentar" y éxito (toast).
- Mensajes específicos: cédula inválida, totales no cuadran por N, sin permiso de cámara.
- Doble envío bloqueado (botón deshabilitado + ID determinista).
- Menú por rol, botón atrás de Android coherente, confirmación antes de reasignar.
- Indicador de conexión y de "pendientes de sincronizar".

## 7. Offline (R10)
- Firestore con `persistentLocalCache` (IndexedDB): las escrituras de actas se encolan y se sincronizan solas al volver la red.
- Las fotos **no** se encolan solas: `cola-fotos.service.ts` las guarda localmente y las sube al reconectar (`@capacitor/network`); luego actualiza `fotoPath`.
- Conflictos: la regla exige `version == anterior + 1`. Si un coordinador corrigió antes, la escritura del veedor se rechaza, se marca "en conflicto" y se le muestra. **Gana el servidor.**
- Auth en la WebView: `initializeAuth` con `indexedDBLocalPersistence`.
- Demo: modo avión, registrar, quitar el modo avión y ver la sincronización.

---

## 8. Bugs y riesgos

| Riesgo | Mitigación |
|---|---|
| Consulta sin filtro rechazada por las reglas | Toda consulta de veedor o recinto filtra por `veedorId` o `recintoId` |
| Los claims no se actualizan tras crear o reasignar | `getIdToken(true)` tras cambios de rol |
| Inputs numéricos como string | `Number()` en el modelo y enteros en las reglas |
| GPS lento en interiores | timeout + baja precisión + reintento |
| Permiso denegado permanente | detectar `denied` y guiar a ajustes |
| Fotos grandes | compresión antes de subir + límite de 2 MB en las reglas |
| Cobro inesperado | región us-central1 + alerta de 1 USD + no dejar listeners abiertos sin necesidad |
| Correos que no llegan | probar el SMTP desde el día 1 |
| Secretos en el repo | `.gitignore`, secretos en Functions, revisar `git log -p` |
| Cold start de Functions en la demo | llamar a una Function antes de la defensa |

---

## 9. Pruebas
- Unitarias: `cedula.validator`, `acta.rules`, `nitidez` y guards.
- Reglas: `tests/rules/*.spec.ts` con el emulador (`firebase emulators:exec`).
- Functions: crear usuario con cada rol (debe dar `permission-denied` en jerarquía inválida).
- Manual: checklist de los 3 roles en un teléfono físico.

Cédula (módulo 10): 10 dígitos; provincia 01-24 (o 30); tercer dígito < 6; coeficientes 2,1,2,1,2,1,2,1,2 sobre los 9 primeros, restando 9 si el producto > 9; verificador = (10 - suma % 10) % 10.

---

## 10. Setup, Firebase y APK: **los hace Antigravity**

Lista que se le entrega a Antigravity (tareas S-01 a S-06 de PLAN-AGENTES.md):
1. Scaffold Ionic Angular standalone + Capacitor Android; instalar `firebase`, `@capacitor/camera`, `@capacitor/geolocation`, `@capacitor/network`, fontsource y Chart.js.
2. `npm install -g firebase-tools`; `firebase login`; `firebase init` (firestore, storage, functions en TypeScript, emulators).
3. En la consola **(lo haces tú)**: crear el proyecto, activar Blaze, la alerta de 1 USD, Auth con correo/contraseña, Firestore y el bucket en us-central1.
4. Permisos de cámara y ubicación en `AndroidManifest.xml` según la documentación de los plugins.
5. Build:
```powershell
npm run build
```
```powershell
npx cap sync android
```
```powershell
cd android; .\gradlew.bat assembleDebug
```
   Salida: `android\app\build\outputs\apk\debug\app-debug.apk`. Release firmado con keystore fuera de git (`assembleRelease`, verificado con `apksigner verify`).
6. Deploy: `firebase deploy --only firestore:rules,storage,functions`.

---

## 11. Cronograma (desde el lunes 23)

| Día | Antigravity (setup) | Claude Code (programación) |
|---|---|---|
| **Lun 23 mañana** | S-01 a S-04: scaffold, Firebase, primer APK | domain/ (validadores + tests), modelos, contratos |
| **Lun 23 tarde** | deploy de reglas y Functions | reglas + test de aislamiento, Functions de usuarios y login, AuthService y guards |
| **Mar 24** | APK debug al final del día | flujo del veedor completo, luego recinto, provincial y dashboard |
| **Mié 25 hasta 11:00** | APK release + GitHub Release | offline si da el tiempo, README, `docs/IA.md` |
| **Mié 25 antes de 14:00** | - | entrega (yo) |

Commits con referencia al ADR (`feat(veedor): validacion de totales [ADR-007]`).

---

## 12. ADR (docs/adr/)
1. ADR-001-ionic-angular-standalone
2. ADR-002-backend-firebase-blaze (riesgo: tarjeta y costo, mitigado con región y alerta)
3. ADR-003-arquitectura-por-capas
4. ADR-004-autenticacion-cedula-claims-y-functions
5. ADR-005-modelo-firestore-y-reglas
6. ADR-006-estado-con-signals-y-navegacion
7. ADR-007-validacion-formularios-y-reglas-de-acta
8. ADR-008-plugins-capacitor-camara-gps-nitidez
9. ADR-009-pruebas-con-emulador-y-errores
10. ADR-010-offline-firestore-cache-y-cola-de-fotos (opcional)

## 13. README, anexo IA y defensa
- README: stack y versiones, instalación, `environment.example.ts` sin secretos, cómo correr los emuladores y el seed, cómo generar el APK, arquitectura, modelo de datos, pruebas, credenciales demo de los 3 roles y enlace al APK.
- `docs/IA.md`: herramientas (Claude Code, OpenCode, Antigravity), prompts reales, lo aceptado y lo descartado, y cómo se verificó.
- Defensa: tener listos los 3 roles en el teléfono, el test de reglas del veedor, el validador de totales con su test, la función de nitidez y los ADR 002 y 006.
