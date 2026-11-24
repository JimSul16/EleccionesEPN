# Protocolo y Registro de Pruebas en Teléfono Físico (A-08)

Este documento detalla el procedimiento de validación en dispositivo Android físico y sirve como plantilla de registro para la ejecución de pruebas funcionales, verificación de permisos nativos, calibración de nitidez de la cámara (filtro Laplaciano) y comportamiento fuera de línea (offline).

---

## 1. Información del Entorno y Build (S-07)

- **Archivo APK:** `android/app/build/outputs/apk/debug/app-debug.apk`
- **Ruta Absoluta:** `C:\Users\Asus Tuf\Documents\Aplicaciones Moviles 2026-B\EleccionesEPN-antigravity\android\app\build\outputs\apk\debug\app-debug.apk`
- **Tamaño del APK:** 10.05 MB (10,533,289 bytes)
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
| **1. Login Provincial** | Cédula `1712345675`, contraseña `Temporal2026!`. Debe solicitar cambio de contraseña obligatorio (nueva sugerida: `Segura2026x`). Al completar, redirige al Dashboard Provincial con indicadores y mapa de avance. | *Pendiente conexión* | |
| **2. Login Coordinador de Recinto** | Cédula `1700000019`, contraseña `Temporal2026!`. Debe solicitar cambio obligatorio (`Segura2026x`). Al ingresar, muestra lista de mesas de su recinto y estado de asignación de veedores. | *Pendiente conexión* | |
| **3. Login Veedor de Mesa** | Cédula `1700000027`, contraseña `Temporal2026!`. Debe solicitar cambio obligatorio (`Segura2026x`). Al ingresar, muestra únicamente su mesa asignada y botón de registro de acta. | *Pendiente conexión* | |
| **4. Captura de Acta y Calibración Laplaciana** | Captura de imagen del acta física o documento simulado. Debe evaluar el score de nitidez antes de permitir el envío. Registrar puntajes para calibración de Claude (C-12). | *Pendiente conexión* | Ver tabla de nitidez abajo. |
| **5. Guardado de Acta con Totales Válidos** | Ingreso de votos válidos, blancos, nulos. La suma de sufragantes debe cuadrar. Guardado exitoso con metadatos de GPS. | *Pendiente conexión* | |
| **6. Modo Offline (Modo Avión)** | Activar modo avión en el teléfono. Registrar otra acta (otra dignidad o mesa asignada). La app debe indicar "Guardada localmente" y encolarla en IndexedDB. | *Pendiente conexión* | |
| **7. Sincronización Automática al Reconectar** | Desactivar modo avión. La app detecta conectividad con `@capacitor/network`, procesa la cola de actas y sube la foto a Storage / Firestore. | *Pendiente conexión* | |
| **8. Cierre de Mesa** | Ejecutar cierre de mesa desde el rol autorizado. Verificar que la mesa pasa a estado cerrada y no permite modificaciones posteriores de actas. | *Pendiente conexión* | |

---

## 3. Calibración de Umbral de Nitidez (C-12 / Claude)

Para calibrar el umbral del filtro Laplaciano (`UMBRAL_NITIDEZ` en `src/app/domain/acta.rules.ts`), registra a continuación las 3 capturas nítidas y 3 capturas borrosas:

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

*(Si se produce cualquier error, pegar aquí el stack trace exacto obtenido de logcat o de la consola de chrome://inspect)*

```text
(Sin incidencias reportadas aún)
```
