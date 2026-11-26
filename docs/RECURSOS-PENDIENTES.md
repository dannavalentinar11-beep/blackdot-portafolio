# BLACKDOT 2.0 — Recursos y decisiones pendientes

1. **Herramientas no incluidas: Figma, Canva, CapCut y Unity.** Estaban en la lista propuesta, pero no aparecen en ningún proyecto ni texto del portafolio, y la indicación fue no inventar conocimientos. Si las usas, añádelas en `js/script.js` (objeto `TOOLS`) y su botón en la sección `#herramientas` de `index.html` (Figma y Canva en «Diseño y edición», CapCut en «Animación y postproducción», Unity en «Videojuegos y experiencias interactivas»).
2. **Descripciones de personajes.** Se redactaron solo con lo verificable en el modelo y en el sitio (gorra, gafas, chaqueta azul, patineta, máscara blanca, katana, linterna con huella felina). Puedes reemplazarlas por tus textos en `js/lab3d-characters.js`.
3. **Nombres de los tramos de animación.** Derivan de los nombres de tus cámaras (`CAM_T…`) y se comprobaron midiendo el movimiento; si prefieres otros nombres o rangos, se editan en `js/lab3d-characters.js`.
4. **Video.** El original de 133 MB no puede subirse a GitHub (límite de 100 MB por archivo); se publica una versión de 49,7 MB con la misma resolución, fps, duración y audio. El original queda en tu carpeta de Descargas.
5. **Ping-Pong 2D y Fútbol 2D Atari.** Reintegrados al arcade para el tercer previo (grupo «Asignatura»).
6. **Manual técnico (PDF).** Reemplazado por el manual de auditoría e infraestructura del tercer previo (19 páginas, 1920×1080). El manual anterior queda en el historial de Git.
7. **Pruebas en dispositivos reales** (iPhone/Android, Safari, Firefox) y Lighthouse: pendientes, ver `INFORME-PRUEBAS.md`.
8. **Formulario de contacto.** Se envía por WhatsApp al +57 320 632 7941 con el mensaje prellenado; no requiere activación ni servicios externos.
9. **Vista previa de Divinevanity.co.** Se actualiza sola cada lunes con la tarea automática de GitHub Actions. Para actualizarla al instante: en GitHub abre la pestaña **Actions → Actualizar vista de Divinevanity.co → Run workflow**.
10. **Tercer previo — antes de la sustentación:** probar `ar-experience.html` en un teléfono real (Android con ARCore para «Ver en AR»; iPhone con «Usar la cámara») y repetir Lighthouse móvil sobre la URL publicada.
