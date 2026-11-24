# Guía de defensa

## 1. Dónde vive cada validación y cómo se demuestra

| Validación | Cliente | Servidor | Cómo demostrarla |
|---|---|---|---|
| Cédula ecuatoriana (módulo 10) | `src/app/domain/cedula.validator.ts` + `form-validators.ts` | `functions/src/shared/validaciones.ts` (en `crearUsuario`) | Crear veedor con `1712345670` (verificador malo) muestra el error; `cedula.validator.spec.ts` |
| Totales del acta (votos + nulos + blancos = total) | `src/app/domain/acta.rules.ts` (en vivo: "Faltan N" / "Sobran N") | `firestore.rules`, función `conteoValido` | En el formulario; `npm run test:rules` caso "rechaza un acta cuyos totales no cuadran" |
| Enteros no negativos | `acta.rules.ts` | `firestore.rules` (`enteroValido`) | Pruebas de reglas "rechaza votos negativos o decimales" |
| Foto nítida | `src/app/domain/nitidez.ts` (varianza del Laplaciano) | Storage: solo JPEG de menos de 2 MB | Tomar una foto movida: se rechaza con su puntaje |
| Veedor solo ve sus mesas (R8) | Consulta `where('veedorId','==',uid)` | `firestore.rules` (`jrv` y `actas`), `storage.rules` | `npm run test:rules`, bloque "Veedor: aislamiento de mesas" |
| Jerarquía de cuentas | Pantallas por rol | `crearUsuario` (`puedeCrear`) | `tests/integracion/cuentas.mjs` |
| Contraseña nueva | `usuario.rules.ts` (requisitos en vivo) | `cambiarPassword` (`esPasswordSegura`) | Intentar `Ecuador2026` como nueva |
| Conflicto de versión | `ActaRepository.guardar` (`version + 1`) | `firestore.rules` (update) | Prueba "corrección: exige version + 1" |

## 2. Preguntas orientadoras

**¿Cómo se distribuyen responsabilidades entre interfaz, lógica y persistencia?**
Páginas en `features/` muestran estado; stores (`*.store.ts`) orquestan; reglas de negocio puras en `domain/`; acceso a Firebase y al dispositivo solo en `data/` y `core/`. Ninguna página importa Firebase (ADR-003).

**¿Qué ADR determina esta dependencia o patrón y qué alternativas se descartaron?**
Ver la tabla de [docs/adr/README.md](adr/README.md). Ejemplos: Firebase frente a Supabase (ADR-002), signals frente a NgRx (ADR-006), custom token frente a callable que devuelve el correo (ADR-004).

**¿Dónde se implementa una validación y cómo se comprueba?**
Tabla de la sección 1. Mostrar `acta.rules.ts`, su prueba, y la misma regla en `firestore.rules` con su prueba de reglas.

**¿Qué parte del código fue asistida por IA y cómo se verificó?**
[docs/IA.md](IA.md): herramientas por rol, lo descartado y los 6 errores encontrados al probar, cada uno con su prueba.

**¿Qué ocurre cuando una operación falla o no hay conectividad?**
Errores traducidos en `core/errores.ts` con opción de reintentar. Sin red: Firestore encola el acta, las fotos esperan en IndexedDB, el aviso "Sin conexión" o "Sincronizando N foto(s)" lo indica, y al volver la red se envía todo. Si hubo una corrección en paralelo, gana el servidor (ADR-010).

## 3. Guion de demostración (unos 8 minutos)

Antes: correr `npm run test:rules` una vez, abrir la app en el teléfono, llamar una Function para que no haya arranque en frío.

1. **Veedor** (`1700000027`): login con cédula, cambio de contraseña obligatorio, solo ve sus 2 mesas. Registrar el acta de alcaldía con un total que no cuadra ("Faltan 5"), corregirlo, tomar una foto movida (rechazada) y una nítida, GPS, guardar.
2. **Offline:** modo avión, registrar el acta de prefectura, quitar modo avión y ver cómo se sincroniza.
3. **Coordinadora de recinto** (`1700000019`): estado de las mesas, crear un veedor, reasignar una mesa (confirmación), corregir el acta (versión 2).
4. **Provincial** (`1712345675`): avance por recinto, dashboard consolidado y por recinto, ubicaciones GPS con la alerta "Lejos del recinto".
5. **Seguridad:** en la terminal, `npm run test:rules`, y mostrar la prueba "NO lee la mesa de otro veedor".
6. **Código:** abrir `acta.rules.ts` y su espejo en `firestore.rules`; cambiar un mensaje en vivo si lo piden.

## 4. Puntos que conviene saber explicar

- Por qué las reglas no son filtros y cada consulta lleva el filtro de la regla.
- Por qué el acta tiene ID `{jrvId}_{dignidad}` (una por mesa y dignidad; reintentos idempotentes).
- Por qué el login devuelve un custom token (no exponer correos) y por qué hace falta el rol Token Creator.
- Por qué cambiar la contraseña revoca la sesión y la app vuelve a iniciarla.
- Por qué `inject()` va antes del `await` y por qué el `effect` usa `untracked`.
