# Guía de Emuladores de Firebase - EleccionesEPN

Esta guía documenta la configuración, ejecución y resolución de problemas de los emuladores locales de Firebase (Auth, Firestore, Cloud Storage y Cloud Functions) en el proyecto.

---

## 1. Requisitos Previos

- **Java JDK 21+** instalado y en el PATH (`java -version`).
- **Firebase CLI** (`firebase-tools`) instalado globalmente o ejecutable vía npx:
  ```powershell
  npm install -g firebase-tools
  ```
- Dependencias del proyecto instaladas:
  ```powershell
  npm install
  npm --prefix functions install
  ```

---

## 2. Configuración de Puertos (`firebase.json`)

Los puertos de los emuladores están mapeados en `firebase.json`:

| Emulador | Puerto | Nota |
|---|---|---|
| **Authentication** | `9099` | Emulador de identidad y tokens |
| **Firestore** | `8085` | **Nota:** Se configuró en `8085` (el puerto default `8080` suele estar ocupado por Apache/XAMPP en entornos Windows) |
| **Cloud Storage** | `9199` | Almacenamiento local de fotos de actas |
| **Cloud Functions** | `5001` | Endpoints y callables en TypeScript |
| **Emulator UI** | `4000` | Consola web local: `http://localhost:4000` |

---

## 3. Arreglo para Windows: `JAVA_TOOL_OPTIONS` (Rutas con Espacios)

En Windows, si la carpeta de usuario o el directorio temporal `TEMP` contiene espacios (por ejemplo `C:\Users\Asus Tuf\AppData\Local\Temp`), el motor del emulador de Firestore puede fallar al inicializar sockets de dominio con el error:
```text
Unable to establish loopback connection
```

### Solución en PowerShell:
Antes de ejecutar los emuladores o las pruebas en la terminal, define:
```powershell
$env:JAVA_TOOL_OPTIONS="-Djdk.net.unixdomain.tmpdir=C:\Users\Public"
```

*(Opcional: Si deseas que persista en tu usuario, puedes agregar la variable de entorno `JAVA_TOOL_OPTIONS` con valor `-Djdk.net.unixdomain.tmpdir=C:\Users\Public` en las variables de entorno del sistema).*

---

## 4. Cómo Iniciar los Emuladores

Para levantar todos los emuladores y trabajar con la aplicación Ionic en modo desarrollo:

```powershell
$env:JAVA_TOOL_OPTIONS="-Djdk.net.unixdomain.tmpdir=C:\Users\Public"
firebase emulators:start
```

Para levantar solo los emuladores necesarios (ej. Firestore y Storage):
```powershell
firebase emulators:start --only firestore,storage
```

La consola web interactiva estará disponible en:
[http://localhost:4000](http://localhost:4000)

---

## 5. Cómo Correr las Pruebas de Reglas de Seguridad

El proyecto incluye un script en `package.json` para ejecutar la suite de pruebas de `@firebase/rules-unit-testing` con Vitest:

```powershell
$env:JAVA_TOOL_OPTIONS="-Djdk.net.unixdomain.tmpdir=C:\Users\Public"
npm run test:rules
```

Este comando:
1. Inicia automáticamente instancias aisladas de los emuladores de Firestore y Storage.
2. Ejecuta `vitest run --config vitest.rules.config.mts` contra `tests/rules/**/*.spec.ts`.
3. Detiene los emuladores y muestra el reporte de las pruebas.
