# PLAN-AGENTES: sistema de diseño y coordinación de tres agentes de IA

Complementa a [PLAN.md](PLAN.md) (requisitos R1-R10, backend, seguridad, APK). Aquí se documenta:
el kit de diseño, los ADR de UI, los roles de Claude Code, OpenCode y Antigravity, y cómo se coordinan.

**Cambio 23-nov:** el backend es **Firebase con plan Blaze**. Para ahorrar tokens de Claude, **Antigravity se encarga de instalar el framework y las librerías, configurar Firebase y generar el APK**; **Claude Code solo programa**.

**Cómo se trabajó en realidad (23-nov), y cómo se sigue:**
- Cada agente trabaja en **su propia carpeta (git worktree) y su propia rama**, para no compartir el árbol de trabajo:
  - Carpeta principal `EleccionesEPN`: rama `main` (y OpenCode crea ahí su rama de trabajo).
  - `../EleccionesEPN-claude`: Claude, rama `agent/claude/...`.
  - `../EleccionesEPN-antigravity`: Antigravity, rama `agent/antigravity/...`.
- Toda rama nueva parte de `main` actualizado. Nadie hace merge a `main` salvo Claude, con la verificación completa (lint, tests unitarios, `test:rules`, integración, build) y la aprobación del usuario.
- En esta PC los emuladores necesitan `JAVA_TOOL_OPTIONS=-Djdk.net.unixdomain.tmpdir=C:\Users\Public` (ver `docs/setup/EMULADORES.md`).
- Lecciones del 23-nov: un agente commiteó en la rama de otro; otro agregó por error `"elecciones-epn": "file:.."` a Functions. Por eso: cada agente verifica `git branch --show-current` antes de commitear y revisa `git diff --stat` del commit.
- Prompts de trabajo para el martes 24: [agents/PROMPTS.md](agents/PROMPTS.md).

Alcance: app **EleccionesEPN** (Ionic Angular standalone + Capacitor + Firebase). Es "multi-repositorio"
porque cada integrante del grupo tiene su repo individual con la misma línea base. Este plan sirve
para el repo propio y puede compartirse como propuesta de ADR de diseño al grupo.

Restricción académica (enunciado, sección 7): todo lo que hagan los tres agentes es **uso de IA** y se
declara en `docs/IA.md`. En la defensa hay que explicar y modificar cualquier línea. Ningún agente hace merge
sin que yo lea el diff.

Fechas: hoy sáb 21-nov. Entrega mié 25-nov 14:00. El diseño no puede comerse el tiempo del flujo del veedor (4,2 pts).

---

## 1. Inventario de los 10 repositorios (verificado el 21-nov-2026)

Todo lo de esta tabla lo saqué de la API de GitHub, de los README y de los paquetes de npm. Nada es supuesto.

| Repo | Qué es realmente | Decisión | Agentes |
|---|---|---|---|
| `pbakaus/impeccable` | Skill de vocabulario de diseño + detector de "AI slop" (CLI `npx impeccable detect`). npm `impeccable` 4.10.0, Apache-2.0. Repo de ~930 MB: **no clonar**, usar el instalador npm. | **Instalar global** | Claude, OpenCode, Antigravity |
| `nextlevelbuilder/ui-ux-pro-max-skill` | Skill de inteligencia UI/UX multiplataforma. CLI npm `ui-ux-pro-max-cli` 2.15.0 (comando `uipro`), MIT. | **Instalar global** | Claude, OpenCode, Antigravity |
| `Leonxlnx/taste-skill` | Skill `design-taste-frontend`: dirección de arte para **sitios web de empresas** (landing pages), con checker en navegador. MIT. Necesita Node 22+ y Chrome/Edge. | Instalar global, **uso limitado** (no es para apps móviles de formularios) | OpenCode, Antigravity |
| `VoltAgent/awesome-design-md` | 84 archivos `DESIGN.md` que analizan sistemas de diseño de marcas conocidas. MIT. No se instala. | **Copiar 1-2 DESIGN.md** al repo | Todos (como contexto) |
| `microsoft/playwright-cli` | CLI de Playwright (grabar, selectores, capturas). npm `@playwright/cli` 0.1.25, Apache-2.0. Sus skills se instalan **por proyecto** (`.claude/skills` o `.agents/skills`). | **Instalar global** el CLI; skills por proyecto | Claude (QA), OpenCode (capturas responsive) |
| `dgreenheck/webgpu-claude-skill` | Skill para WebGPU con Three.js (TSL). 87 KB, sin licencia declarada. | Instalar global (pesa poco), **no usar en esta app** (ver ADR-016) | Claude |
| `amaancoderx/skillui` | **Ojo:** ese repo es la web (Next.js) del producto, sin licencia. El CLI está en npm `skillui` 1.3.4 y su código vive en otro repo (`amaancoderx/npxskillui`). Extrae un sistema de diseño de una URL. | **Opcional**, no necesario (ya hay DESIGN.md) | OpenCode |
| `gemini-cli-extensions/stitch` | Extensión de **Gemini CLI** para el MCP de Google Stitch (mockups). Necesita Gemini CLI (npm `@google/gemini-cli` 0.70.0, **no instalado** en tu PC) y un proyecto de Google Cloud o API key. | **Opcional**: solo si Antigravity va a hacer mockups | Antigravity |
| `21st-dev/1code` | App de escritorio Electron que orquesta **Claude Code y Codex** (no OpenCode ni Antigravity). Se compila desde fuente con `bun` (no instalado) y descarga binarios, o se paga una suscripción. | **No instalar**: la coordinación se hace dentro del repo (sección 6) | - |
| `google/fonts` | Repositorio de todas las fuentes de Google Fonts: **~3,3 GB**. | **No clonar**: usar `@fontsource/ibm-plex-sans` y `@fontsource/ibm-plex-mono` (npm 5.3.0, se empaquetan en el APK y funcionan offline) | - |

Estado local verificado: Claude Code 2.1.323, OpenCode v2.3.0 (`~/.config/opencode/skills`), Antigravity
instalado (`~/.gemini/antigravity`), Node 22.23. Faltan `gh`, `gemini` y `bun`.

Rutas de skills (sacadas del código de `skills` 1.9.0 y `ui-ux-pro-max-cli` 2.15.0):

| Agente | Global | Proyecto |
|---|---|---|
| Claude Code | `~/.claude/skills/` | `.claude/skills/` |
| OpenCode | `~/.config/opencode/skills/` y `~/.agents/skills/` (compartida) | `.opencode/skills/`, `.agents/skills/` |
| Antigravity | `~/.gemini/config/skills/` | `.agents/skills/` |

---

## 2. Instalación (PowerShell)

Requiere permiso explícito: descarga y ejecuta paquetes de terceros. Revisa cada comando antes de correrlo.

### 2.1 Skills globales

```powershell
npx impeccable install
```
Es interactivo: elige **global** y marca Claude Code, OpenCode y Antigravity. Acepta el hook de diseño para Claude Code. Luego `/impeccable init` dentro de cada agente.

```powershell
npm install -g ui-ux-pro-max-cli
```
```powershell
uipro init --ai claude --global
```
Para OpenCode y Antigravity, el README solo documenta `--global` para algunos agentes. Primero lista lo que detecta el CLI genérico y después instala:
```powershell
npx skills add nextlevelbuilder/ui-ux-pro-max-skill --list
```
```powershell
npx skills add nextlevelbuilder/ui-ux-pro-max-skill --skill ui-ux-pro-max design-system --global --agent opencode antigravity -y
```
(El repo trae 7 skills. `ui-styling` empuja shadcn y Tailwind, que contradicen ADR-013, así que no se instala en OpenCode ni en Antigravity.)

Estado real tras instalar (21-nov): impeccable 4.10.0 en los 3 agentes, más hooks en `~/.claude/settings.json` y `~/.gemini/config/hooks.json`, y 5 subagentes en `~/.claude/agents`. ui-ux-pro-max: 7 skills en Claude, 2 en OpenCode y Antigravity. taste-skill en los 3. webgpu solo en Claude. CLIs: playwright-cli 0.1.25, skillui 1.3.4, gemini 0.70.0 con la extensión Stitch 0.1.4 (falta la API key).
```powershell
npx skills add https://github.com/Leonxlnx/taste-skill --skill design-taste-frontend --global --agent claude-code opencode antigravity
```
```powershell
npx skills add dgreenheck/webgpu-claude-skill --global --agent claude-code
```

### 2.2 CLIs globales

```powershell
npm install -g @playwright/cli@latest
```
```powershell
npm install -g skillui
```
(opcional) Para Stitch:
```powershell
npm install -g @google/gemini-cli
```
```powershell
gemini extensions install https://github.com/gemini-cli-extensions/stitch --auto-update
```

Opcional, para PRs desde terminal:
```powershell
winget install GitHub.cli
```

### 2.3 Por proyecto (dentro del repo de la app)

```powershell
npm install @fontsource/ibm-plex-sans @fontsource/ibm-plex-mono @lottiefiles/dotlottie-web
```
```powershell
playwright-cli install --skills
```
```powershell
playwright-cli install --skills=agents
```
```powershell
curl.exe -L -o DESIGN.md https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/ibm/DESIGN.md
```
```powershell
curl.exe -L -o docs/design/wise.DESIGN.md https://raw.githubusercontent.com/VoltAgent/awesome-design-md/main/design-md/wise/DESIGN.md
```

### 2.4 Verificación

```powershell
npx skills ls --global
```
```powershell
npx impeccable detect --list-rules
```
```powershell
playwright-cli --help
```
Y en cada agente, pedirle que liste sus skills disponibles.

---

## 3. Diseños y tokens que se usan

### 3.1 Base: IBM (Carbon) desde `awesome-design-md/design-md/ibm/DESIGN.md`

Por qué: es una app de datos electorales usada en campo. Hace falta legibilidad, densidad de datos, tablas y
formularios, y transmitir neutralidad y confianza. Carbon es plano y sobrio, con un solo acento y radios de
0-4 px. Las alternativas descartadas están en ADR-011.

Complemento: `wise/DESIGN.md` solo como referencia para mensajes de éxito/error y formularios amigables.

### 3.2 Tokens (valores tomados del front matter de `ibm/DESIGN.md`)

| Token DESIGN.md | Valor | Variable Ionic / SCSS |
|---|---|---|
| primary | `#0f62fe` | `--ion-color-primary` |
| blue-60 (hover) | `#0043ce` | `--ion-color-primary-tint` (ajustar) |
| blue-80 (pressed) | `#002d9c` | `--ion-color-primary-shade` |
| ink | `#161616` | `--ion-text-color`, `--app-ink` |
| ink-muted | `#525252` | `--app-ink-muted` |
| ink-subtle | `#8c8c8c` | `--app-ink-subtle` (solo texto no esencial) |
| canvas | `#ffffff` | `--ion-background-color` |
| surface-1 | `#f4f4f4` | `--app-surface-1` (inputs, filas alternas) |
| hairline | `#e0e0e0` | `--app-hairline` |
| hairline-strong | `#161616` | borde inferior de input enfocado |
| semantic-success | `#24a148` | `--ion-color-success` |
| semantic-warning | `#f1c21b` | `--ion-color-warning` con **texto oscuro** (`--ion-color-warning-contrast: #161616`) |
| semantic-error | `#da1e28` | `--ion-color-danger` |
| inverse-canvas | `#161616` | fondo en modo oscuro |
| spacing | 4, 8, 12, 16, 24, 32, 48 px | `--app-space-1..7` |
| radius | 0-4 px | `--app-radius: 4px` |
| fuente | IBM Plex Sans (300/400/600) | `--ion-font-family` |
| números | IBM Plex Mono | `.tabular` para votos y totales |

Ajustes propios para móvil (se documentan en ADR-011):
- Texto base de 16 px; nada esencial por debajo de 14 px. `ink-subtle` no se usa para texto que haya que leer.
- Botones táctiles de al menos 44-48 px de alto (Carbon está pensado para web de escritorio).
- Los display de 60-76 px de Carbon no se usan: el máximo es 32 px.
- **Neutralidad electoral:** los gráficos del dashboard no usan colores de partidos. Paleta categórica neutra,
  con orden fijo por número de lista, y contraste verificado.
- Estados de mesa (sin veedor, pendiente, parcial, completa, con error) con color **y** texto o ícono, nunca solo color.

### 3.3 Qué aporta cada skill

- `impeccable`: crítica y auditoría de cada pantalla, y `npx impeccable detect src/` como gate de calidad.
- `ui-ux-pro-max`: patrones de formularios móviles, accesibilidad y jerarquía para dashboards.
- `taste-skill`: solo dirección de arte de las piezas visuales de Antigravity (pantalla de login, vacíos, splash). No se usa su `starter.html`.
- `playwright-cli`: capturas a 360x800 y 412x915 contra `ionic serve`, y E2E de navegador.

---

## 4. ADR de diseño y stack de UI

Continúan la numeración de PLAN.md (ADR-001 a ADR-010). Cada uno lleva la plantilla del Anexo A.

| ADR | Decisión | Alternativas descartadas | Riesgo | Verificación |
|---|---|---|---|---|
| ADR-011 sistema-de-diseno-carbon | DESIGN.md de IBM adaptado a móvil + componentes Ionic | Ionic por defecto (genérico); Wise (demasiado lúdico para datos electorales); Material de Angular (choca con Ionic) | Carbon es de escritorio: hay que agrandar áreas táctiles | Capturas de playwright-cli a 360 px + `impeccable detect` sin hallazgos críticos |
| ADR-012 tipografia-plex-fontsource | IBM Plex Sans + Plex Mono vía `@fontsource`, empaquetadas en el APK | Google Fonts por CDN (falla offline, R10); clonar `google/fonts` (3,3 GB) | Más peso en el APK: importar solo los pesos 300/400/600 y el subset latin | Modo avión: la fuente sigue cargando; tamaño del APK anotado |
| ADR-013 estilos-ionic-css-vars-scss | Variables CSS de Ionic + SCSS con tokens en `src/theme/` | Tailwind (duplica el theming de Ionic y añade una dependencia); CSS-in-JS | Que los tokens se desvíen del DESIGN.md | Cero colores hex fuera de `src/theme/` (grep en CI) |
| ADR-014 motion-y-assets | SVG + transiciones CSS por defecto; dotLottie solo para 2-3 estados (sincronizando, éxito, vacío). Presupuesto: 150 KB por Lottie y 1 MB de assets en total | `lottie-web` (más pesado); GIF/MP4; sin animación | Animaciones en Android de gama baja: respetar `prefers-reduced-motion` | Medición en un teléfono real y el tamaño de `src/assets` |
| ADR-015 coordinacion-multiagente | Archivo de contexto compartido + tablero en el repo + ramas y PR por agente, con propiedad de carpetas | 1code (solo orquesta Claude/Codex, requiere bun o pago); coordinar a mano por chat | Conflictos si dos agentes tocan el mismo archivo | Ningún PR mezcla carpetas de dueños distintos |
| ADR-016 sin-webgpu | No usar WebGPU/Three.js en la app | Mapa o dashboard 3D | Ninguno funcional: es una app de formularios y datos | - |
| ADR-017 graficos-dashboard | Chart.js con la paleta neutra del 3.2 | ngx-charts; SVG hecho a mano | Accesibilidad de los gráficos: añadir una tabla equivalente | Test del mapeo datos -> serie y revisión de contraste |

El stack base (Ionic Angular standalone, Firebase Blaze, signals, Capacitor) ya está en ADR-001 a ADR-006 de PLAN.md.

---

## 5. Roles

Regla: **cada carpeta tiene un solo dueño**. Para tocar algo ajeno se abre una tarea en el tablero y se le asigna al dueño.

### Claude Code: solo programación (lógica, datos, cableado)
- Dueño de: `src/app/core/`, `src/app/domain/`, `src/app/data/`, rutas y guards, stores (signals), `functions/src/`, `firestore.rules`, `storage.rules`, `firestore.indexes.json`, `seed/`, tests unitarios, de reglas y E2E, `docs/adr/`.
- **No** instala dependencias, no hace scaffold, no configura la consola de Firebase y no compila el APK: eso es de Antigravity. Si necesita una librería, la pide en BOARD.md.
- Escribe los **contratos** de componentes antes de que OpenCode haga la UI: inputs, outputs, estados y datos de ejemplo.
- Conecta las páginas de presentación con stores y servicios.
- Revisa y prepara el merge de todos los PR. El merge final lo hago yo.

### OpenCode: UI, layouts y componentes reutilizables
- Dueño de: `src/app/shared/ui/`, plantillas y SCSS de `src/app/features/**` (`*.html`, `*.scss`, componentes de presentación sin lógica de datos), `src/theme/` (tokens, tipografía).
- Implementa los tokens de la sección 3.2 en `src/theme/tokens.scss` y `variables.scss`.
- Construye componentes puros (`@Input`/`@Output` o `input()`/`output()`), sin inyectar repositorios: `state-view`, `acta-form-grid`, `mesa-status-chip`, `progress-bar`, `kpi-tile`, `cedula-input`, `photo-preview`.
- Layouts responsive (360 a 1024 px), modo oscuro y accesibilidad.
- Usa impeccable y ui-ux-pro-max. Antes de entregar corre `npx impeccable detect src/` y saca capturas con playwright-cli.

### Antigravity: setup, Firebase, build del APK + assets visuales y motion
- **Setup (prioridad 1):** scaffold de Ionic Angular standalone + Capacitor Android, todas las instalaciones de npm, `firebase-tools`, `firebase init` (firestore, storage, functions TS, emulators), `functions/package.json`, permisos en `AndroidManifest.xml`, `firebase deploy`, el APK debug cada día y el release firmado el miércoles.
- Dueño de: `package.json` y lockfiles, `angular.json`, `capacitor.config.ts`, `firebase.json`, `.firebaserc`, `android/`, `functions/package.json`, `src/assets/` (svg, lottie, img, icons), `src/theme/motion.scss`, `resources/` (ícono y splash), `docs/design/mockups/`.
- Lo que exige tu cuenta lo haces tú en la consola: crear el proyecto, activar Blaze, la alerta de 1 USD y el bucket en us-central1.
- Ilustraciones SVG para estados vacíos y de error, íconos que falten en Ionicons, el ícono de la app y el splash.
- Lottie o dotLottie para sincronizando, acta guardada y sin conexión, dentro del presupuesto de ADR-014.
- Generación de imágenes solo si tu versión de Antigravity la ofrece. Nada con logos o colores de partidos reales.
- Mockups con Stitch solo si se instala Gemini CLI; si no, mockups en el propio Antigravity.
- Registra cada asset en `src/assets/MANIFEST.md`: archivo, peso, origen o prompt, licencia y quién lo usa.
- Genera los íconos y el splash de Android con `npx @capacitor/assets generate` (paquete 4.0.0; revisar `--help` antes de usarlo).

### 5.1 Agentes concretos por herramienta (se crean en T-002)

Cada rol se materializa en agentes con permisos limitados a sus carpetas. Así la propiedad de carpetas la hace cumplir la herramienta, no solo la disciplina.

**Claude Code** (subagentes en `.claude/agents/*.md` del proyecto):

| Agente | Hace | Puede escribir en |
|---|---|---|
| (sesión principal) | Programa core, domain, data y stores; escribe contratos; cablea páginas; integra PR | código de la app, con revisión mía |
| `backend-firebase` | Firestore y Storage Rules, Cloud Functions (crearUsuario, loginCedula, recuperarPassword, auditoría), seed | `firestore.rules`, `storage.rules`, `functions/src/`, `seed/` |
| `logic-tester` | Tests de `domain/` y `data/`, tests de reglas con el emulador, E2E con playwright-cli | `src/**/*.spec.ts`, `tests/`, `e2e/` |
| `impeccable-finish-reviewer` (ya instalado) | Revisa la UI que entrega OpenCode contra DESIGN.md antes del merge | solo lectura |
| `impeccable-motion-reviewer` (ya instalado) | Revisa los Lottie y transiciones de Antigravity, incluido reduced-motion | solo lectura |

**OpenCode** (agentes en `.opencode/agents/*.md` del proyecto; formato verificado: carga `{agent,agents}/**/*.md`):

| Agente | Modo | Hace | Permisos |
|---|---|---|---|
| `ui-builder` | primary | Componentes de `shared/ui/` y plantillas y SCSS de `features/` según los contratos | editar solo `src/app/shared/ui/**`, `src/app/features/**/*.html`, `*.scss`; denegar `*.env`, `functions/**`, `*.rules`, `core/**`, `data/**` |
| `theme-tokens` | subagent | Traduce DESIGN.md a `src/theme/` y vigila que no haya hex fuera de theme | editar solo `src/theme/**` (excepto `motion.scss`) |
| `responsive-qa` | subagent | Capturas con playwright-cli a 360, 412 y 768 px y `impeccable detect` | solo lectura + bash |

Comprobación tras crearlos: `opencode debug agents` debe listarlos con sus permisos.

**Antigravity** (reglas de workspace + skills instalados):

| Agente o flujo | Hace | Escribe en |
|---|---|---|
| `setup-build` | Scaffold, `npm install`, `firebase init` y deploy, `cap sync`, `gradlew assembleDebug/Release`, y reporta la ruta y el tamaño del APK | `package.json`, configs, `android/`, `functions/package.json` |
| `asset-designer` | SVG de estados, íconos, ícono de app y splash | `src/assets/svg|icons`, `resources/` |
| `motion-designer` | dotLottie y `motion.scss` dentro del presupuesto | `src/assets/lottie`, `src/theme/motion.scss` |
| `mockups` (opcional) | Mockups con Stitch o en el propio Antigravity | `docs/design/mockups/` |

Pendiente de verificar en T-002, en la interfaz de Antigravity: dónde lee las reglas y los flujos de workspace en tu versión. impeccable ya instaló su hook para Antigravity en `~/.gemini/config/hooks.json`. Cada asset termina con una entrada en `src/assets/MANIFEST.md`.

---

## 6. Coordinación (ADR-015)

Tres mecanismos complementarios, todos dentro del repo para que queden como evidencia:

### 6.1 Contexto compartido: `AGENTS.md` en la raíz
- Fuente única: stack, enlaces a PLAN.md y DESIGN.md, reglas de propiedad de carpetas, comandos de verificación y convenciones de commits.
- OpenCode lee `AGENTS.md`. `CLAUDE.md` contiene `@AGENTS.md` para importarlo. En Antigravity, apuntar sus reglas de workspace a `AGENTS.md` (comprobar en su configuración qué archivo de reglas lee tu versión).
- `DESIGN.md` en la raíz es el contrato visual. Nadie inventa colores fuera de él.

### 6.2 Tablero: `docs/agents/BOARD.md`
```
| ID    | Tarea                         | Dueño       | Estado      | Rama                     | Depende de |
| S-01  | Scaffold Ionic + Capacitor    | antigravity | done        | agent/antigravity/S-01   | -          |
| T-004 | tokens.scss desde DESIGN.md   | opencode    | in-progress | agent/opencode/T-004     | T-001      |
```
Estados: `todo`, `in-progress`, `review`, `done`, `blocked`. Un agente solo toma tareas `todo` suyas cuyas dependencias estén en `done`.

### 6.3 Handoff por ramas y PR
- Una rama por tarea: `agent/<claude|opencode|antigravity>/T-xxx-slug`, creada desde `main` actualizado.
- Commits: `feat(ui): mesa-status-chip [T-006][ADR-011]`.
- PR con plantilla `.github/pull_request_template.md`: tarea, ADR, capturas a 360 px, checklist (lint, test, build, impeccable, presupuesto de assets) y qué hizo la IA.
- Si no instalas `gh`, el "PR" es un merge local revisado: `git diff main...rama`, y lo registro en BOARD.
- Los contratos viven en `docs/agents/contracts/<componente>.md`. Claude los escribe, OpenCode los implementa y Claude los conecta.
- Los handoffs de assets van en `src/assets/MANIFEST.md`.

### 6.4 Gates antes de cualquier merge
```powershell
npm run lint
```
```powershell
npm test -- --watch=false
```
```powershell
npm run build
```
```powershell
npx impeccable detect src/
```
Además: el grep de hex fuera de `src/theme/` sale vacío y `src/assets` pesa menos de 1 MB.

---

## 7. Estructura de carpetas

```
EleccionesEPN/
  AGENTS.md                      contexto compartido (todos)
  CLAUDE.md                      @AGENTS.md + notas de Claude
  DESIGN.md                      IBM/Carbon adaptado (contrato visual)
  .github/pull_request_template.md
  docs/
    PLAN.md  PLAN-AGENTES.md  IA.md
    adr/                         ADR-001 ... ADR-017                  [claude]
    agents/BOARD.md              tablero                             [todos]
    agents/contracts/            contratos de componentes            [claude]
    design/wise.DESIGN.md        referencia secundaria
    design/mockups/                                                  [antigravity]
  resources/                     icon.png, splash.png                [antigravity]
  firebase.json .firebaserc                                          [antigravity]
  firestore.rules storage.rules firestore.indexes.json               [claude]
  functions/  package.json [antigravity]  src/ [claude]
  seed/  tests/rules/                                                [claude]
  android/  package.json  angular.json  capacitor.config.ts          [antigravity]
  src/
    theme/  tokens.scss variables.scss typography.scss   [opencode]
            motion.scss                                  [antigravity]
    assets/ svg/ lottie/ img/ icons/ MANIFEST.md         [antigravity]
    app/
      core/ domain/ data/                                [claude]
      shared/ui/                                         [opencode]
      features/<rol>/<pagina>/
        *.page.ts    (inyección de stores, wiring)       [claude]
        *.page.html / *.page.scss                        [opencode]
        components/  (presentación pura)                 [opencode]
  e2e/                           specs de Playwright                 [claude]
  .claude/skills/  .agents/skills/   (playwright-cli por proyecto)
```

---

## 8. Sprint 1 (replanificado: lunes 23)

**Tareas de setup de Antigravity (van primero; desbloquean todo):**

| ID | Tarea | Hecho cuando |
|---|---|---|
| S-01 | `git init` + scaffold Ionic Angular standalone + Capacitor Android | `ionic serve` abre |
| S-02 | Instalar `firebase`, `@capacitor/camera`, `@capacitor/geolocation`, `@capacitor/network`, `@fontsource/ibm-plex-sans`, `@fontsource/ibm-plex-mono`, `chart.js`; skills de playwright-cli en el proyecto | `npm run build` sin errores |
| S-03 | `firebase-tools` + `firebase init` (firestore, storage, functions TS, emulators); `environment.example.ts` | los emuladores arrancan |
| S-04 | Permisos de Android + primer `assembleDebug` instalado en el teléfono | el APK abre |
| S-05 | `firebase deploy` de reglas y Functions cuando Claude las entregue | deploy sin errores |
| S-06 | APK debug diario; APK release firmado el miércoles + GitHub Release | APK enlazado en el README |

La tabla de abajo es la planificación original. Ahora T-001 pasa a ser S-01 a S-04 de Antigravity, y Claude arranca con T-002, T-003, T-005 y la lógica de `domain/`.

### Plan original (sáb 21 - dom 22)

Objetivo: base andando en el teléfono, con sistema de diseño aplicado y los tres agentes trabajando sin pisarse.

| ID | Tarea | Dueño | Hecho cuando |
|---|---|---|---|
| T-000 | Instalar skills y CLIs (sección 2) y verificar | yo | **Hecho 21-nov.** Pendiente: decidir si se quita `ui-styling` de Claude (contradice ADR-013), API key de Stitch, `gh` |
| T-001 | (reemplazada por S-01 a S-04 de Antigravity) | antigravity | El APK abre en el teléfono |
| T-002 | AGENTS.md, CLAUDE.md, BOARD.md, plantilla de PR, DESIGN.md adaptado (sección 3.2) y los agentes de la sección 5.1 | claude | Los tres agentes responden citando AGENTS.md; `opencode debug agents` muestra `ui-builder`, `theme-tokens` y `responsive-qa` |
| T-003 | Redactar ADR-011 a ADR-017 en `docs/adr/` | claude (yo reviso) | Plantilla completa y enlazada al commit |
| T-004 | `src/theme/` con tokens, Plex vía fontsource y modo oscuro | opencode | Cero hex fuera de theme; la fuente carga en modo avión |
| T-005 | Contratos: `state-view`, `mesa-status-chip`, `acta-form-grid`, `kpi-tile` | claude | `docs/agents/contracts/*.md` con inputs, outputs y estados |
| T-006 | Implementar los componentes de T-005 + página demo `/dev/ui` (solo en debug) | opencode | Capturas a 360 y 412 px; impeccable sin hallazgos críticos |
| T-007 | Ícono, splash, 3 SVG de estados (vacío, error, sin conexión) | antigravity | MANIFEST.md completo; dentro del presupuesto |
| T-008 | Lottie de "sincronizando" y "acta guardada" (dotLottie) | antigravity | Menos de 150 KB cada uno; respeta reduced-motion |
| T-009 | Layout del login por cédula y del cambio de contraseña (solo presentación) | opencode | Usa `cedula-input` y `state-view` |
| T-010 | Cablear el login con AuthService (Firebase, loginCedula + custom token) y los guards | claude | Login real; la redirección por rol funciona |
| T-011 | Captura E2E del login con playwright-cli | claude | Capturas en `docs/design/` |
| T-012 | Registrar en `docs/IA.md` los prompts y lo aceptado o rechazado de cada agente | yo | Una entrada por tarea |

Paralelo seguro: T-004, T-005 y T-007 no comparten archivos. T-006 depende de T-004 y T-005. T-010 depende de T-009.

Sprint 2 (lun 23 - mar 24): flujo del veedor (`acta-form-grid` + cámara + GPS), los dos coordinadores y el dashboard (ADR-017), y el APK release. Lo funcional de PLAN.md manda sobre el pulido visual.

---

## 9. Riesgos

| Riesgo | Mitigación |
|---|---|
| El tiempo se va en diseño y no en R6 (4,2 pts) | El sistema de diseño cierra el domingo. Desde el lunes, las tareas de OpenCode y Antigravity solo sirven a pantallas funcionales |
| Skills de terceros ejecutan scripts (taste-skill, impeccable hook) | Leer qué instala cada uno; no darles secretos; revisar los diffs |
| Agentes que pisan archivos | Propiedad de carpetas + una rama por tarea + gate en el PR |
| El APK engorda por fuentes y Lottie | Subset latin, solo 3 pesos, presupuesto de assets en el gate |
| La defensa pregunta por código de IA | `docs/IA.md` al día; repasar cada PR antes del merge |
| Assets con marcas o partidos reales | Prohibido en AGENTS.md; datos y organizaciones ficticias en el seed |
