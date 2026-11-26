# BLACKDOT Portfolio 2.0

Portafolio de **Danna Rueda**, estudiante de Ingeniería Multimedia.
Sitio estático en HTML, CSS y JavaScript *vanilla* (sin frameworks ni compilación), compatible con GitHub Pages.

Sitio actual: https://dannavalentinar11-beep.github.io/blackdot-portafolio/

## Tercer previo de Ingeniería Web (Universidad Simón Bolívar)

| Requisito | Dónde está |
|---|---|
| Vistas `index.html`, `blog.html`, `contacto.html`, `arcade.html`, `ar-experience.html` | raíz del proyecto (misma cabecera, footer y tema) |
| Ping-Pong 2D · Fútbol 2D Atari (IA y 2 jugadores) · Juego de aviones 3D | `pingpong.html`, `futbol.html`, `juegos/skybound.html` (en `arcade.html`, grupo «Asignatura») |
| WebAR con A-Frame / WebXR y raycaster | `ar-experience.html` + `js/ar-experience.js` |
| localStorage (marcadores, récords, métricas, tema) | `js/storage.js`, `js/halloffame.js`, `js/metrics-panel.js` |
| Despliegue HTTPS y CI/CD | GitHub Pages · `docs/DESPLIEGUE.md` |
| Manual técnico PDF 1920×1080 | `docs/Manual-Tecnico-Auditoria-Infraestructura-BLACKDOT.pdf` (también en `assets/manual-tecnico-blackdot.pdf`) |
| Evidencias W3C y Lighthouse | `docs/evidencias/` |
| Guion de sustentación (5 min) | `docs/Guion-Sustentacion-5-minutos-BLACKDOT.pdf` |
| Informe de pruebas | `docs/INFORME-PRUEBAS-3ER-PREVIO.md` |

## Novedades de la versión 2.0

| Área | Cambio |
|---|---|
| Arcade | **6 juegos** en dos grupos y con el mismo orden en todas las interfaces. Asignatura: 01 Ping-Pong 2D (Pixel Pong) · 02 Fútbol 2D Atari · 03 Aviones 3D (Sky Bound). Colección BLACKDOT: 04 Cúcuta Open World · 05 Dynasty FC · 06 Rally Rush. La sala completa vive en `arcade.html`; el inicio muestra una vitrina. |
| Tema | Modo claro/oscuro **global**: un solo sistema de variables en `css/tokens.css`, sin secciones forzadas a oscuro (se eliminó `.zone-dark`). Recuerda la elección (`blackdot-theme`) y, si no hay elección, sigue el tema del sistema. La sala 3D del arcade y el visor 3D también cambian de tema. |
| Proyectos | Galería editorial en CSS Grid: filas alineadas, imágenes completas sin recortes ni deformaciones (`object-fit: contain` y anchos proporcionales a cada relación de aspecto). El video vertical se muestra vertical. |
| Herramientas | Organizadas en 5 categorías con tarjetas uniformes. |
| **BLACKDOT 3D LAB** | Visor 3D interactivo de BLACKDOT, KAIRO y NOX con sus animaciones originales de Blender. |
| **Cinemática** | Video final 1920×1080 integrado con póster, controles y pantalla completa. |

## Estructura

```
index.html                    Portafolio (una página por secciones)
css/tokens.css                Tokens de diseño y tema (única fuente de verdad)
css/style.css                 Estilos base (versión original, sin sus tokens)
css/blackdot2.css             Capa visual 2.x (hero, arcade, ficha, récords, footer)
css/blackdot-v2.css           Capa 2.0: adaptación al tema, proyectos, herramientas, 3D Lab, cinemática
js/script.js                  Lógica del portafolio, tema global, datos, modales y reproductor de juegos
js/arcade.js / arcade3d.js    BLACKDOT Arcade (sala 3D con Three.js o modo ligero)
js/halloffame.js              Salón de la fama (récords de los 6 juegos en LocalStorage)
js/motion.js                  GSAP + ScrollTrigger (opcional)
js/lab3d.js                   Visor de BLACKDOT 3D LAB y reproductor de la cinemática (módulo ES)
js/lab3d-characters.js        Configuración de personajes (añadir uno nuevo = añadir un objeto)
juegos/                       Los 4 videojuegos 3D (sin cambios en su funcionamiento)
assets/models/                blackdot.glb · kairo.glb · nox.glb (Draco + texturas WebP)
assets/video/                 blackdot-cinematic-final.mp4 y videos de proyectos
assets/img/                   Imágenes originales del portafolio y del arcade
pingpong.html · futbol.html   Ping-Pong 2D y Fútbol 2D Atari (Canvas 2D) · js/pingpong.js, js/futbol.js, live-coding/
arcade.html · blog.html · contacto.html · ar-experience.html   Vistas dedicadas
js/storage.js · js/metrics-panel.js · js/ar-experience.js   Persistencia, métricas y WebAR
docs/                         Informes técnico y de pruebas, pendientes y scripts del pipeline 3D/video
```

## Ejecutar en local

El sitio usa módulos ES y carga modelos 3D, así que **no se debe abrir con doble clic (`file://`)**: hace falta un servidor estático.

Opción 1 — VS Code: extensión *Live Server* → clic derecho en `index.html` → *Open with Live Server*.

Opción 2 — Node.js (incluido en el proyecto, con soporte de rangos para el video):

```powershell
node docs/pipeline/servidor_local.js . 8765
```

Luego abre http://localhost:8765/

Opción 3 — Python:

```powershell
python -m http.server 8765
```

> Se necesita conexión a Internet para Google Fonts, GSAP y Three.js (cdn.jsdelivr.net). Sin conexión el portafolio funciona; el arcade pasa a modo ligero y el 3D Lab muestra un mensaje de error comprensible.

## Publicar en GitHub Pages

1. Copia el contenido de esta carpeta en la raíz del repositorio `blackdot-portafolio` (conserva `.nojekyll`).
2. `git add .` → `git commit -m "BLACKDOT 2.0"` → `git push`.
3. En GitHub: *Settings → Pages → Deploy from a branch → main / (root)*.
4. Espera 1–2 minutos y abre `https://dannavalentinar11-beep.github.io/blackdot-portafolio/`.

Todas las rutas son relativas y respetan mayúsculas/minúsculas. El archivo más pesado (el video, 49,7 MB) está por debajo del límite de 100 MB por archivo de GitHub.

## Añadir un personaje al 3D Lab

1. Exporta el GLB a `assets/models/` (se puede reutilizar `docs/pipeline/blender_export_personaje.py`).
2. Añade un objeto a `LAB_CHARACTERS` en `js/lab3d-characters.js` (nombre, descripción, modelo, portada, clips y tramos de animación).
3. No hay que modificar `js/lab3d.js` ni el HTML.

## LocalStorage

| Clave | Uso |
|---|---|
| `blackdot-theme` | Tema elegido (`light` / `dark`) |
| `blackdot-arcade-mode` | Sala 3D o modo ligero |
| `blackdot-hall-v1` | Registro central de récords |
| `cow_save_v1_*`, `dynastyfc.progress`, `skybound.*`, `rallyrush_v1` | Guardado de cada juego (sin cambios) |

`blackdot-football` y `blackdot-pixelpong-v1` guardan las estadísticas e historial de marcadores de los juegos 2D; `blackdot-metrics-v1` guarda las métricas de interacción (ver `js/storage.js`).

Documentación detallada: `docs/INFORME-TECNICO.md`, `docs/INFORME-PRUEBAS.md`, `docs/RECURSOS-PENDIENTES.md`.
