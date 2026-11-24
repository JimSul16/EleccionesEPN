# MANIFEST de Assets Visuales - EleccionesEPN

Este documento registra los assets visuales y de movimiento de la aplicación, certificando cumplimiento de las directrices de diseño (IBM/Carbon: sobrio, sin logos partidistas, azul `#0f62fe` como acento) y el presupuesto de peso (< 1 MB total).

---

## 1. Icono y Splash de la Aplicación

| Archivo | Dimensiones | Peso | Origen / Prompt | Licencia | Uso |
|---|---|---|---|---|---|
| `resources/icon.png` | 1024x1024 px | 8.89 KB | Generado con script PIL: urna electoral abstracta con acta deslizándose en la ranura, fondo `#0f62fe` | MIT / Propio | Icono maestro para `@capacitor/assets` |
| `resources/splash.png` | 2732x2732 px | 36.93 KB | Generado con script PIL: urna electoral abstracta centrada sobre lienzo `#ffffff` plano | MIT / Propio | Pantalla de inicio maestra para `@capacitor/assets` |
| Recursos Android (`android/app/src/main/res/mipmap-*`, `drawable-*`) | Varias densidades | ~632 KB total | Generados automáticamente vía `npx @capacitor/assets generate --assetPath resources --android` | MIT / Propio | Iconos adaptativos y splash screens en Android |

---

## 2. Ilustraciones SVG (`src/assets/svg/`)

Todos los SVGs tienen `viewBox="0 0 120 120"`, utilizan `currentColor` para soportar modo claro y oscuro, y pesan menos de 1 KB (presupuesto < 10 KB).

| Archivo | Peso | Origen / Prompt | Licencia | Uso |
|---|---|---|---|---|
| `src/assets/svg/estado-vacio.svg` | 809 B | Diseño vectorial Carbon: urna electoral con líneas discontinuas y lupa geométrica sutil | MIT / Propio | Estado vacío (sin mesas, sin actas asignadas) en `state-view` |
| `src/assets/svg/estado-error.svg` | 530 B | Diseño vectorial Carbon: octógono de alerta sobrio con signo de exclamación en rojo `#da1e28` | MIT / Propio | Estado de error / fallo de red en `state-view` |
| `src/assets/svg/sin-conexion.svg` | 532 B | Diseño vectorial Carbon: nube y señal inalámbrica con barra diagonal de desconexión en azul `#0f62fe` | MIT / Propio | Indicador y banner de modo fuera de línea |
| `src/assets/svg/acta-guardada.svg` | 901 B | Diseño vectorial Carbon: documento de acta electoral con insignia circular de verificación en verde `#24a148` | MIT / Propio | Confirmación visual de registro exitoso de acta |

---

## 3. Animaciones dotLottie (`src/assets/lottie/`)

Formato dotLottie empaquetado (.lottie con Bodymovin JSON), peso < 1 KB (presupuesto < 150 KB).

| Archivo | Peso | Origen / Descripción | Licencia | Uso |
|---|---|---|---|---|
| `src/assets/lottie/sincronizando.lottie` | 740 B | Animación vectorial en bucle de anillo giratorio en azul IBM `#0f62fe` | MIT / Propio | Indicador de sincronización en segundo plano |
| `src/assets/lottie/acta-guardada.lottie` | 716 B | Animación de escala y checkmark de éxito en verde `#24a148` | MIT / Propio | Feedback de guardado local / subida de acta |

---

## 4. Resumen de Presupuesto

- **Presupuesto total permitido para `src/assets/`:** 1,000 KB (1 MB).
- **Peso real actual de `src/assets/`:** ~6.3 KB (< 1% del límite).
- **Reducción de movimiento:** Soportada globalmente en `src/theme/motion.scss` mediante `@media (prefers-reduced-motion: reduce)`.
