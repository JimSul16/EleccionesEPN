# Protocolo y Registro de Pruebas en Teléfono Físico (A-08)

Este documento detalla el procedimiento de validación en dispositivo Android físico y sirve como plantilla de registro para la ejecución de pruebas funcionales, verificación de permisos nativos, calibración de nitidez de la cámara (filtro Laplaciano) y comportamiento fuera de línea (offline).

---

## 1. Información del Entorno y Build

- **Dispositivo probado:** `TECNO LH7n` (`1027637369004529`, Android físico vía ADB)
- **Archivo APK:** `android/app/build/outputs/apk/debug/app-debug.apk`
- **Ruta Absoluta:** `C:\Users\Asus Tuf\Documents\Aplicaciones Moviles 2026-B\EleccionesEPN-antigravity\android\app\build\outputs\apk\debug\app-debug.apk`
- **Tamaño del APK:** `10.05 MB` (`10,533,058 bytes`, compilado el `25/11/2026 10:18` desde `origin/main` `4ea67a4` + `agent/antigravity/A-07`)
- **Instalación vía ADB:**
  ```powershell
  & "D:\AndroidSdk\platform-tools\adb.exe" install -r "android\app\build\outputs\apk\debug\app-debug.apk"
  ```
- **Inspección Webview y Diagnóstico:**
  - Depuración visual en PC: Abrir Google Chrome en `chrome://inspect/#devices`
  - Captura de logs nativos:
    ```powershell
    & "D:\AndroidSdk\platform-tools\adb.exe" logcat -d -s Capacitor,Capacitor/Console,Chromium
    ```

---

## 2. Matriz de Ejecución de Pruebas

| Paso | Descripción | Resultado (OK / FALLA) | Observación |
|---|---|:---:|---|
| **1. Login Provincial** | Cédula `1712345675`, contraseña `Ecuador2026`. Debe exigir cambio de contraseña obligatorio (nueva sugerida: `Segura2026x`). Al completar, redirige a la lista de recintos (`Coordinación provincial`) con el avance provincial y el avance de cada recinto (sin mapa). | **OK** | Login y cambio de contraseña funcionan correctamente. |
| **2. Recuperar contraseña por correo** | En el login, ir a recuperar contraseña, ingresar cédula `1712345675` y pulsar `Enviar correo`. Verificar que muestra confirmación y llega el correo de restablecimiento (revisar bandeja/spam). | **OK** | Confirmado por el usuario: sí envía los correos de recuperación cuando falta la contraseña. |
| **3. Dashboard por dignidad y por recinto** | Desde `Coordinación provincial`, abrir `Dashboard de votos`. Alternar el segmento de dignidad (`Alcaldía` / `Prefectura`) y cambiar el selector `Ámbito` (`Consolidado provincial` vs un recinto específico). Verificar gráfico de barras y tabla de resultados. | **OK** | Ronda 1 falló con `"Ocurrió un error inesperado."` (`getAggregateFromServer`). Corregido por Claude en `4ea67a4` (`C-15`, suma en cliente según `ADR-017` revisado); re-probado en nuevo APK con resultado OK. |
| **4. Ubicaciones GPS** | Desde `Coordinación provincial`, abrir `Ubicaciones GPS`. Verificar el listado de actas con coordenadas, precisión, alerta `Lejos del recinto` en el acta demo sembrada a 3 km (`r05`, mesa 1) y el enlace `Abrir mapa`. | **OK** | Validado por el usuario sin incidencias. |
| **5. Crear recinto y asignar coordinador** | En `Coordinación provincial`, pulsar `Nuevo recinto`, llenar provincia, cantón, parroquia, nombre, cantidad de JRV y usar ubicación actual (o coordenadas manuales) -> `Crear recinto y sus JRV`. Luego pulsar `Asignar coordinador` en el recinto nuevo y crear la cuenta del coordinador. | **OK** | Crea nuevos recintos y asigna coordinador correctamente. Nota: el contador inicia en `24` por las 24 actas demo sembradas con `--actas-demo` en `r02..r05` (+2 esperadas por cada JRV nueva, p. ej. `24 de 68`). |
| **6. Login Coordinador de Recinto** | Cédula `1700000019`, contraseña `Ecuador2026`. Debe exigir cambio obligatorio (`Segura2026x`). Al ingresar (`Unidad Educativa Los Cedros`), muestra avance del recinto, botón `Crear veedor` y las mesas (JRV) con selector de veedor y botones de actas. | **OK** | Por diseño (`R5` / `firestore.rules`), cada coordinador administra únicamente su propio `recintoId` (no cambia de recinto). |
| **7. Crear veedor y reasignar mesa** | Pulsar `Crear veedor`, registrar un veedor nuevo con correo real y verificar si llega el correo de confirmación (`Se envió un correo de confirmación de cuenta`). Volver a la lista de mesas y reasignar una mesa al veedor creado mediante el selector `Veedor`. | **OK** | Validado por el usuario sin incidencias. |
| **8. Login Veedor de Mesa** | Cédula `1700000027`, contraseña `Ecuador2026`. Debe exigir cambio obligatorio (`Segura2026x`). Al ingresar (`Mis mesas`), muestra **dos mesas** asignadas (`Mesa 1` y `Mesa 2` de `Unidad Educativa Los Cedros`), con botones para `Alcaldía` y `Prefectura`. | **OK** | Confirmado desde ronda 1 ("En los veedores sí está bien"). |
| **9. Permiso de cámara: negar y luego permitir** | Entrar al registro de un acta y pulsar `Tomar foto`. En el diálogo del sistema, **negar** el permiso de cámara y verificar que la app muestra un mensaje claro de error sin cerrarse. Volver a pulsar `Tomar foto` (o habilitar desde Ajustes si Android bloquea el re-intento) y **permitir** el permiso para abrir la cámara. | **OK** | Validado por el usuario sin incidencias. |
| **10. Calibración de Nitidez Laplaciana** | Tomar 3 fotos nítidas y 3 fotos borrosas desde `Tomar foto` / `Repetir foto`. Verificar que bajo la vista previa aparece `Nitidez <N> · aceptada` o `Nitidez <N> · rechazada` y registrar los 6 puntajes en la tabla inferior. | **OK** (sin números anotados) | Las 3 fotos nítidas mostraron `aceptada` y las 3 borrosas mostraron `rechazada` con `UMBRAL_NITIDEZ = 80`. No se transcribieron los 6 puntajes numéricos individuales. |
| **11. Validación de total que no cuadra** | Ingresar votos de organizaciones, blancos, nulos y un `Total de sufragantes` mayor a la suma. Verificar que muestra `Faltan N`, lista los requisitos faltantes y mantiene deshabilitado `Guardar acta`. | **OK** | Validado por el usuario sin incidencias. |
| **12. Guardado de acta con totales válidos y GPS** | Ajustar `Total de sufragantes` para que muestre `Los totales cuadran`, asegurar foto aceptada y pulsar `Obtener ubicación`. Pulsar `Guardar acta` y verificar mensaje `Acta guardada y sincronizada.` | **OK** | Ronda 1 tuvo texto ilegible dentro de la franja verde (`.guardado-exitoso` con `<ion-text color="success">`). Corregido por Claude en `4ea67a4` (`C-15`); re-probado en nuevo APK con resultado OK. |
| **13. Corregir acta (versión 2)** | Abrir un acta ya registrada (`Ver o corregir` desde coordinador o desde la mesa del veedor), verificar que el encabezado indica `Corregir acta de ...` y `versión 2`, modificar un valor manteniendo el cuadre y pulsar `Guardar corrección`. Verificar que el badge muestra `v2` y estado `CORREGIDA`. | **OK** | Validado por el usuario sin incidencias. |
| **14. Modo Offline (Modo Avión)** | Activar modo avión en el teléfono. Registrar otra acta (por ejemplo, `Prefectura` de `Mesa 1` o `Alcaldía` de `Mesa 2`) con foto aceptada y totales válidos. Al guardar, verificar que muestra `"Guardada en el teléfono. Se enviará automáticamente al recuperar la conexión."` | **OK** | Validado por el usuario sin incidencias. |
| **15. Sincronización automática al reconectar** | Desactivar modo avión. Verificar que en el indicador superior aparece `"Sincronizando actas y fotos guardadas sin conexión…"`, que desaparece al completar, y que el acta pasa a "Registrada" con su foto visible (acta y foto se guardan juntas en Firestore; plan gratuito, ADR-018). | **OK** | Validado por el usuario sin incidencias. |

---

## 3. Calibración de Umbral de Nitidez (C-12 / Claude)

Para calibrar el umbral del filtro Laplaciano (`UMBRAL_NITIDEZ` en `src/app/domain/nitidez.ts`, actualmente `80`), resultado observado en las 3 capturas nítidas y 3 capturas borrosas:

| Tipo de Foto | Toma | Score de Nitidez Reportado | Aceptada / Rechazada por App | Observaciones (Iluminación, enfoque) |
|---|:---:|:---:|:---:|---|
| **Nítida** | 1 | `≥ 80` *(número exacto no anotado)* | **Aceptada** | Documento plano, buena luz natural/foco |
| **Nítida** | 2 | `≥ 80` *(número exacto no anotado)* | **Aceptada** | Foto tomada a ~30cm perpendicular |
| **Nítida** | 3 | `≥ 80` *(número exacto no anotado)* | **Aceptada** | Texto y cuadrícula claramente legibles |
| **Borroso** | 1 | `< 80` *(número exacto no anotado)* | **Rechazada** | Movimiento deliberado de la mano |
| **Borroso** | 2 | `< 80` *(número exacto no anotado)* | **Rechazada** | Fuera de foco cercano (<10cm sin enfocar) |
| **Borroso** | 3 | `< 80` *(número exacto no anotado)* | **Rechazada** | Movimiento rápido / desenfoque evidente |

*(Nota: el umbral `UMBRAL_NITIDEZ = 80` separó 3/3 fotos nítidas como `aceptada` y 3/3 fotos borrosas como `rechazada`. Queda a criterio de Claude (`C-12`) mantener `80` o solicitar las 6 cifras exactas en una toma adicional si desea registrar valores numéricos en `ADR-008`.)*

---

## 4. Registro de Errores e Incidencias (para resolución por Claude / OpenCode)

```text
Ronda 1 (25-nov, previo a C-15):
1) Paso 3 — Dashboard de votos (Provincial): mostró "Ocurrió un error inesperado." al usar
   getAggregateFromServer en Firestore real sin índices por organización.
   -> RESUELTO por Claude en 4ea67a4 (C-15, ADR-017 revisado: sumarActas en cliente).
2) Paso 12 — Mensaje de confirmación al guardar acta (.guardado-exitoso): la franja verde
   ocultaba el texto por <ion-text color="success"> sobre fondo verde.
   -> RESUELTO por Claude en 4ea67a4 (C-15).

Ronda 2 (25-nov, APK recompilado desde 4ea67a4 en TECNO LH7n):
- Todos los pasos (1 al 15) reportados como OK por el usuario, sin fallas nuevas.
```
