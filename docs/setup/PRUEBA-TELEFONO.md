# Protocolo y Registro de Pruebas en Teléfono Físico (A-08)

Este documento detalla el procedimiento de validación en dispositivo Android físico y sirve como plantilla de registro para la ejecución de pruebas funcionales, verificación de permisos nativos, calibración de nitidez de la cámara (filtro Laplaciano) y comportamiento fuera de línea (offline).

---

## 1. Información del Entorno y Build

- **Archivo APK:** `android/app/build/outputs/apk/debug/app-debug.apk`
- **Ruta Absoluta:** `C:\Users\Asus Tuf\Documents\Aplicaciones Moviles 2026-B\EleccionesEPN-antigravity\android\app\build\outputs\apk\debug\app-debug.apk`
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
| **1. Login Provincial** | Cédula `1712345675`, contraseña `Ecuador2026`. Debe exigir cambio de contraseña obligatorio (nueva sugerida: `Segura2026x`). Al completar, redirige a la lista de recintos (`Coordinación provincial`) con el avance provincial y el avance de cada recinto (sin mapa). | *Pendiente* | |
| **2. Recuperar contraseña por correo** | En el login, ir a recuperar contraseña, ingresar cédula `1712345675` y pulsar `Enviar correo`. Verificar que muestra confirmación y llega el correo de restablecimiento (revisar bandeja/spam). | *Pendiente* | |
| **3. Dashboard por dignidad y por recinto** | Desde `Coordinación provincial`, abrir `Dashboard de votos`. Alternar el segmento de dignidad (`Alcaldía` / `Prefectura`) y cambiar el selector `Ámbito` (`Consolidado provincial` vs un recinto específico). Verificar gráfico de barras y tabla de resultados. | *Pendiente* | |
| **4. Ubicaciones GPS** | Desde `Coordinación provincial`, abrir `Ubicaciones GPS`. Verificar el listado de actas con coordenadas, precisión, alerta `Lejos del recinto` en el acta demo sembrada a 3 km (`r05`, mesa 1) y el enlace `Abrir mapa`. | *Pendiente* | |
| **5. Crear recinto y asignar coordinador** | En `Coordinación provincial`, pulsar `Nuevo recinto`, llenar provincia, cantón, parroquia, nombre, cantidad de JRV y usar ubicación actual (o coordenadas manuales) -> `Crear recinto y sus JRV`. Luego pulsar `Asignar coordinador` en el recinto nuevo y crear la cuenta del coordinador. | *Pendiente* | |
| **6. Login Coordinador de Recinto** | Cédula `1700000019`, contraseña `Ecuador2026`. Debe exigir cambio obligatorio (`Segura2026x`). Al ingresar (`Unidad Educativa Los Cedros`), muestra avance del recinto, botón `Crear veedor` y las mesas (JRV) con selector de veedor y botones de actas. | *Pendiente* | |
| **7. Crear veedor y reasignar mesa** | Pulsar `Crear veedor`, registrar un veedor nuevo con correo real y verificar si llega el correo de confirmación (`Se envió un correo de confirmación de cuenta`). Volver a la lista de mesas y reasignar una mesa al veedor creado mediante el selector `Veedor`. | *Pendiente* | |
| **8. Login Veedor de Mesa** | Cédula `1700000027`, contraseña `Ecuador2026`. Debe exigir cambio obligatorio (`Segura2026x`). Al ingresar (`Mis mesas`), muestra **dos mesas** asignadas (`Mesa 1` y `Mesa 2` de `Unidad Educativa Los Cedros`), con botones para `Alcaldía` y `Prefectura`. | *Pendiente* | |
| **9. Permiso de cámara: negar y luego permitir** | Entrar al registro de un acta y pulsar `Tomar foto`. En el diálogo del sistema, **negar** el permiso de cámara y verificar que la app muestra un mensaje claro de error sin cerrarse. Volver a pulsar `Tomar foto` (o habilitar desde Ajustes si Android bloquea el re-intento) y **permitir** el permiso para abrir la cámara. | *Pendiente* | |
| **10. Calibración de Nitidez Laplaciana** | Tomar 3 fotos nítidas y 3 fotos borrosas desde `Tomar foto` / `Repetir foto`. Verificar que bajo la vista previa aparece `Nitidez <N> · aceptada` o `Nitidez <N> · rechazada` y registrar los 6 puntajes en la tabla inferior. | *Pendiente* | Ver tabla de nitidez abajo. |
| **11. Validación de total que no cuadra** | Ingresar votos de organizaciones, blancos, nulos y un `Total de sufragantes` mayor a la suma. Verificar que muestra `Faltan N`, lista los requisitos faltantes y mantiene deshabilitado `Guardar acta`. | *Pendiente* | |
| **12. Guardado de acta con totales válidos y GPS** | Ajustar `Total de sufragantes` para que muestre `Los totales cuadran`, asegurar foto aceptada y pulsar `Obtener ubicación`. Pulsar `Guardar acta` y verificar mensaje `Acta guardada y sincronizada.` | *Pendiente* | |
| **13. Corregir acta (versión 2)** | Abrir un acta ya registrada (`Ver o corregir` desde coordinador o desde la mesa del veedor), verificar que el encabezado indica `Corregir acta de ...` y `versión 2`, modificar un valor manteniendo el cuadre y pulsar `Guardar corrección`. Verificar que el badge muestra `v2` y estado `CORREGIDA`. | *Pendiente* | |
| **14. Modo Offline (Modo Avión)** | Activar modo avión en el teléfono. Registrar otra acta (por ejemplo, `Prefectura` de `Mesa 1` o `Alcaldía` de `Mesa 2`) con foto aceptada y totales válidos. Al guardar, verificar que muestra `"Guardada en el teléfono. Se enviará automáticamente al recuperar la conexión."` | *Pendiente* | |
| **15. Sincronización automática al reconectar** | Desactivar modo avión. Verificar que en el indicador superior aparece `"Sincronizando actas y fotos guardadas sin conexión…"`, que desaparece al completar, y que el acta pasa a "Registrada" con su foto visible (acta y foto se guardan juntas en Firestore; plan gratuito, ADR-018). | *Pendiente* | |

---

## 3. Calibración de Umbral de Nitidez (C-12 / Claude)

Para calibrar el umbral del filtro Laplaciano (`UMBRAL_NITIDEZ` en `src/app/domain/nitidez.ts`, actualmente `80`), registra a continuación las 3 capturas nítidas y 3 capturas borrosas:

| Tipo de Foto | Toma | Score de Nitidez Reportado | Aceptada / Rechazada por App | Observaciones (Iluminación, enfoque) |
|---|:---:|:---:|:---:|---|
| **Nítida** | 1 | | | Documento plano, buena luz natural/foco |
| **Nítida** | 2 | | | Foto tomada a ~30cm perpendicular |
| **Nítida** | 3 | | | Texto y cuadrícula claramente legibles |
| **Borroso** | 1 | | | Movimiento deliberado de la mano |
| **Borroso** | 2 | | | Fuera de foco cercano (<10cm sin enfocar) |
| **Borroso** | 3 | | | Movimiento rápido / desenfoque evidente |

---

## 4. Registro de Errores e Incidencias (para resolución por Claude)

*(Si se produce cualquier error, pegar aquí el mensaje exacto y la salida de consola de `chrome://inspect` o `logcat`)*

```text
(Sin incidencias reportadas aún)
```
