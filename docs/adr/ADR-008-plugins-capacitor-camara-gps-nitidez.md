# ADR-008: Usar los plugins oficiales de Capacitor para cámara y GPS, y medir nitidez con el Laplaciano

**Estado:** Aceptado (umbral de nitidez pendiente de calibrar con fotos reales)
**Fecha:** 2026-11-23
**Autor(es) y equipo:** Jimy Lucero San Lucas · Grupo 5
**Requisitos relacionados:** R7 (foto desde la app, comprobar nitidez, GPS como campos del registro, manejo de permisos y errores).

## Contexto
La foto debe tomarse desde la app (no de la galería), rechazarse si está borrosa y subir liviana. El GPS dentro de un aula puede tardar o no responder. Hay que manejar permisos negados y servicios apagados.

## Alternativas consideradas
| Alternativa | A favor | En contra |
|---|---|---|
| **`@capacitor/camera` 8 (`takePhoto`) y `@capacitor/geolocation` 8; nitidez por varianza del Laplaciano en canvas** | Plugins oficiales; códigos de error documentados; nitidez sin dependencias | El umbral depende del teléfono y debe calibrarse |
| Plugins de Cordova | Muchos disponibles | Mantenimiento irregular con Capacitor 8 |
| Nitidez con OpenCV.js | Algoritmos robustos | Varios MB extra en el APK |
| `getPhoto` (API clásica) | Ejemplos abundantes | Deprecada en la versión 8 |

## Decisión
- Cámara: `Camera.takePhoto({ quality: 90, targetWidth/Height: 1600, correctOrientation: true, saveToGallery: false })`. Se recodifica como JPEG en un canvas, bajando resolución y calidad hasta quedar bajo 700 KB en base64 (se guarda en Firestore, ADR-018).
- Nitidez: imagen reducida a 640 px, escala de grises, varianza del Laplaciano (`domain/nitidez.ts`). Umbral inicial `UMBRAL_NITIDEZ = 80`.
- GPS: alta precisión con 15 s; si se agota, reintento de precisión normal con 20 s. Se guarda `lat`, `lng` y `precisionM`.
- Errores mapeados por código (`OS-PLUG-CAMR-0003/0006/0007`, `OS-PLUG-GLOC-0003/0007/0009/0010`) a mensajes con instrucciones. Cancelar la cámara no es un error.

## Consecuencias
- Beneficio: no se acepta un acta sin foto nítida y sin GPS.
- **Riesgo:** un umbral mal calibrado rechaza fotos buenas o acepta borrosas. Mitigación aplicada el 2026-11-25: en el teléfono de la demo se tomaron 3 fotos nítidas y 3 borrosas (movimiento de la mano, foco a menos de 10 cm, movimiento rápido). Con `UMBRAL_NITIDEZ = 80` se aceptaron las 3 nítidas y se rechazaron las 3 borrosas, así que el valor final es 80. Los puntajes exactos no se anotaron ([PRUEBA-TELEFONO.md](../setup/PRUEBA-TELEFONO.md), paso 10).
- Limitación: en el navegador no hay permisos nativos; la prueba real es en el APK.

## Verificación
- `src/app/domain/nitidez.spec.ts` (imagen plana, tablero nítido, degradado borroso).
- `src/app/data/foto.service.ts`, `src/app/data/ubicacion.service.ts`.
- Prueba en teléfono: `docs/setup/PRUEBA-TELEFONO.md` (Antigravity).
- Umbral calibrado: [COMPLETAR con los puntajes medidos].

## Uso de IA
Claude Code revisó las definiciones de tipos instaladas (`definitions.d.ts`) y el README del plugin antes de usar la API; así detectó que `getPhoto` está deprecada y obtuvo los códigos de error reales.

## Trazabilidad
`0f4eaed` (servicios y formulario del acta).

## Consenso del equipo
[COMPLETAR POR EL GRUPO]
