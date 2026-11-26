# BLACKDOT 2.0 — Informe técnico de cambios

Fecha: 25 de noviembre de 2026 · Base: `blackdot-portafolio-main.zip` (versión 2.3 del sitio).

## 1. Auditoría inicial (resumen)

- **Arquitectura**: una página (`index.html`) + `js/script.js` (datos, tema, modales, reproductor en iframe) + `js/arcade.js`/`js/arcade3d.js` (sala 3D, Three.js 0.160 vía importmap) + `js/halloffame.js` (récords) + `js/motion.js` (GSAP). Estilos en `css/style.css` y `css/blackdot2.css`.
- **Problemas detectados**
  1. Tokens de color definidos dos veces (`style.css` y `blackdot2.css`) y la clase `.zone-dark` forzaba a oscuro el hero, el arcade, el footer y la ficha de juego aunque se eligiera el modo claro. Muchos colores fijos (`#fff`, `rgba(4,9,16,…)`) en esas zonas.
  2. Proyectos: `object-fit: cover` generalizado; el póster de «Edición de video» es **vertical (720×1280)** y se recortaba en una caja horizontal; las tres imágenes 3D (16:9) se recortaban a columnas estrechas; tarjetas con `margin-top` y parallax GSAP que las desalineaban.
  3. Herramientas: 4 grupos de 2 sin criterio de categoría; el contenido de los botones usaba `<h3>` (no válido dentro de `<button>`).
  4. Seis juegos en el arcade, con referencias a los dos retirados en datos, estaciones 3D, modo ligero, récords, footer, textos («6 videojuegos», «06 juegos jugables», «/ 06»), plantillas SVG y portada del gate.
  5. En la raíz había **36 archivos duplicados** (copias idénticas o versiones antiguas de `css/`, `js/`, `juegos/`, `assets/` y `live-coding/`) que ninguna página usaba.
  6. El menú móvil tenía numeración repetida y un enlace duplicado al manual.
- **Copia de seguridad**: el ZIP original no se modificó; además se conservó una copia extraída intacta con su manifiesto MD5 (107 archivos) fuera de la entrega.

## 2. Archivos modificados, nuevos y retirados

| Archivo | Estado | Motivo |
|---|---|---|
| `index.html` | Modificado | Tema en `<head>`, navegación (3D Lab), menú móvil, contadores (4 juegos), arcade, récords, proyectos, herramientas, nuevas secciones `#lab` y `#cinematica`, footer, modales, scripts |
| `css/tokens.css` | **Nuevo** | Tokens semánticos (`--bg-primary`, `--surface`, `--text-primary`, `--border-color`, `--accent`, `--card-background`…) para oscuro y claro + alias de compatibilidad |
| `css/blackdot-v2.css` | **Nuevo** | Adaptación de todos los componentes al tema, galería de proyectos, herramientas, 3D Lab, cinemática, accesibilidad y responsive |
| `css/style.css` | Modificado | Se retiraron sus bloques de tokens y la regla de tema por `prefers-color-scheme` (ahora en tokens.css) |
| `css/blackdot2.css` | Modificado | Se retiraron tokens, `.zone-dark` y los bloques antiguos de proyectos/herramientas; modo ligero a 4 columnas |
| `js/script.js` | Modificado | GAMES (4), PROJECTS (textos de 4 juegos, enlace al Lab), TOOLS por clave, tema global con seguimiento del sistema, partículas del hero según el tema |
| `js/arcade.js` | Modificado | Orden único, total dinámico de estaciones, paso del tema a la sala 3D |
| `js/arcade3d.js` | Modificado | Sin escenografías de los juegos retirados, pasillo y pantalla principal según el número de juegos, `setTheme()` (fondo, niebla, suelo, muros, luces, entorno) |
| `js/halloffame.js` | Modificado | Sin adaptadores de los juegos retirados, orden único, contador total dinámico |
| `js/motion.js` | Modificado | Sin parallax en tarjetas de proyectos; animación escalonada aplicada a las nuevas categorías de herramientas |
| `js/lab3d.js`, `js/lab3d-characters.js` | **Nuevos** | Visor 3D y configuración de personajes; reproductor de la cinemática |
| `assets/models/*.glb` | **Nuevos** | BLACKDOT, KAIRO y NOX separados |
| `assets/video/blackdot-cinematic-final.mp4` | **Nuevo** | Cinemática final |
| `assets/img/blackdot-cinematic-poster.webp` | **Nuevo** | Póster (fotograma 300 del video original) |
| `archivo/juegos-retirados/` | Movido | `futbol.html`, `pingpong.html`, sus CSS/JS, `live-coding/` y 8 capturas: conservados y funcionales, sin enlaces desde el sitio |
| 36 duplicados de la raíz | Retirados de la entrega | Ninguna página los usaba; siguen en la copia de seguridad |

Los cuatro juegos (`juegos/*.html`) **no se modificaron**.

## 3. Sistema de tema

- Fuente única: `<html data-theme="dark|light">`. El script del `<head>` lo fija antes de pintar (preferencia guardada o la del sistema). `initTheme()` alterna, guarda en `blackdot-theme` (clave original), sigue el tema del sistema si la persona no eligió, actualiza `theme-color`, `aria-pressed` y emite `themechange`.
- Todos los componentes usan variables; los colores compuestos (hero, arcade, cristal sobre 3D, footer, estudio 3D) también son tokens.
- El cian `#65C3CC` no se usa como texto en claro (2:1 sobre blanco); el acento de texto pasa a `#0B5C91`. Los colores propios de cada juego se oscurecen en claro con `color-mix`.
- Solo dos superficies son siempre oscuras por ser **pantallas**: el reproductor de juegos (`.media-dark`) y el lienzo del video.
- Contraste medido en claro: todos los textos revisados ≥ 5,7:1 (WCAG AA).

## 4. BLACKDOT 3D LAB

### 4.1 Auditoría del GLB (111 MB) y del .blend

- GLB: 408 nodos, 296 mallas, 45 materiales, 14 imágenes (50 MB en PNG 4K), 3 skins, 18 animaciones.
- Estructura: `POS_BLACKDOT › Rig_BLACKDOT` (27 huesos, 9 mallas + patineta unida al hueso `Tabla`), `POS_KAIRO › Rig_KAIRO` (22 huesos, 12 mallas; la katana vive en `TT_KAIRO` y se une a la mano con una restricción *Child Of* a `KAIRO_Katana_Agarre`), `POS_NOX › Rig_NOX` (20 huesos, 13 mallas + linterna de 32 piezas en la mano derecha). El resto (219 mallas) es el showroom.
- **Las 14 animaciones `OBJ_01…OBJ_14` no son de personajes**: cada una mueve un único *empty* (2 claves) que sirve de objetivo a las cámaras `CAM_01…CAM_14`, que no estaban exportadas en el GLB. Se descartaron para el visor.
- Animaciones reales de personajes (verificadas en el .blend): `BD_Skate_Keyframes` (fot. 151–935), `ACC_Rig_KAIRO` (1–935), `NOX_Keyframes` (720–935) y, guardadas con usuario falso, `ACC_Rig_BLACKDOT` (1–840) y `ACC_Rig_NOX` (1–840). Las 33 acciones `Armature…|mixamo.com` no corresponden a estos esqueletos.
- **Verificación**: se midió el movimiento de todos los huesos fotograma a fotograma (`docs/pipeline/blender_medir_movimiento.py`) y se renderizaron fotogramas de control. Resultados: BLACKDOT se mueve en 155–410 (recorre ~9 m) y salta de vuelta en el fotograma 886 (reinicio para la toma final, excluido); KAIRO tiene reposo hasta 315, acción 316–520 y katana 556–710; NOX actúa en 720–860. Los nombres de los tramos salen de las cámaras de la cinemática (`CAM_T03_BD_Inicio`, `CAM_T06_BD_Ollie_CamLenta`, `CAM_T10_KA_Patada`, `CAM_T18_NOX_Salto`…) y coinciden con lo medido (p. ej. el pico de movimiento de 281–311 es el ollie).

### 4.2 Separación de modelos

Viable sin pérdida: se exportaron desde el `.blend` original con el mismo exportador (Blender 5.2, glTF I/O) solo los subárboles de cada personaje (`docs/pipeline/blender_export_personaje.py`):

| Modelo | Tamaño | Mallas | Vértices | Huesos | Materiales | Texturas | Clips |
|---|---|---|---|---|---|---|---|
| blackdot.glb | 3,8 MB | 10 | 422.429 | 27 | 3 | 6 | Coreografia (9,0 s), Presentacion_Alterna (28 s) |
| kairo.glb | 1,7 MB | 22 | 143.040 | 22 | 8 | 5 | Coreografia (23,8 s, incluye katana) |
| nox.glb | 2,5 MB | 45 | 347.371 | 20 | 10 | 3 | Coreografia (6,2 s), Coreografia_Alterna (28 s) |

- Geometría con **Draco** (cuantización 14 bits posición): sin decimar mallas.
- Texturas 4096 px → **2048 px WebP** (calidad 85). De 111 MB a 8,4 MB en total.
- La katana se **horneó** fotograma a fotograma (posición/rotación mundial evaluada con la restricción activa) para que el agarre funcione en la web.
- Animaciones por pistas NLA: una pista = un clip; las acciones del esqueleto y de la katana se fusionan en el mismo clip.
- **Corrección de material**: el exportador escribe el color de *sheen* sin aplicar su peso (en Blender el peso es 0,08 en KAIRO y 0,1 en NOX), lo que hacía ver gris a KAIRO. Se multiplicó el color por el peso real (`docs/pipeline/corregir_sheen_glb.js`).

### 4.3 Visor

- Carga diferida: Three.js, GLTFLoader, DRACOLoader (decodificador de la misma versión 0.160.0), OrbitControls y RoomEnvironment se descargan al pulsar «Ver en 3D»; luego el GLB con barra de progreso.
- Estudio: luz principal con sombras suaves, relleno frío, contorno cian/azul, entorno PMREM neutro, sombra de contacto y aro del color del personaje; fondo y suelo según el tema.
- Controles: rotar, zoom, desplazar (ratón y táctil), centrar, giro automático, **«En el sitio»** (mantiene la pelvis en el centro aunque la animación desplace al personaje; BLACKDOT recorre ~9 m), pantalla completa (API nativa o alternativa CSS en iPhone), teclado (flechas, + y −, 0).
- Animación: selector de tramos legibles, reproducir/pausar, línea de tiempo y reloj. Los tramos se generan con todas las pistas muestreadas en sus extremos para que ningún hueso quede sin datos; cambio con fundido de 0,35 s (instantáneo si está en pausa o con movimiento reducido).
- Rendimiento y memoria: un solo renderer; al cambiar de personaje se liberan geometrías, materiales y texturas; render suspendido fuera de pantalla o con la pestaña oculta; degradación automática (resolución y luego sombras) si no se alcanzan ~30 fps.
- Errores comprensibles: sin WebGL, fallo de CDN, fallo de Draco, fallo de descarga del modelo y pérdida de contexto WebGL (con «Reintentar»). Todos se registran en consola.

## 5. Cinemática

- Archivo usado: `BLACKDOT_CINEMATIC_FINAL.mp4` (1920×1080, 30 fps, 40,0 s, H.264 + AAC 48 kHz estéreo, 133 MB ≈ 27 Mbit/s).
- El adjunto `vUipdOeuTe2qQsGf4qh7Ug.mp4` resultó ser otro video (1280×720, 30,4 s, sin audio); no se usó.
- 133 MB supera el límite de 100 MB por archivo de GitHub. Se recodificó con el FFmpeg integrado de Blender conservando resolución, fps, duración y audio (H.264 CRF «alta», preset «best», AAC 192 kbit/s) → **49,7 MB**. Calidad medida frente al original: PSNR 36–42 dB en 7 fotogramas, sin desplazamiento de color. Se movió el índice `moov` al inicio (*faststart*) para empezar a reproducir sin descargar todo.
- `<video controls preload="metadata" playsinline>` con póster, botón grande de reproducción, sin reproducción automática, pantalla completa, pausa automática al salir de la sección y mensajes de error.

## 6. Accesibilidad

Foco visible en todos los controles, `aria-pressed` en conmutadores, pestañas accesibles con flechas en el selector de personajes, lienzo 3D enfocable y manejable con teclado, textos alternativos conservados y añadidos, `aria-live` en la ficha del personaje, respeto de `prefers-reduced-motion` (el visor arranca en pausa y sin fundidos), contraste AA en ambos temas.

## 7. Ajustes posteriores
- Hero en modo claro: se quitó el desvanecimiento del texto al hacer scroll (heredado de `js/motion.js`) y se oscureció el degradado de «hecha».
- Personajes 3D: los renders originales tienen un fondo gris plano (RGB 59,59,59). Se crearon versiones recortadas con transparencia (`assets/img/modelo-*-recorte.webp`, relleno desde los bordes con barrera en las siluetas y bordes suavizados) y se presentan en un estudio con foco y sombra de suelo que se adapta al tema. Los renders originales se conservan sin cambios.
- Contacto: el formulario ya no depende de que la persona tenga un programa de correo. Envía el mensaje directo al correo con FormSubmit (`fetch` a `formsubmit.co/ajax/…`, apto para GitHub Pages), con campo trampa antispam, estado de envío y mensajes de error con alternativas (WhatsApp o correo). Nuevo botón «Enviar por WhatsApp» con el mensaje prellenado. Requiere activar FormSubmit una vez desde el correo.
