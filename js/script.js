/* ==========================================================================
   BLACKDOT — lógica del portafolio (vanilla JS, sin dependencias)
   ========================================================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------------- Datos ---------------- */
  var GAMES = [
    {
      id: "cucuta", file: "juegos/cucuta.html", title: "Cúcuta", sub: "Open World", genre: "Mundo abierto · Acción", color: "#FFC400",
      desc: "Recorre una versión libre de Cúcuta: crea tu personaje, conduce, compra carros, escucha la radio y explora la ciudad.",
      tech: ["Three.js", "WebGL", "Audio generativo", "Guardado local"],
      help: "Crea tu personaje en el menú y pulsa «Partida nueva». Tu progreso se guarda en este navegador.",
      controls: [["W A S D", "Caminar / conducir"], ["Arrastrar", "Girar la cámara"], ["E", "Subir o bajar del carro"], ["Espacio", "Freno de mano"], ["Clic", "Disparar (clic der. apunta)"], ["M", "Mapa y GPS"], ["R", "Cambiar emisora"], ["Esc", "Pausa"]],
      /* BLACKDOT ARCADE: nombre, estación temática, capturas reales y mecánicas verificadas en el juego */
      name: "Cúcuta Open World", station: "Distrito urbano", dim: "3D", shots: ["cucuta-a", "cucuta-b"],
      short: "Mundo abierto urbano: explora la ciudad a pie o en carro.",
      mechanics: ["Creación de personaje: nombre, tono de piel, camiseta y short", "Exploración libre de la ciudad a pie y en carro", "Misiones con objetivos (8 misiones; la primera es «Llegada a Cúcuta»)", "Concesionario AutoNorte, garaje y billetera para comprar y guardar carros", "Armas, vida, resistencia y nivel de búsqueda", "Radio con emisoras, mapa con GPS y minimapa", "Partida guardada en el navegador (opción «Continuar»)"]
    },
    {
      id: "dynasty", file: "juegos/dynasty.html", title: "Dynasty", sub: "FC", genre: "Deportes · Fútbol", color: "#C9A0DC",
      desc: "No heredes la gloria, constrúyela. Fútbol 3D con modo carrera, fichajes, repeticiones y celebraciones de gol.",
      tech: ["Three.js", "Modo carrera", "IA de jugadores", "Mando y táctil"],
      help: "Elige «Jugar partido» o «Modo carrera». Puedes cambiar las teclas en Ajustes → Controles; también se juega con mando o con controles táctiles en el celular.",
      controls: [["W A S D", "Mover (o flechas)"], ["Espacio / Shift", "Correr rápido"], ["J", "Pase corto / presión"], ["K", "Disparo"], ["L", "Pase largo, centro / barrida"], ["U", "Entrada / pase al hueco"], ["Q / I", "Cambiar jugador"], ["E / H", "Regate / proteger"], ["1 – 8", "Celebración tras un gol"], ["Esc / P", "Pausa"]],
      name: "Dynasty FC", station: "Estadio", dim: "3D", shots: ["dynasty-b", "dynasty-a"],
      short: "Fútbol 3D con partido rápido y modo carrera.",
      mechanics: ["Partido rápido y Modo carrera", "Elección de equipo, uniforme y formación (4-3-3, 4-4-2, 4-2-3-1 o 3-5-2)", "Duración de 2 a 10 minutos y dificultad de Fácil a Leyenda", "Horario de noche o atardecer; control local, visitante o CPU contra CPU", "Fichajes, repeticiones y celebraciones de gol", "Teclas configurables, mando y controles táctiles", "Marcador, reloj y minimapa durante el partido"]
    },
    {
      id: "skybound", file: "juegos/skybound.html", title: "Sky", sub: "Bound", genre: "Aviación · Arcade", color: "#F2C86B",
      desc: "Domina el cielo. Atraviesa aros, junta monedas y sobrevive a batallas aéreas contra el Barón Rojo.",
      tech: ["Three.js", "Física de vuelo", "Hangar y tienda", "Récords"],
      help: "Crea tu piloto con un nombre, elige mapa y despega. Atraviesa el centro de los aros para sumar más puntos.",
      controls: [["W A S D", "Dirigir el avión (o flechas)"], ["Espacio", "Frenar para apuntar (entrenamiento)"], ["Espacio / J / clic", "Disparar (batalla)"], ["Esc", "Pausa"]],
      name: "Sky Bound", station: "Hangar de aviación", dim: "3D", shots: ["skybound-b", "skybound-a"],
      short: "Aviación arcade: aros, monedas y batallas aéreas.",
      mechanics: ["Perfiles de piloto: el progreso se guarda con tu nombre", "Entrenamiento en 3 niveles de aros: Amanecer, Reino de las nubes y Cielo celestial", "Batalla aérea por oleadas contra el Barón Rojo, con dificultades desbloqueables", "Monedas, regalos y puntuación por racha y precisión", "Hangar y tienda de aviones (empiezas con el SB-1 Aurora)", "Récords personales y calidad gráfica ajustable"]
    },
    {
      id: "rally", file: "juegos/rally.html", title: "Rally", sub: "Rush", genre: "Deportes · Arcade", color: "#24C8FF",
      desc: "Ping-pong futurista en 3D. Gana el punto a velocidad creciente, sube de nivel, desbloquea mesas y pelotas y reta al Rival Imparable.",
      tech: ["Three.js", "1 o 2 jugadores", "IA por niveles", "Tienda y progreso"],
      help: "Elige JUGAR (contra la IA) o DOS JUGADORES, escribe tu nombre y empieza. Gana quien llegue a 7 puntos con 2 de ventaja, o quien lidere a los 40 s; el encuentro es al mejor de 3 partidas.",
      controls: [["Ratón / dedo", "Mover tu paleta (arrastra en el celular)"], ["W / S", "Jugador 1 arriba / abajo"], ["↑ / ↓", "Jugador 2 (o también jugador 1 contra la IA)"], ["Esc / P", "Pausa"]],
      name: "Rally Rush", station: "Arena neón", dim: "3D", shots: ["rally-b", "rally-a"],
      short: "Ping-pong futurista en 3D contra la IA o un amigo.",
      mechanics: ["Contra la IA por niveles, dos jugadores locales o el Rival Imparable", "Encuentros al mejor de 3: 7 puntos con 2 de ventaja, o líder a los 40 s", "La pelota gana velocidad durante el punto", "Monedas Rush, niveles y experiencia (EXP)", "Tienda con mesas y pelotas desbloqueables, perfil y progresión"]
    }
  ];

  var PROJECTS = [
    { cat: "01 / Ilustración", title: "Personaje ilustrado", tool: ["ai", "Ai", "Adobe Illustrator"], desc: "Creación de un personaje digital mediante ilustración vectorial, trabajando formas, composición y detalles visuales.", extra: "Exploración de pixel art y fan art con énfasis en contraste, siluetas y lectura rápida de la forma." },
    { cat: "02 / Fotografía", title: "Fotografía y retoque digital", tool: ["ps", "Ps", "Adobe Photoshop"], desc: "Edición y retoque fotográfico enfocados en mejorar composición, color, iluminación y narrativa visual.", extra: "Producto y bodegón: dirección de arte, corrección de color y limpieza de detalles." },
    { cat: "03 / Desarrollo web", title: "Diseño y desarrollo web", tool: ["vs", "VS", "Visual Studio Code"], url: "https://divinevanity.co", urlLabel: "Divinevanity.co", desc: "Diseñé Divinevanity.co, una tienda en línea de belleza: estructura, colecciones, ofertas y una experiencia de compra pensada para escritorio y celular.", extra: "Desplázate dentro de la vista previa para recorrer la página, o visítala en vivo con el botón." },
    { cat: "04 / Motion graphics", title: "Animación y motion graphics", tool: ["ae", "Ae", "Adobe After Effects"], desc: "Creación de animaciones y composiciones audiovisuales mediante movimiento, efectos y narrativa visual.", extra: "Principios de animación aplicados: anticipación, squash & stretch y timing." },
    { cat: "05 / Edición audiovisual", title: "Edición de video", tool: ["pr", "Pr", "Adobe Premiere Pro"], desc: "Edición y montaje de contenido audiovisual, trabajando ritmo, transiciones, sonido y narrativa.", extra: "Montaje con intención: cada corte acompaña el ritmo de la música y la historia." },
    { cat: "06 / Modelado 3D", title: "Personajes 3D", tool: ["bl", "Bl", "Blender"], desc: "Modelado y creación de personajes tridimensionales explorando formas, proporciones, materiales y composición.", extra: "Tres personajes modelados en Blender: un gato negro, el dálmata de BlackDot y un ninja. Del model sheet al volumen: blocking, proporción y materiales. Ahora también puedes rotarlos y ver sus animaciones en BLACKDOT 3D LAB.", lab: true },
    { cat: "07 / Videojuegos", title: "Videojuegos para web", tool: ["js", "JS", "JavaScript · Three.js"], desc: "Cuatro juegos 3D completos que corren directamente en el navegador: Cúcuta Open World, Dynasty FC, Sky Bound y Rally Rush.", extra: "Pulsa «Ir a jugar» para ir al arcade y probarlos ahora mismo.", games: true }
  ];

  /* Herramientas (BLACKDOT 2.0): se identifican por clave (data-tool="ps").
     Solo se muestran las herramientas que aparecen en el proyecto; para añadir
     otra basta con crear su entrada aquí y su botón en la sección #herramientas. */
  var TOOLS = {
    ps: { cls: "ps", t: "Ps", title: "Adobe Photoshop", desc: "Herramienta de edición y composición de imágenes para crear y transformar contenido visual.", uses: ["Retoque fotográfico", "Composición digital", "Edición de imágenes", "Diseño gráfico"] },
    ai: { cls: "ai", t: "Ai", title: "Adobe Illustrator", desc: "Herramienta de diseño vectorial para crear logotipos, ilustraciones, piezas gráficas, iconos e identidades visuales.", uses: ["Diseño de logotipos", "Ilustración vectorial", "Identidad visual", "Iconos y piezas gráficas"] },
    ae: { cls: "ae", t: "Ae", title: "Adobe After Effects", desc: "Herramienta enfocada en motion graphics y efectos visuales.", uses: ["Motion graphics", "Animaciones", "Efectos visuales", "Títulos y composiciones"] },
    pr: { cls: "pr", t: "Pr", title: "Adobe Premiere Pro", desc: "Herramienta profesional de edición de video para crear y montar contenido audiovisual.", uses: ["Edición de video", "Montaje audiovisual", "Corrección de color", "Contenido para redes"] },
    bl: { cls: "bl", t: "Bl", title: "Blender", desc: "Plataforma de creación 3D para modelado, animación, materiales y renderizado.", uses: ["Modelado 3D", "Animación", "Texturizado", "Renderizado"] },
    vs: { cls: "vs", t: "VS", title: "Visual Studio Code", desc: "Editor de código para desarrollar sitios web, aplicaciones y videojuegos.", uses: ["HTML", "CSS", "JavaScript", "Depuración"] },
    html: { cls: "html", t: "H5", title: "HTML5", desc: "Lenguaje de marcado con el que se estructura el contenido de la web.", uses: ["Estructura semántica", "Formularios", "Contenido multimedia", "Accesibilidad"] },
    css: { cls: "css", t: "C3", title: "CSS3", desc: "Lenguaje de estilos para el diseño visual, el diseño responsive y las animaciones de la web.", uses: ["Diseño responsive", "Variables y temas", "Animaciones", "Maquetación con Grid y Flexbox"] },
    js: { cls: "js", t: "JS", title: "JavaScript", desc: "El lenguaje que da vida a la web: interacción, lógica y videojuegos en el navegador.", uses: ["Interacciones", "Lógica de juego", "Animaciones", "APIs del navegador"] },
    th: { cls: "th", t: "3D", title: "Three.js", desc: "Librería WebGL para crear gráficos 3D en tiempo real. Es el motor de mis cuatro videojuegos, de la sala BLACKDOT Arcade y del visor de BLACKDOT 3D LAB.", uses: ["Escenas 3D", "Iluminación y sombras", "Cámaras y animación", "Videojuegos web"] }
  };

  var ARTICLES = [
    { filter: "web", category: "Desarrollo web", meta: "12 AGO 2026 · 6 MIN", title: "Cómo construí BLACKDOT: de una idea visual a un portafolio funcional", excerpt: "", body: ["BLACKDOT nació como una dirección visual y fue creciendo hasta convertirse en un portafolio funcional. El primer paso fue definir una jerarquía clara: presentación, proyectos, herramientas, blog y contacto.", "Después llevé esa estructura a una interfaz responsive. Cada decisión debía funcionar en escritorio y también en una pantalla pequeña, donde la navegación cambia y los elementos necesitan áreas de toque más cómodas.", "La parte más importante fue conectar estética e interacción: tarjetas que responden al toque, modales que pueden desplazarse y un sistema de tema que recuerda la elección de la persona. El resultado es una experiencia que no depende únicamente de verse bien, sino de sentirse fácil de usar."] },
    { filter: "web", category: "Web", meta: "28 JUL 2026 · 4 MIN", title: "Diseñar primero: del moodboard al wireframe", excerpt: "Cómo ordenar referencias visuales y convertirlas en una estructura que pueda navegarse con claridad.", body: ["Un moodboard ayuda a definir el lenguaje visual antes de empezar a construir pantallas. Reúno referencias de composición, tipografía, color, fotografía y movimiento.", "Luego convierto esas referencias en decisiones concretas: qué información aparece primero, qué elementos se repiten y cómo se organiza cada sección. El wireframe permite comprobar la estructura sin distraerse todavía con los detalles.", "Cuando la jerarquía funciona en blanco y negro, el diseño visual tiene una base mucho más sólida."] },
    { filter: "diseño", category: "Diseño", meta: "16 JUL 2026 · 3 MIN", title: "Color, tipografía y personalidad visual", excerpt: "Las pequeñas decisiones que hacen que una identidad se sienta coherente antes de añadir cualquier efecto.", body: ["Una identidad no necesita muchos elementos para sentirse propia. La combinación de color, tipografía, escala y espacio puede construir una personalidad reconocible.", "En BLACKDOT, el contraste entre negro, blanco y acentos azules ayuda a crear una dirección editorial y tecnológica. La tipografía establece el tono y los espacios permiten que las piezas tengan protagonismo.", "La regla que más me sirve es mantener la coherencia: si cada sección parece pertenecer al mismo sistema, la experiencia se siente intencional."] },
    { filter: "audiovisual", category: "Audiovisual", meta: "05 JUL 2026 · 5 MIN", title: "El ritmo también diseña: edición y narrativa", excerpt: "Por qué cortar, pausar y cambiar de plano también construye una experiencia visual.", body: ["Editar no es solamente unir clips. Cada corte cambia la atención y modifica la sensación de una escena.", "Antes de añadir transiciones, pienso en el ritmo: dónde debe respirar la pieza, qué información necesita más tiempo y qué movimiento puede reforzar una idea.", "Una edición sencilla puede ser más efectiva que una colección de efectos cuando cada decisión tiene una función narrativa."] },
    { filter: "diseño", category: "Diseño 3D", meta: "22 JUN 2026 · 4 MIN", title: "Crear personajes: observar antes de modelar", excerpt: "Proporción, referencias y model sheets como punto de partida para un personaje tridimensional.", body: ["Antes de abrir Blender, una buena referencia ahorra muchas correcciones. Un model sheet permite estudiar frente, perfil, proporciones, manos y detalles que deben mantenerse consistentes.", "El modelado comienza mejor cuando las formas principales están claras. Primero volumen y proporción; después detalles, materiales y acabado.", "Observar antes de modelar convierte el proceso en una serie de decisiones más controlables."] },
    { filter: "web", category: "Web", meta: "12 JUN 2026 · 4 MIN", title: "Responsive de verdad: pensar en la mano", excerpt: "Un diseño responsive no solo reduce columnas: cambia cómo se toca, se lee y se recorre una interfaz.", body: ["Un diseño responsive no consiste únicamente en hacer que una cuadrícula pase de tres columnas a una. En móvil cambia la manera en que interactuamos: usamos el pulgar, tenemos menos espacio y necesitamos señales más claras.", "Por eso los botones deben tener áreas cómodas, los menús deben ser fáciles de cerrar y los modales necesitan scroll interno. También hay que revisar estados de toque, foco y movimiento.", "Diseñar para móvil es diseñar otra forma de recorrer la misma experiencia."] },
    { filter: "web", category: "Videojuegos", meta: "20 OCT 2026 · 5 MIN", title: "De la web al juego: construir mundos 3D en el navegador", excerpt: "Lo que aprendí creando tres videojuegos con Three.js: rendimiento, controles y guardado.", body: ["Pasar de páginas web a videojuegos cambia la forma de pensar: ya no se diseña una pantalla, se diseña un mundo que reacciona a cada tecla.", "Three.js permite crear escenas 3D con luces, sombras y cámaras directamente en el navegador. El reto está en el rendimiento: menos geometría, texturas generadas por código y opciones de calidad para cada equipo.", "También aprendí a pensar en todos los jugadores: controles táctiles para móvil, guardado local para no perder el progreso y menús claros para empezar a jugar en segundos."] }
  ];

  /* ---------------- Utilidades ---------------- */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  /* Copia de una portada SVG con ids únicos, para que cada copia tenga sus
     propios degradados aunque aparezca varias veces en la página. */
  var svgUid = 0;
  function coverSvg(id) {
    var s = "-" + (++svgUid);
    return document.getElementById("cover-" + id).innerHTML
      .replace(/id="([^"]+)"/g, 'id="$1' + s + '"')
      .replace(/url\(#([^)]+)\)/g, "url(#$1" + s + ")");
  }
  function fanHtml() {
    return GAMES.map(function (g) {
      return '<div class="fan-card" style="--gc:' + g.color + '">' + coverSvg(g.id) + '<span class="fan-label">' + esc(g.title + " " + g.sub) + "</span></div>";
    }).join("");
  }
  var toastTimer;
  function toast(msg, isErr) {
    var t = $("#toast");
    $("#toast-text").textContent = msg;
    t.classList.toggle("err", !!isErr);
    t.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("is-show"); }, 3200);
  }
  var lockCount = 0;
  function lockScroll(on) {
    lockCount = Math.max(0, lockCount + (on ? 1 : -1));
    document.body.classList.toggle("is-locked", lockCount > 0);
  }

  /* ---------------- Tema ---------------- */
  /* BLACKDOT 2.0: tema global. Única fuente de verdad: <html data-theme>.
     - El script del <head> lo fija antes de pintar (preferencia guardada o la del sistema).
     - El botón alterna y guarda la elección en LocalStorage (clave original "blackdot-theme").
     - Si la persona nunca eligió, se sigue el tema del sistema en tiempo real.
     - Se emite "themechange" (detail.theme) para los lienzos 2D/3D que pintan colores propios. */
  function getTheme() { return root.getAttribute("data-theme") === "light" ? "light" : "dark"; }
  function initTheme() {
    var btn = $("#theme-btn");
    var meta = $('meta[name="theme-color"]');
    var mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: light)") : null;
    function stored() { try { var t = localStorage.getItem("blackdot-theme"); return t === "light" || t === "dark" ? t : null; } catch (e) { return null; } }
    function apply(t, persist) {
      root.setAttribute("data-theme", t);
      if (persist) { try { localStorage.setItem("blackdot-theme", t); } catch (e) {} }
      sync();
    }
    function sync() {
      var c = getTheme();
      btn.setAttribute("aria-label", c === "light" ? "Cambiar a modo oscuro" : "Cambiar a modo claro");
      btn.setAttribute("aria-pressed", c === "light" ? "true" : "false");
      btn.title = c === "light" ? "Modo claro activo" : "Modo oscuro activo";
      if (meta) meta.setAttribute("content", c === "light" ? "#F3F6F9" : "#03060B");
      document.dispatchEvent(new CustomEvent("themechange", { detail: { theme: c } }));
    }
    if (!root.getAttribute("data-theme")) root.setAttribute("data-theme", stored() || (mq && mq.matches ? "light" : "dark"));
    btn.addEventListener("click", function () { apply(getTheme() === "light" ? "dark" : "light", true); });
    if (mq) {
      var onSys = function (e) { if (!stored()) apply(e.matches ? "light" : "dark", false); };
      if (mq.addEventListener) mq.addEventListener("change", onSys); else if (mq.addListener) mq.addListener(onSys);
    }
    sync();
  }

  /* ---------------- Preloader ---------------- */
  function initPreloader(done) {
    var pre = $("#preloader"), count = $("#pre-count"), line = $("#pre-line");
    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      count.textContent = "100";
      line.style.transform = "scaleX(1)";
      setTimeout(function () {
        pre.classList.add("is-done");
        document.body.classList.add("is-ready");
        if (window.BLACKDOT) window.BLACKDOT.ready = true;
        document.dispatchEvent(new CustomEvent("blackdot:ready"));
        done();
        setTimeout(function () { pre.style.display = "none"; }, 1200);
      }, reduced ? 0 : 260);
    }
    if (reduced) { finish(); return; }
    var start = performance.now(), minTime = 1200;
    (function tick(now) {
      if (finished) return;
      var p = Math.min(1, (now - start) / minTime);
      var eased = 1 - Math.pow(1 - p, 3);
      var v = Math.floor(eased * 100);
      count.textContent = String(v);
      line.style.transform = "scaleX(" + eased + ")";
      if (p < 1) requestAnimationFrame(tick); else finish();
    })(start);
    setTimeout(finish, 4000); /* seguridad */
  }

  /* ---------------- Cursor personalizado ---------------- */
  function initCursor() {
    if (!finePointer || reduced) return;
    var ring = $("#cursor"), dot = $("#cursor-dot"), label = $("#cursor-label");
    var x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y, shown = false;
    document.addEventListener("pointermove", function (e) {
      x = e.clientX; y = e.clientY;
      if (!shown) { shown = true; rx = x; ry = y; root.classList.add("has-cursor"); }
      dot.style.transform = "translate(" + x + "px," + y + "px)";
    }, { passive: true });
    document.addEventListener("pointerleave", function () { root.classList.add("cursor-hidden"); });
    document.addEventListener("pointerenter", function () { root.classList.remove("cursor-hidden"); });
    (function loop() {
      rx += (x - rx) * 0.18; ry += (y - ry) * 0.18;
      ring.style.transform = "translate(" + rx.toFixed(1) + "px," + ry.toFixed(1) + "px)";
      requestAnimationFrame(loop);
    })();
    document.addEventListener("pointerover", function (e) {
      var t = e.target.closest ? e.target.closest("[data-cursor], a, button, [data-cursor-hover], label, .game-card, input, select, textarea") : null;
      ring.classList.remove("is-hover", "is-label");
      if (!t) return;
      var txt = t.getAttribute("data-cursor");
      if (txt) { label.textContent = txt; ring.classList.add("is-label"); }
      else if (!/INPUT|TEXTAREA|SELECT/.test(t.tagName)) ring.classList.add("is-hover");
    });
  }

  /* ---------------- Header, progreso, nav ---------------- */
  function initHeader() {
    var header = $("#header"), bar = $("#progress");
    var lastY = scrollY, ticking = false;
    function onScroll() {
      var y = scrollY;
      header.classList.toggle("is-scrolled", y > 20);
      var menuOpen = $("#mobile-menu").classList.contains("is-open");
      header.classList.toggle("is-hidden", !menuOpen && y > 400 && y > lastY + 4);
      if (y < lastY - 4 || y < 400) header.classList.remove("is-hidden");
      lastY = y;
      var max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = "scaleX(" + (max > 0 ? y / max : 0) + ")";
      ticking = false;
    }
    addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    onScroll();

    /* Píldora deslizante */
    var nav = $("#nav"), pill = $("#nav-pill"), links = $$("a", nav);
    function movePill(a) {
      if (!a) { pill.style.opacity = "0"; return; }
      pill.style.opacity = "1";
      pill.style.width = a.offsetWidth + "px";
      pill.style.transform = "translateX(" + a.offsetLeft + "px)";
    }
    links.forEach(function (a) { a.addEventListener("mouseenter", function () { movePill(a); }); });
    nav.addEventListener("mouseleave", function () { movePill($("a.is-active", nav)); });

    /* Sección activa */
    var sections = links.map(function (a) { return $(a.getAttribute("href")); }).filter(Boolean);
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var id = "#" + en.target.id;
          links.forEach(function (a) { a.classList.toggle("is-active", a.getAttribute("href") === id); });
          if (!nav.matches(":hover")) movePill($("a.is-active", nav));
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      sections.forEach(function (s) { io.observe(s); });
    }

    /* Menú móvil */
    var btn = $("#menu-btn"), menu = $("#mobile-menu");
    function setMenu(open) {
      menu.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
      lockScroll(open);
    }
    btn.addEventListener("click", function () { setMenu(!menu.classList.contains("is-open")); });
    $$("a", menu).forEach(function (a) { a.addEventListener("click", function () { if (menu.classList.contains("is-open")) setMenu(false); }); });
    addEventListener("keydown", function (e) { if (e.key === "Escape" && menu.classList.contains("is-open")) setMenu(false); });
    addEventListener("resize", function () { if (innerWidth > 1080 && menu.classList.contains("is-open")) setMenu(false); });
  }

  /* ---------------- Campo de partículas del hero (BLACKDOT 2.0) ----------------
     Tres capas de profundidad con parallax del puntero, enlaces de constelación
     cerca del cursor y pausa automática cuando el hero sale de pantalla. */
  function initDots() {
    var canvas = $("#hero-canvas");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var hero = $("#inicio");
    var dpr = Math.min(devicePixelRatio || 1, 1.75);
    var W = 0, H = 0, pts = [], mx = -9999, my = -9999, px = 0, py = 0, tx = 0, ty = 0, visible = true, raf = 0, last = performance.now();
    /* Paleta de partículas según el tema (en claro, las partículas pálidas no se verían) */
    var PALETTES = { dark: ["101,195,204", "14,107,168", "190,230,240"], light: ["14,107,168", "11,79,125", "60,160,175"] };
    var COLORS = PALETTES[getTheme()], alphaK = getTheme() === "light" ? 1.5 : 1;
    document.addEventListener("themechange", function () {
      COLORS = PALETTES[getTheme()]; alphaK = getTheme() === "light" ? 1.5 : 1;
      pts.forEach(function (p, i) { p.c = COLORS[i % 3]; });
      if (reduced) draw(performance.now());
    });
    function build() {
      W = hero.clientWidth; H = hero.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(Math.min(70, Math.max(28, W * H / 24000)));
      pts = [];
      for (var i = 0; i < n; i++) {
        var z = Math.random(); /* 0 = lejos, 1 = cerca */
        pts.push({ x: Math.random() * W, y: Math.random() * H, z: z, r: 0.5 + z * 1.4, vy: -(0.04 + z * 0.18), vx: (Math.random() - 0.5) * 0.08, c: COLORS[i % 3], tw: Math.random() * 6.28 });
      }
    }
    function draw(now) {
      var dt = Math.min(48, now - last); last = now;
      ctx.clearRect(0, 0, W, H);
      px += (tx - px) * 0.05; py += (ty - py) * 0.05;
      var t = now / 1000;
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        if (!reduced) { p.x += p.vx * dt * 0.06; p.y += p.vy * dt * 0.06; }
        if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
        if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
        var ox = p.x + px * (p.z * 28), oy = p.y + py * (p.z * 18);
        p.sx = ox; p.sy = oy;
        var a = (0.1 + p.z * 0.32) * (0.8 + 0.2 * Math.sin(t * 1.2 + p.tw));
        var dx = ox - mx, dy = oy - my, d2 = dx * dx + dy * dy;
        if (d2 < 22500) a = Math.min(0.7, a + (1 - d2 / 22500) * 0.3);
        a = Math.min(0.85, a * alphaK);
        ctx.fillStyle = "rgba(" + p.c + "," + a.toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(ox, oy, p.r, 0, 6.2832); ctx.fill();
      }
    }
    function loop(now) { raf = 0; if (!visible || document.hidden) return; draw(now); raf = requestAnimationFrame(loop); }
    function start() { if (!raf && visible && !reduced) { last = performance.now(); raf = requestAnimationFrame(loop); } }
    build();
    var rt; addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { build(); if (reduced) draw(performance.now()); }, 150); });
    if (reduced) { draw(performance.now()); return; }
    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top;
      tx = (mx / r.width - 0.5) * 2; ty = (my / r.height - 0.5) * 2;
    }, { passive: true });
    hero.addEventListener("pointerleave", function () { mx = my = -9999; tx = ty = 0; });
    document.addEventListener("visibilitychange", start);
    if ("IntersectionObserver" in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; start(); }).observe(hero);
    start();
  }

  /* ---------------- Inclinación de la tarjeta del hero ---------------- */
  function initHeroTilt() {
    if (!finePointer || reduced) return;
    var vis = $("#hero-visual"), card = $("#hero-card");
    vis.addEventListener("pointermove", function (e) {
      var r = vis.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty("--ry", (x * 14).toFixed(2) + "deg");
      card.style.setProperty("--rx", (-y * 10).toFixed(2) + "deg");
    });
    vis.addEventListener("pointerleave", function () { card.style.setProperty("--ry", "-6deg"); card.style.setProperty("--rx", "3deg"); });
  }

  /* ---------------- Texto dividido por palabras ---------------- */
  function splitWords(el) {
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var parts = n.textContent.split(/(\s+)/);
          var frag = document.createDocumentFragment();
          parts.forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
            var w = document.createElement("span"); w.className = "w";
            var inner = document.createElement("span"); inner.textContent = part; inner.style.setProperty("--i", i++);
            w.appendChild(inner); frag.appendChild(w);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && !n.classList.contains("w")) {
          walk(n);
        }
      });
    })(el);
  }

  /* ---------------- Revelado al hacer scroll ---------------- */
  function initReveal() {
    $$("[data-split]").forEach(splitWords);
    var items = $$(".rv, [data-split]");
    if (reduced || !("IntersectionObserver" in window)) { items.forEach(function (el) { el.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    items.forEach(function (el) { io.observe(el); });
    window.__observeReveal = function (el) { io.observe(el); };
  }

  /* ---------------- Contadores ---------------- */
  function initCounters() {
    var els = $$("[data-count]");
    function run(el) {
      var end = +el.getAttribute("data-count"), start = performance.now(), dur = 1600;
      if (reduced) { el.textContent = end; return; }
      (function tick(now) {
        var p = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - p, 4);
        el.textContent = Math.round(end * e);
        if (p < 1) requestAnimationFrame(tick);
      })(start);
    }
    if (!("IntersectionObserver" in window)) { els.forEach(run); return; }
    var io = new IntersectionObserver(function (en) { en.forEach(function (e) { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } }); }, { threshold: 0.6 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------------- Botones magnéticos ---------------- */
  function initMagnetic() {
    if (!finePointer || reduced) return;
    $$("[data-magnetic]").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
        el.style.transform = "translate(" + (x * 0.25).toFixed(1) + "px," + (y * 0.35).toFixed(1) + "px)";
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });
  }

  /* ---------------- Inclinación 3D + brillo de tarjetas ---------------- */
  function bindTilt(card) {
    if (!finePointer || reduced) return;
    card.addEventListener("pointermove", function (e) {
      var r = card.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.style.transform = "perspective(1000px) rotateY(" + ((x - 0.5) * 8).toFixed(2) + "deg) rotateX(" + ((0.5 - y) * 8).toFixed(2) + "deg) translateY(-6px)";
      card.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
      card.style.setProperty("--my", (y * 100).toFixed(1) + "%");
    });
    card.addEventListener("pointerleave", function () { card.style.transform = ""; });
  }

  /* ---------------- Parallax + marquee ---------------- */
  function initScrollFx() {
    if (reduced) return;
    var aboutImg = $("#about-figure img"), aboutFig = $("#about-figure"), skew = $("#marquee-skew");
    var last = scrollY, vel = 0;
    (function loop() {
      var y = scrollY;
      vel += ((y - last) - vel) * 0.12; last = y;
      var k = Math.max(-8, Math.min(8, vel * 0.25));
      skew.style.transform = "skewX(" + (-k).toFixed(2) + "deg)";
      var r = aboutFig.getBoundingClientRect();
      if (r.bottom > 0 && r.top < innerHeight) {
        var p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
        aboutImg.style.setProperty("--py", (p * 60 - 40).toFixed(1) + "px");
      }
      requestAnimationFrame(loop);
    })();
  }

  /* ---------------- Sistema de modales ---------------- */
  var openModals = [];
  function openModal(modal, trigger) {
    modal.hidden = false;
    modal._trigger = trigger || document.activeElement;
    lockScroll(true);
    openModals.push(modal);
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      modal.classList.add("is-open");
      var c = $(".modal-close", modal); if (c) c.focus({ preventScroll: true });
    }); });
  }
  function closeModal(modal) {
    if (!modal || modal.hidden || !modal.classList.contains("is-open")) return;
    modal.classList.remove("is-open");
    openModals = openModals.filter(function (m) { return m !== modal; });
    lockScroll(false);
    $$("video", modal).forEach(function (v) { v.pause(); });
    setTimeout(function () { modal.hidden = true; if (modal._onClosed) modal._onClosed(); }, reduced ? 0 : 450);
    if (modal._trigger && modal._trigger.focus) modal._trigger.focus({ preventScroll: true });
  }
  function initModals() {
    $$(".modal").forEach(function (m) {
      $$("[data-close]", m).forEach(function (b) { b.addEventListener("click", function () { closeModal(m); }); });
    });
    addEventListener("keydown", function (e) {
      var m = openModals[openModals.length - 1];
      if (!m) return;
      if (e.key === "Escape") { e.preventDefault(); closeModal(m); return; }
      if (e.key === "Tab") {
        var f = $$('button:not([disabled]), [href], input:not([disabled]):not([type="radio"]), input[type="radio"]:checked, select, textarea, [tabindex]:not([tabindex="-1"])', m).filter(function (el) { return el.offsetParent !== null || el.type === "file"; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }
  /* Tarjeta clicable que puede contener enlaces propios (p. ej. «Visitar sitio»):
     el enlace interno navega y no abre el modal de la tarjeta. */
  function activate(el, fn) {
    el.addEventListener("click", function (e) {
      var a = e.target.closest ? e.target.closest("a") : null;
      if (a && a !== el && el.contains(a)) return;
      fn(e);
    });
    if (el.tagName !== "BUTTON") el.addEventListener("keydown", function (e) {
      if (e.target !== el) return;
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(e); }
    });
  }

  /* ---------------- Proyectos ---------------- */
  function initProjects() {
    var modal = $("#project-modal"), media = $("#pm-media"), cards = $$(".p-card"), idx = 0;
    function show(i) {
      idx = (i + PROJECTS.length) % PROJECTS.length;
      var p = PROJECTS[idx], card = cards[idx];
      $("#pm-cat").textContent = p.cat;
      $("#pm-title").textContent = p.title;
      $("#pm-desc").textContent = p.desc;
      $("#pm-extra").textContent = p.extra;
      $("#pm-tool").innerHTML = '<i class="tile ' + p.tool[0] + '">' + p.tool[1] + "</i>" + esc(p.tool[2]);
      $$("video", media).forEach(function (v) { v.pause(); });
      media.innerHTML = "";
      media.className = "pm-media";
      var vid = $("video", card), imgs = $$(".p-thumb img", card), browser = $(".browser", card);
      if (vid) {
        var v = document.createElement("video");
        v.src = vid.getAttribute("src"); v.poster = vid.getAttribute("poster");
        v.controls = true; v.playsInline = true; v.autoplay = true; v.loop = true; v.muted = true;
        v.setAttribute("aria-label", vid.getAttribute("aria-label") || p.title);
        if (vid.hasAttribute("data-vertical")) media.classList.add("vertical");
        media.appendChild(v);
        var pr = v.play(); if (pr && pr.catch) pr.catch(function () {});
      } else if (p.games) {
        var fan = document.createElement("div");
        fan.className = "fan";
        fan.innerHTML = fanHtml();
        media.appendChild(fan);
      } else if (browser) {
        var copy = browser.cloneNode(true);
        $$("img", copy).forEach(function (im) { im.removeAttribute("loading"); });
        media.appendChild(copy);
      } else {
        if (imgs.length === 2) media.classList.add("two");
        if (imgs.length === 3) media.classList.add("three");
        imgs.forEach(function (im) { var c = im.cloneNode(); c.removeAttribute("loading"); media.appendChild(c); });
      }
      var link = $("#pm-link");
      link.hidden = !p.url;
      if (p.url) { link.href = p.url; $("#pm-link-text").textContent = "Visitar " + p.urlLabel; }
      $("#pm-play").hidden = !p.games;
      var lab = $("#pm-lab"); if (lab) lab.hidden = !p.lab;
    }
    var fanEl = $("#games-fan");
    if (fanEl) fanEl.innerHTML = fanHtml();
    $("#pm-play").addEventListener("click", function () { closeModal(modal); });
    if ($("#pm-lab")) $("#pm-lab").addEventListener("click", function () { closeModal(modal); });
    cards.forEach(function (card, i) {
      activate(card, function () { show(i); openModal(modal, card); });
      bindTilt(card);
      var v = $("video", card);
      if (v) {
        var play = function () { var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); };
        var stop = function () { v.pause(); try { v.currentTime = 0; } catch (e) {} };
        card.addEventListener("mouseenter", play); card.addEventListener("focus", play);
        card.addEventListener("mouseleave", stop); card.addEventListener("blur", stop);
      }
    });
    $("#pm-prev").addEventListener("click", function () { show(idx - 1); });
    $("#pm-next").addEventListener("click", function () { show(idx + 1); });
  }

  /* ---------------- Herramientas ---------------- */
  function initTools() {
    var modal = $("#tool-modal");
    $$(".tool").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var t = TOOLS[btn.getAttribute("data-tool")];
        if (!t) return;
        var tile = $("#tm-tile"); tile.className = "tile " + t.cls; tile.textContent = t.t;
        $("#tm-title").textContent = t.title;
        $("#tm-desc").textContent = t.desc;
        $("#tm-list").innerHTML = t.uses.map(function (u) { return "<li>" + esc(u) + "</li>"; }).join("");
        openModal(modal, btn);
      });
    });
  }

  /* ---------------- Blog ---------------- */
  function initBlog() {
    var list = $("#blog-list"), modal = $("#blog-modal");
    var arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
    list.innerHTML = ARTICLES.slice(1).map(function (a, k) {
      var i = k + 1, date = a.meta.split(" · ");
      return '<button type="button" class="blog-item rv" style="--d:' + (k * 60) + '" data-article="' + i + '" data-cat="' + a.filter + '">' +
        '<span class="cat">' + esc(a.category.toUpperCase()) + "<span>" + esc(date[0]) + "</span></span>" +
        "<span><h3>" + esc(a.title) + "</h3><p>" + esc(a.excerpt) + " · " + esc(date[1] || "") + "</p></span>" +
        '<span class="go" aria-hidden="true">' + arrow + "</span></button>";
    }).join("");
    if (window.__observeReveal) $$(".rv", list).forEach(window.__observeReveal); else $$(".rv", list).forEach(function (e) { e.classList.add("in"); });
    $$("[data-article]").forEach(function (b) {
      b.addEventListener("click", function () {
        var a = ARTICLES[+b.getAttribute("data-article")];
        $("#bm-cat").textContent = a.category;
        $("#bm-title").textContent = a.title;
        $("#bm-meta").textContent = a.meta + " · Danna Rueda";
        $("#bm-text").innerHTML = a.body.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("");
        $(".modal-panel", modal).scrollTop = 0;
        openModal(modal, b);
      });
    });
    var btns = $$("#blog-filters button");
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        btns.forEach(function (x) { x.classList.toggle("is-active", x === b); x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
        var f = b.getAttribute("data-filter");
        $$(".blog-item", list).forEach(function (it, k) {
          var show = f === "all" || it.getAttribute("data-cat") === f;
          it.classList.toggle("is-out", !show);
          if (show && !reduced) { it.animate([{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "none" }], { duration: 500, delay: k * 40, easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" }); }
        });
      });
    });
  }

  /* ---------------- Formulario de contacto ---------------- */
  function initContact() {
    var form = $("#contact-form"), status = $("#form-status");
    var fields = $$("input.input, textarea.input", form);
    var services = $$('input[name="servicio"]', form);
    function hint(id, msg) { var h = $('[data-hint="' + id + '"]', form); if (h) h.textContent = msg || ""; }
    function check(f) {
      var msg = "";
      if (f.validity.valueMissing) msg = "Este campo es obligatorio.";
      else if (f.validity.typeMismatch) msg = "Ingresa un correo válido.";
      else if (f.validity.tooShort) msg = "Escribe al menos " + f.minLength + " caracteres.";
      else if (f.type === "tel" && f.value && !/^[+\d][\d\s()-]{6,}$/.test(f.value.trim())) msg = "Ingresa un teléfono válido.";
      hint(f.id, msg); f.setAttribute("aria-invalid", msg ? "true" : "false");
      return !msg;
    }
    function checkServices() {
      var ok = services.some(function (s) { return s.checked; });
      hint("f-servicios", ok ? "" : "Selecciona al menos un servicio.");
      return ok;
    }
    fields.forEach(function (f) {
      f.addEventListener("blur", function () { if (f.value) check(f); });
      f.addEventListener("input", function () { if (f.getAttribute("aria-invalid") === "true") check(f); });
    });
    services.forEach(function (s) { s.addEventListener("change", function () { if ($('[data-hint="f-servicios"]').textContent) checkServices(); }); });
    /* BLACKDOT 2.0: el mensaje llega directo al correo mediante FormSubmit (servicio gratuito
       para sitios estáticos como GitHub Pages). La primera vez FormSubmit envía a este correo un
       enlace de activación que hay que confirmar una sola vez. También se puede enviar por WhatsApp. */
    var CONTACT_EMAIL = "dannarb0444@gmail.com";
    var CONTACT_WHATSAPP = "573206327941";
    var FORM_ENDPOINT = "https://formsubmit.co/ajax/" + CONTACT_EMAIL;
    var submitBtn = $('button[type="submit"]', form), waBtn = $("#contact-wa"), sending = false;
    function validate() {
      var ok = fields.map(check).every(Boolean);
      var okS = checkServices();
      if (!ok || !okS) {
        status.className = "form-status err"; status.textContent = "Revisa los campos marcados.";
        var bad = $('[aria-invalid="true"]', form) || services[0]; if (bad) bad.focus();
        return null;
      }
      var d = new FormData(form);
      return {
        nombre: String(d.get("nombre")).trim(), correo: String(d.get("correo")).trim(), telefono: String(d.get("telefono")).trim(),
        empresa: String(d.get("empresa") || "").trim() || "—", servicios: d.getAll("servicio").join(", "), mensaje: String(d.get("mensaje")).trim(),
        trampa: String(d.get("_honey") || "")
      };
    }
    function summary(v) {
      return "Nombre: " + v.nombre + "\nCorreo: " + v.correo + "\nTeléfono: " + v.telefono + "\nEmpresa: " + v.empresa + "\nServicios: " + v.servicios + "\n\n" + v.mensaje;
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (sending) return;
      var v = validate(); if (!v) return;
      if (v.trampa) { status.className = "form-status ok"; status.textContent = "¡Gracias! Tu mensaje fue enviado."; return; } /* bot */
      sending = true; submitBtn.disabled = true; submitBtn.setAttribute("aria-busy", "true");
      status.className = "form-status"; status.textContent = "Enviando tu mensaje…";
      fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          _subject: "Nuevo proyecto desde BLACKDOT — " + v.nombre, _template: "table", _captcha: "false", _replyto: v.correo,
          Nombre: v.nombre, Correo: v.correo, "Teléfono": v.telefono, Empresa: v.empresa, Servicios: v.servicios, Mensaje: v.mensaje
        })
      }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (!res.ok || String(res.j.success) === "false") throw new Error(res.j.message || "Respuesta no válida del servicio de correo");
          status.className = "form-status ok";
          status.textContent = "¡Gracias, " + v.nombre.split(" ")[0] + "! Tu mensaje llegó a mi correo. Te responderé pronto.";
          form.reset(); fields.forEach(function (f) { f.setAttribute("aria-invalid", "false"); });
          toast("Mensaje enviado. ¡Gracias por escribir!");
        })
        .catch(function (err) {
          console.error("BLACKDOT contacto:", err);
          status.className = "form-status err";
          status.innerHTML = "No se pudo enviar desde aquí. Puedes enviarlo por <button type=\"button\" class=\"link-btn\" data-send=\"wa\">WhatsApp</button> o por <a href=\"mailto:" + CONTACT_EMAIL + "?subject=" + encodeURIComponent("Nuevo proyecto — " + v.nombre) + "&body=" + encodeURIComponent(summary(v)) + "\">correo</a>.";
        })
        .then(function () { sending = false; submitBtn.disabled = false; submitBtn.removeAttribute("aria-busy"); });
    });
    function sendWhatsApp() {
      var v = validate(); if (!v) return;
      var text = "¡Hola Danna! Te escribo desde tu portafolio BLACKDOT.\n\n" + summary(v);
      window.open("https://wa.me/" + CONTACT_WHATSAPP + "?text=" + encodeURIComponent(text), "_blank", "noopener");
      status.className = "form-status ok"; status.textContent = "Se abrió WhatsApp con tu mensaje listo: solo pulsa «Enviar».";
    }
    if (waBtn) waBtn.addEventListener("click", sendWhatsApp);
    status.addEventListener("click", function (e) { if (e.target.closest && e.target.closest('[data-send="wa"]')) sendWhatsApp(); });
  }

  /* ======================================================================
     VIDEOJUEGOS: tarjetas y reproductor
     ====================================================================== */
  var playIcon = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/></svg>';

  function gameCard(g, i) {
    var el = document.createElement("div");
    el.className = "game-card";
    el.tabIndex = 0;
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", "Jugar " + g.title + " " + g.sub);
    el.setAttribute("data-cursor", "Jugar");
    el.style.setProperty("--gc", g.color);
    el.innerHTML =
      '<div class="glare"></div>' +
      '<div class="game-cover">' + coverSvg(g.id) +
        '<div class="game-tag"><span>Destacado</span><span>' + esc(g.tag || "3D · Web") + '</span></div>' +
        '<span class="game-play" aria-hidden="true">' + playIcon + "</span>" +
        '<div class="game-logo"><b>' + esc(g.title) + "</b><i>" + esc(g.sub) + "</i></div>" +
      "</div>" +
      '<div class="game-body">' +
        '<div class="game-meta"><span class="num">Game ' + String(i + 1).padStart(2, "0") + "</span><span>" + esc(g.genre) + "</span></div>" +
        "<p>" + esc(g.desc) + "</p>" +
        '<div class="game-tech">' + g.tech.map(function (t) { return "<span>" + esc(t) + "</span>"; }).join("") + "</div>" +
        '<div class="game-actions"><span class="btn btn-sm" style="--bg-btn:' + g.color + ';--fg-btn:#050505">Jugar ahora <span class="arr" aria-hidden="true">→</span></span></div>' +
      "</div>";
    activate(el, function (e) { playGame(g, e); });
    bindTilt(el);
    return el;
  }
  function renderGames() {
    var grid = $("#games-grid");
    if (!grid) return; /* BLACKDOT 2.0: las estaciones del arcade las construye js/arcade.js */
    GAMES.forEach(function (g, i) {
      var card = gameCard(g, i);
      card.classList.add("rv");
      card.style.setProperty("--d", i * 110);
      grid.appendChild(card);
      if (window.__observeReveal && !reduced) window.__observeReveal(card); else card.classList.add("in");
    });
  }

  /* Cada juego vive en su propio archivo HTML (g.file) y se carga bajo demanda
     en un iframe del mismo origen: la portada no descarga los juegos y el
     guardado (localStorage) es compartido con el portafolio. */

  /* Reproductor */
  var player, stage, loader, frame = null, currentGame = null, loadTimer = 0;
  function setProgress(p, msg) {
    $("#pl-load-bar").style.width = p + "%";
    if (msg) $("#pl-load-msg").textContent = msg;
  }
  function playGame(g, ev) {
    currentGame = g;
    player.style.setProperty("--gc", g.color || "#0A84FF");
    var ox = "50%", oy = "50%";
    if (ev && ev.clientX) { ox = ev.clientX + "px"; oy = ev.clientY + "px"; }
    player.style.setProperty("--ox", ox); player.style.setProperty("--oy", oy);
    $("#player-name").textContent = g.title + (g.sub ? " " + g.sub : "");
    $("#player-genre").textContent = g.genre || "";
    $("#pl-load-title").textContent = g.title + (g.sub ? " " + g.sub : "");
    $("#pl-help-text").textContent = g.help || "Usa los controles que indica el propio juego. Si no responde al teclado, haz clic dentro del juego.";
    $("#pl-help-list").innerHTML = (g.controls || [["Clic", "Activar el juego"], ["Teclado", "Según el juego"]]).map(function (c) { return "<li><kbd>" + esc(c[0]) + "</kbd>" + esc(c[1]) + "</li>"; }).join("");
    $("#player-help").classList.remove("is-open");
    $("#pl-help").setAttribute("aria-expanded", "false");
    loader.classList.remove("is-gone", "is-error");
    setProgress(5, "Preparando el juego…");
    player.hidden = false;
    lockScroll(true);
    root.classList.add("cursor-hidden");
    requestAnimationFrame(function () { requestAnimationFrame(function () { player.classList.add("is-open"); $("#pl-close").focus({ preventScroll: true }); }); });
    mountFrame(g);
  }
  function mountFrame(g) {
    if (frame) { frame.src = "about:blank"; frame.remove(); }
    var f = frame = document.createElement("iframe");
    f.title = g.title + (g.sub ? " " + g.sub : "");
    f.setAttribute("allow", "fullscreen; autoplay; gamepad; accelerometer; gyroscope");
    f.setAttribute("allowfullscreen", "");
    /* Progreso estimado mientras el navegador descarga el archivo del juego */
    var p = 10;
    clearInterval(loadTimer);
    loadTimer = setInterval(function () { p = Math.min(90, p + (90 - p) * 0.12); setProgress(Math.round(p), "Descargando el juego…"); }, 120);
    f.addEventListener("load", function () {
      if (frame !== f) return;
      clearInterval(loadTimer);
      setProgress(100, "¡Listo!");
      setTimeout(function () {
        loader.classList.add("is-gone");
        try { f.focus(); if (f.contentWindow) f.contentWindow.focus(); } catch (e) {}
      }, 350);
    });
    f.addEventListener("error", function () {
      clearInterval(loadTimer);
      loader.classList.add("is-error");
      $("#pl-load-msg").textContent = "No se pudo cargar el juego. Revisa tu conexión e inténtalo de nuevo.";
    });
    f.src = g.file;
    stage.insertBefore(f, stage.firstChild);
  }
  function closePlayer() {
    if (player.hidden) return;
    if (document.fullscreenElement) { try { document.exitFullscreen(); } catch (e) {} }
    player.classList.remove("is-open");
    clearInterval(loadTimer);
    var g = currentGame; currentGame = null;
    setTimeout(function () {
      if (frame) { frame.src = "about:blank"; frame.remove(); frame = null; }
      player.hidden = true;
      lockScroll(false);
      root.classList.remove("cursor-hidden");
      document.dispatchEvent(new CustomEvent("gameclosed"));
    }, reduced ? 0 : 850);
    var card = g && $$(".game-card").filter(function (c) { return c.getAttribute("aria-label") === "Jugar " + g.title + (g.sub ? " " + g.sub : ""); })[0];
    if (card) card.focus({ preventScroll: true });
  }
  function initPlayer() {
    player = $("#player"); stage = $("#player-stage"); loader = $("#player-loader");
    $("#pl-close").addEventListener("click", closePlayer);
    $("#pl-reload").addEventListener("click", function () {
      if (!currentGame) return;
      loader.classList.remove("is-gone", "is-error"); setProgress(10, "Reiniciando…");
      mountFrame(currentGame);
    });
    $("#pl-full").addEventListener("click", function () {
      var el = stage;
      if (document.fullscreenElement) { document.exitFullscreen(); return; }
      var req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (req) { var r = req.call(el); if (r && r.catch) r.catch(function () { toast("Tu navegador no permitió la pantalla completa.", true); }); }
      setTimeout(function () { try { frame && frame.focus(); } catch (e) {} }, 200);
    });
    $("#pl-tab").addEventListener("click", function () {
      if (!currentGame) return;
      window.open(currentGame.file, "_blank", "noopener");
    });
    $("#pl-help").addEventListener("click", function () {
      var h = $("#player-help"), open = !h.classList.contains("is-open");
      h.classList.toggle("is-open", open);
      this.setAttribute("aria-expanded", open ? "true" : "false");
    });
    addEventListener("keydown", function (e) {
      if (player.hidden || e.key !== "Escape" || document.fullscreenElement) return;
      var h = $("#player-help");
      if (h.classList.contains("is-open")) { h.classList.remove("is-open"); return; }
      closePlayer();
    });
  }

  /* ---------------- Salón de récords ----------------
     El salón de récords de los CUATRO juegos del arcade vive en js/halloffame.js. */

  function initGames() {
    initPlayer();
    renderGames();
  }

  /* ---------------- API pública para BLACKDOT ARCADE ----------------
     El arcade (js/arcade.js) reutiliza los datos, el reproductor original y el
     sistema de modales, así los juegos se abren exactamente igual que antes. */
  window.BLACKDOT = {
    GAMES: GAMES, playGame: function (g, ev) { playGame(g, ev); },
    openModal: openModal, closeModal: closeModal, toast: toast, esc: esc,
    reduced: reduced, finePointer: finePointer, getTheme: getTheme,
    isPlayerOpen: function () { return !!(player && !player.hidden); },
    hasOpenModal: function () { return openModals.length > 0; }
  };

  /* ---------------- Arranque ---------------- */
  function boot() {
    initTheme();
    initCursor();
    initHeader();
    initModals();
    initReveal();
    initCounters();
    initMagnetic();
    initProjects();
    initTools();
    initBlog();
    initContact();
    initGames();
    initDots();
    initHeroTilt();
    initScrollFx();
    initPreloader(function () {});
    /* Entrada cinematográfica del hero (transiciones CSS en css/blackdot2.css) */
    var heroEl = $("#inicio");
    if (heroEl) requestAnimationFrame(function () { requestAnimationFrame(function () { heroEl.classList.add("is-in"); }); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
