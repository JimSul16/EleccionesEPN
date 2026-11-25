# ADR-010: Soportar trabajo sin conexión con la caché de Firestore y una cola de fotos

**Estado:** Aceptado (componente opcional con bonificación). Actualizado por [ADR-018](ADR-018-firebase-spark-sin-functions.md): la foto viaja en el mismo lote que el acta, así que Firestore encola ambas y la cola de fotos en IndexedDB se eliminó.
**Fecha:** 2026-11-23
**Autor(es) y equipo:** Jimy Lucero San Lucas · Grupo 5
**Requisitos relacionados:** R10 (persistencia local, sincronización automática al recuperar conexión, estrategia de conflictos documentada).

## Contexto
Los recintos pueden no tener señal. El veedor debe poder registrar el acta y que se envíe sola al volver la red. Un coordinador puede corregir la misma acta mientras el veedor está desconectado.

## Alternativas consideradas
| Alternativa | A favor | En contra |
|---|---|---|
| **Caché persistente de Firestore + cola propia de fotos en IndexedDB + control de versión en las reglas** | El SDK encola escrituras y sincroniza solo; solo las fotos necesitan código propio | El conflicto se detecta recién al sincronizar |
| Cola propia de todo (SQLite o Preferences) | Control total | Duplica lo que ya hace el SDK; más código y errores |
| Sin offline | Simple | Pierde la bonificación y falla en recintos sin señal |

## Decisión
- Firestore con `persistentLocalCache` (IndexedDB): lecturas desde caché y escrituras encoladas.
- Fotos: `ColaFotosService` las guarda en IndexedDB con su ruta definitiva y las sube al reconectar (`@capacitor/network`). El acta ya apunta a esa ruta.
- **Conflictos:** cada acta tiene `version`; las reglas exigen `version == anterior + 1`. Si al sincronizar otro ya corrigió el acta, la escritura se rechaza y **gana la versión del servidor**: Firestore descarta el cambio local y la caché vuelve a la versión guardada. Si la pantalla del acta sigue abierta, muestra "El acta fue modificada por otra persona o su mesa fue reasignada. Revise la versión actual."; si ya se cerró, el usuario ve la versión del servidor al volver a abrirla.
- Indicador: `EstadoRedComponent` muestra "Sin conexión" o "Sincronizando N foto(s)".

## Consecuencias
- Beneficio: registrar un acta sin red funciona con el mismo formulario.
- Riesgo: una foto en cola cuya mesa fue reasignada nunca podrá subirse; se descarta al recibir `storage/unauthorized` para no reintentar sin fin.
- Limitación: el inicio de sesión requiere red.
- Limitación: si la pantalla del acta ya se cerró cuando llega el rechazo por conflicto, el aviso no se muestra (no hay una bandeja de conflictos); el dato correcto es el del servidor.

## Verificación
- Regla de versión: prueba "corrección: exige version + 1 (detecta conflictos)" en `npm run test:rules`.
- Demo: modo avión, registrar acta con foto, quitar modo avión y ver que el aviso de sincronización desaparece (`docs/setup/PRUEBA-TELEFONO.md`).

## Uso de IA
Claude Code propuso aprovechar la caché del SDK en lugar de una cola completa; la estrategia "gana el servidor" se eligió para no sobrescribir correcciones del coordinador.

## Trazabilidad
`41f684c` (caché y regla de versión), `0f4eaed` (cola de fotos, indicador, manejo del rechazo).

## Consenso del equipo
[COMPLETAR POR EL GRUPO]
