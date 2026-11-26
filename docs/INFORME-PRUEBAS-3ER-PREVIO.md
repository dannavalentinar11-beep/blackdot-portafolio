# BLACKDOT — Informe de pruebas · Tercer previo de Ingeniería Web

Fecha: 25–26 de noviembre de 2026. Entorno: Windows 11, Google Chrome (sin ventana, controlado por Chrome DevTools Protocol con `docs/pipeline/cdp_test.js`), servidor estático local con gzip sirviendo el sitio bajo una subruta (`/blackdot-2.0/`), equivalente a la subruta `/blackdot-portafolio/` de GitHub Pages.

Leyenda: ✅ aprobada · ⚠️ aprobada con observación · ⏳ pendiente (requiere algo que no está disponible en este entorno).

| Requisito del previo | Prueba | Resultado |
|---|---|---|
| Vistas index, blog, contacto, arcade y ar-experience | Las 5 abren, tienen `h1`, navegación de 9 enlaces con la vista actual marcada (`aria-current`) | ✅ |
| Enlaces | Todos los enlaces internos de las 5 vistas responden 200 | ✅ |
| Modo claro / oscuro global | El botón cambia `data-theme` en todas las vistas; la elección persiste al reabrir el navegador | ✅ |
| Ping-Pong 2D | Contra la IA: paleta del jugador se mueve 150 px, la IA responde, pelota en movimiento. Dos jugadores: ambas paletas responden (W/S y flechas). `R` reinicia. Historial guardado (`local 0-0`, `ai 0-0`) | ✅ |
| Fútbol 2D Atari contra la IA | Jugador humano y CPU se mueven; fin por tiempo → `FINISHED`; partido guardado | ✅ |
| Fútbol 2D Atari dos jugadores | Jugador azul (WASD) y rojo (flechas) se mueven 30 px cada uno; `R` reinicia el marcador `[0,0]`; historial `two 0-0` | ✅ |
| Juego de aviones 3D | Sky Bound (Three.js r160): crear piloto → «Entrenar» → nivel 1 «Amanecer» en vuelo con HUD (aros, monedas, velocidad) | ✅ |
| Marcadores se almacenan | `blackdot-pixelpong-v1` y `blackdot-football` con historial; panel «Tus métricas» los muestra | ✅ |
| Récords persisten | Tres arranques independientes de Chrome con el mismo perfil: partida → cambio de tema → al reabrir: tema claro, 2 visitas, marcador en el historial, «Récord registrado» en el Salón de la fama | ✅ |
| Métricas de interacción | `blackdot-metrics-v1`: visitas, páginas, partidas por juego, modelos 3D vistos, sesiones e interacciones WebAR, envíos de contacto | ✅ |
| WebAR: escena, modelo, cursor | A-Frame 1.6.0 cargado bajo demanda; modelo con 32 mallas; 5 hotspots anclados a sus piezas | ✅ |
| Raycaster detecta interacciones | Clic proyectado sobre el hotspot «lente» → ficha «Lente azul luminosa»; clic sobre el botón 3D «Encender» → luz encendida; métricas registradas | ✅ |
| Cámara gestionada | Solo se pide al pulsar «Usar la cámara» / «Ver en AR»; se detiene al ocultar la pestaña y al cambiar de modo; mensajes para permiso denegado, sin cámara o sin HTTPS | ✅ (lógica) · ⏳ en teléfono real |
| WebAR en dispositivo compatible | WebXR `immersive-ar` requiere Chrome Android con ARCore | ⏳ no hay teléfono en este entorno: probar antes de la sustentación |
| HTTPS | Sitio publicado: HTTP → 301 → HTTPS, HSTS, TLS 1.3, certificado Let's Encrypt `*.github.io` válido hasta 29/12/2026 | ✅ |
| Rutas en GitHub Pages | Versión publicada (commit `d83e85a`): las 5 vistas, los 3 juegos de la asignatura, el modelo AR, `js/ar-experience.js` y el manual PDF responden 200 por HTTPS | ✅ |
| Sin errores de consola | 0 errores y 0 excepciones en las 5 vistas, el arcade, el 3D Lab, la experiencia WebAR y los juegos 2D | ✅ |
| Responsive | 390 × 844 sin desplazamiento horizontal; menú móvil probado | ✅ |
| W3C | 5 vistas: 0 errores y 0 avisos en el validador oficial (Nu Html Checker vnu 26.11.20), tanto en local como **sobre la URL publicada** (`?doc=https://dannavalentinar11-beep.github.io/…`). JSON en `docs/evidencias/w3c/` y `docs/evidencias/w3c-publicado/`, capturas en `docs/evidencias/capturas/w3c-*.png` | ✅ |
| Lighthouse móvil ≥ 85 | Local: index 91 · arcade 98 · ar-experience 99 · blog 94 · contacto 99 (rendimiento; 100 en accesibilidad, buenas prácticas y SEO). **URL publicada**: ver tabla «Lighthouse sobre la URL publicada» | ⚠️ arcade publicado 73–84 (corrección lista, pendiente de publicar) |

## Problemas encontrados y corregidos durante las pruebas
1. Vistas generadas con un `<main>` duplicado → corregido el generador.
2. Errores W3C heredados del sitio original (h3 dentro de `role="button"`, `dl` mal formado, `aria-label` en `div`) → corregidos.
3. Hotspots WebAR medidos antes de actualizar las matrices (aparecían en el suelo) → corregido.
4. Rendimiento móvil del inicio 60 → 91: sala 3D trasladada a `arcade.html`, hero sin retraso de pintura, GSAP solo en escritorio, partículas estáticas en táctiles.
5. Arcade sin medición de LCP porque desplazaba la barra de estaciones al cargar → solo se desplaza tras entrar.
6. Orden de títulos en blog/contacto (h2 oculto con `display:none`) → oculto solo visualmente.
7. El arcade arrancaba en la estación 04 → ahora empieza en 01 (Ping-Pong 2D).

## Limitaciones del entorno
- Chrome sin ventana usa renderizado por software (SwiftShader): los FPS medidos allí (≈15) no representan un equipo real.
- No hay teléfono físico: la sesión WebXR y la cámara real deben probarse en Android/iPhone antes de la sustentación.
- Lighthouse varía entre ejecuciones (red, CDN de GitHub y CPU del equipo); por eso se registran varias ejecuciones sobre la URL publicada.

## Lighthouse sobre la URL publicada (26/11/2026, móvil, Lighthouse 12.2.1)
Rendimiento de cada ejecución; accesibilidad, buenas prácticas y SEO = 100 en todas. Informes de la última ejecución en `docs/evidencias/lighthouse-publicado/`.

| Vista | Ejecuciones (rendimiento) | Resultado |
|---|---|---|
| index.html | 77 (primera, caché fría) · 90 · 89 · 88 | ✅ 88–90 con caché |
| arcade.html | 84 · 84 · 80 · 73 | ⚠️ por debajo de 85 |
| ar-experience.html | 90 | ✅ |
| blog.html | 91 | ✅ |
| contacto.html | 100 | ✅ |

**Causa en arcade.html:** al cargar, `js/arcade.js` creaba un contexto WebGL solo para comprobar si el navegador lo soporta; eso generaba una tarea larga de ~830 ms (TBT 400–510 ms).
**Corrección (en el proyecto, aún no publicada):** la comprobación de WebGL se hace solo al entrar a la sala o al pedir el modo 3D (`hasWebGL()` diferido) y la versión del script pasa a `arcade.js?v=4.1`. Resultado en local: 97–98 (TBT 110–150 ms); la sala 3D sigue entrando y renderizando sin errores de consola. Tras publicarla hay que repetir la medición del arcade en la URL real.
