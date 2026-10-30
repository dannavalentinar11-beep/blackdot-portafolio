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
      controls: [["W A S D", "Caminar / conducir"], ["Arrastrar", "Girar la cámara"], ["E", "Subir o bajar del carro"], ["Espacio", "Freno de mano"], ["Clic", "Disparar (clic der. apunta)"], ["M", "Mapa y GPS"], ["R", "Cambiar emisora"], ["Esc", "Pausa"]]
    },
    {
      id: "dynasty", file: "juegos/dynasty.html", title: "Dynasty", sub: "FC", genre: "Deportes · Fútbol", color: "#C9A0DC",
      desc: "No heredes la gloria, constrúyela. Fútbol 3D con modo carrera, fichajes, repeticiones y celebraciones de gol.",
      tech: ["Three.js", "Modo carrera", "IA de jugadores", "Mando y táctil"],
      help: "Elige «Jugar partido» o «Modo carrera». Puedes cambiar las teclas en Ajustes → Controles; también se juega con mando o con controles táctiles en el celular.",
      controls: [["W A S D", "Mover (o flechas)"], ["Espacio / Shift", "Sprint"], ["J", "Pase corto / presión"], ["K", "Disparo"], ["L", "Pase largo, centro / barrida"], ["U", "Entrada / pase al hueco"], ["Q / I", "Cambiar jugador"], ["E / H", "Regate / proteger"], ["1 – 8", "Celebración tras un gol"], ["Esc / P", "Pausa"]]
    },
    {
      id: "skybound", file: "juegos/skybound.html", title: "Sky", sub: "Bound", genre: "Aviación · Arcade", color: "#F2C86B",
      desc: "Domina el cielo. Atraviesa aros, junta monedas y sobrevive a batallas aéreas contra el Barón Rojo.",
      tech: ["Three.js", "Física de vuelo", "Hangar y tienda", "Récords"],
      help: "Crea tu piloto con un nombre, elige mapa y despega. Atraviesa el centro de los aros para sumar más puntos.",
      controls: [["W A S D", "Dirigir el avión (o flechas)"], ["Espacio", "Frenar para apuntar (entrenamiento)"], ["Espacio / J / clic", "Disparar (batalla)"], ["Esc", "Pausa"]]
    },
    {
      id: "rally", file: "juegos/rally.html", title: "Rally", sub: "Rush", genre: "Deportes · Arcade", color: "#24C8FF",
      desc: "Ping-pong futurista en 3D. Gana el punto a velocidad creciente, sube de nivel, desbloquea mesas y pelotas y reta al Rival Imparable.",
      tech: ["Three.js", "1 o 2 jugadores", "IA por niveles", "Tienda y progreso"],
      help: "Elige JUGAR (contra la IA) o DOS JUGADORES, escribe tu nombre y empieza. Gana quien llegue a 7 puntos con 2 de ventaja, o quien lidere a los 40 s; el encuentro es al mejor de 3 partidas.",
      controls: [["Ratón / dedo", "Mover tu paleta (arrastra en el celular)"], ["W / S", "Jugador 1 arriba / abajo"], ["↑ / ↓", "Jugador 2 (o también jugador 1 contra la IA)"], ["Esc / P", "Pausa"]]
    },
    {
      id: "pixelpong", file: "pingpong.html", title: "Pixel", sub: "Pong 2D", genre: "Deportes · Arcade 2D", color: "#52E5FF", tag: "2D · Web",
      desc: "Tenis de mesa neón en 2D. Juega contra la IA, en modo local de dos jugadores o supera el desafío, con velocidad creciente, estadísticas y ajustes.",
      tech: ["Canvas 2D", "1 o 2 jugadores", "IA", "Guardado local"],
      help: "Elige el modo de juego en el menú (contra la IA, dos jugadores o desafío). Haz clic dentro del juego si no responde al teclado.",
      controls: [["W / S", "Jugador 1 arriba / abajo"], ["↑ / ↓", "Jugador 2 (o jugador 1 contra la IA)"], ["Arrastrar", "Mover tu paleta en el celular"], ["Espacio", "Continuar"], ["Esc / P", "Pausa"], ["R", "Reiniciar"]]
    },
    {
      id: "atarifootball", file: "futbol.html", title: "Atari", sub: "Football 2D", genre: "Deportes · Fútbol 2D", color: "#D9FF56", tag: "2D · Web",
      desc: "Un clásico reimaginado: fútbol rápido en un campo, dos porterías y cero excusas. Juega contra la CPU o con un amigo en la misma pantalla.",
      tech: ["Canvas 2D", "1 o 2 jugadores", "Estadísticas", "Controles táctiles"],
      help: "Pulsa JUGAR (contra la CPU) o DOS JUGADORES. Marca más goles que tu rival antes de que se acabe el tiempo; los porteros defienden solos y el balón acelera a medida que avanza el partido. En el celular aparecen controles táctiles.",
      controls: [["W A S D", "Mover al jugador azul"], ["Espacio", "Chutar (mantén para cargar potencia)"], ["Flechas", "Jugador rojo (dos jugadores)"], ["Enter", "Chute del jugador rojo"], ["Esc / P", "Pausa (o botón Ⅱ PAUSA)"], ["R", "Reiniciar"], ["F", "Mostrar FPS"]]
    }
  ];

  var PROJECTS = [
    { cat: "01 / Ilustración", title: "Personaje ilustrado", tool: ["ai", "Ai", "Adobe Illustrator"], desc: "Creación de un personaje digital mediante ilustración vectorial, trabajando formas, composición y detalles visuales.", extra: "Exploración de pixel art y fan art con énfasis en contraste, siluetas y lectura rápida de la forma." },
    { cat: "02 / Fotografía", title: "Fotografía y retoque digital", tool: ["ps", "Ps", "Adobe Photoshop"], desc: "Edición y retoque fotográfico enfocados en mejorar composición, color, iluminación y narrativa visual.", extra: "Producto y bodegón: dirección de arte, corrección de color y limpieza de detalles." },
    { cat: "03 / Desarrollo web", title: "Diseño y desarrollo web", tool: ["vs", "VS", "Visual Studio Code"], url: "https://divinevanity.co", urlLabel: "Divinevanity.co", desc: "Diseñé Divinevanity.co, una tienda online de belleza: estructura, colecciones, ofertas y una experiencia de compra pensada para escritorio y celular.", extra: "Desplázate dentro de la vista previa para recorrer la página, o visítala en vivo con el botón." },
    { cat: "04 / Motion graphics", title: "Animación y motion graphics", tool: ["ae", "Ae", "Adobe After Effects"], desc: "Creación de animaciones y composiciones audiovisuales mediante movimiento, efectos y narrativa visual.", extra: "Principios de animación aplicados: anticipación, squash & stretch y timing." },
    { cat: "05 / Edición audiovisual", title: "Edición de video", tool: ["pr", "Pr", "Adobe Premiere Pro"], desc: "Edición y montaje de contenido audiovisual, trabajando ritmo, transiciones, sonido y narrativa.", extra: "Montaje con intención: cada corte acompaña el ritmo de la música y la historia." },
    { cat: "06 / Modelado 3D", title: "Personajes 3D", tool: ["bl", "Bl", "Blender"], desc: "Modelado y creación de personajes tridimensionales explorando formas, proporciones, materiales y composición.", extra: "Tres personajes modelados en Blender: un gato negro, el dálmata de BlackDot y un ninja. Del model sheet al volumen: blocking, proporción y materiales." },
    { cat: "07 / Videojuegos", title: "Videojuegos para web", tool: ["js", "JS", "JavaScript · Three.js · Canvas 2D"], desc: "Seis juegos completos que corren directamente en el navegador: Cúcuta Open World, Dynasty FC, SkyBound, Rally Rush, Pixel Pong 2D y Atari Football 2D.", extra: "Pulsa «Ir a jugar» para ir al arcade y probarlos ahora mismo.", games: true }
  ];

  var TOOLS = [
    { cls: "ai", t: "Ai", title: "Adobe Illustrator", desc: "Herramienta de diseño vectorial para crear logotipos, ilustraciones, piezas gráficas, iconos e identidades visuales.", uses: ["Diseño de logotipos", "Ilustración vectorial", "Identidad visual", "Iconos y piezas gráficas"] },
    { cls: "ps", t: "Ps", title: "Adobe Photoshop", desc: "Herramienta de edición y composición de imágenes para crear y transformar contenido visual.", uses: ["Retoque fotográfico", "Composición digital", "Edición de imágenes", "Diseño gráfico"] },
    { cls: "pr", t: "Pr", title: "Adobe Premiere Pro", desc: "Herramienta profesional de edición de video para crear y montar contenido audiovisual.", uses: ["Edición de video", "Montaje audiovisual", "Corrección de color", "Contenido para redes"] },
    { cls: "ae", t: "Ae", title: "Adobe After Effects", desc: "Herramienta enfocada en motion graphics y efectos visuales.", uses: ["Motion graphics", "Animaciones", "Efectos visuales", "Títulos y composiciones"] },
    { cls: "bl", t: "Bl", title: "Blender", desc: "Plataforma de creación 3D para modelado, animación, materiales y renderizado.", uses: ["Modelado 3D", "Animación", "Texturizado", "Renderizado"] },
    { cls: "vs", t: "VS", title: "Visual Studio Code", desc: "Editor de código para desarrollar sitios web, aplicaciones y videojuegos.", uses: ["HTML", "CSS", "JavaScript", "Depuración"] },
    { cls: "js", t: "JS", title: "JavaScript", desc: "El lenguaje que da vida a la web: interacción, lógica y videojuegos en el navegador.", uses: ["Interacciones", "Lógica de juego", "Animaciones", "APIs del navegador"] },
    { cls: "th", t: "3D", title: "Three.js", desc: "Librería WebGL para crear gráficos 3D en tiempo real. Es el motor de mis cuatro videojuegos.", uses: ["Escenas 3D", "Iluminación y sombras", "Cámaras y física", "Videojuegos web"] }
  ];

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
  function initTheme() {
    var btn = $("#theme-btn");
    var meta = $('meta[name="theme-color"]');
    function current() {
      var t = root.getAttribute("data-theme");
      if (t) return t;
      return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }
    function sync() {
      var c = current();
      btn.setAttribute("aria-label", c === "light" ? "Cambiar a modo oscuro" : "Cambiar a modo claro");
      if (meta) meta.setAttribute("content", c === "light" ? "#F4F4F1" : "#0A0A0A");
      document.dispatchEvent(new CustomEvent("themechange"));
    }
    btn.addEventListener("click", function () {
      var next = current() === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("blackdot-theme", next); } catch (e) {}
      sync();
    });
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
        done();
        setTimeout(function () { pre.style.display = "none"; }, 1200);
      }, reduced ? 0 : 260);
    }
    if (reduced) { finish(); return; }
    var start = performance.now(), minTime = 1500;
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

  /* ---------------- Lienzo de puntos del hero ---------------- */
  function initDots() {
    var canvas = $("#hero-canvas");
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var hero = $("#inicio");
    var dpr = Math.min(devicePixelRatio || 1, 2);
    var W = 0, H = 0, pts = [], gap = 30, mx = -9999, my = -9999, visible = true, rgb = "255,255,255", t0 = performance.now();
    function readColor() { rgb = getComputedStyle(root).getPropertyValue("--dot").trim() || "255,255,255"; }
    function build() {
      W = hero.clientWidth; H = hero.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      gap = W < 640 ? 24 : 30;
      pts = [];
      for (var y = gap / 2; y < H; y += gap) for (var x = gap / 2; x < W; x += gap) pts.push({ x: x, y: y, ox: x, oy: y });
    }
    function draw(now) {
      ctx.clearRect(0, 0, W, H);
      var t = (now - t0) / 1000;
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        var dx = p.ox - mx, dy = p.oy - my, d = Math.sqrt(dx * dx + dy * dy), R = 150;
        var tx = p.ox, ty = p.oy, s = 1.1, a = 0.16;
        var wave = Math.sin(p.ox * 0.012 + t * 1.2) * Math.cos(p.oy * 0.014 + t * 0.9);
        a += wave * 0.06;
        if (d < R) {
          var f = 1 - d / R;
          tx += (dx / (d || 1)) * f * 26; ty += (dy / (d || 1)) * f * 26;
          s += f * 2.4; a += f * 0.7;
        }
        p.x += (tx - p.x) * 0.16; p.y += (ty - p.y) * 0.16;
        if (d < R * 0.6) ctx.fillStyle = "rgba(10,132,255," + Math.min(1, a + 0.15) + ")";
        else ctx.fillStyle = "rgba(" + rgb + "," + Math.max(0.04, a) + ")";
        ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, 6.2832); ctx.fill();
      }
    }
    function loop(now) { if (visible) draw(now); requestAnimationFrame(loop); }
    readColor(); build();
    document.addEventListener("themechange", function () { readColor(); if (reduced) draw(performance.now()); });
    var rt; addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { build(); if (reduced) draw(performance.now()); }, 150); });
    if (reduced) { draw(performance.now()); return; }
    hero.addEventListener("pointermove", function (e) { var r = hero.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; }, { passive: true });
    hero.addEventListener("pointerleave", function () { mx = my = -9999; });
    if ("IntersectionObserver" in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(hero);
    requestAnimationFrame(loop);
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
        v.controls = true; v.playsInline = true; v.autoplay = true; v.loop = true;
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
    }
    var fanEl = $("#games-fan");
    if (fanEl) fanEl.innerHTML = fanHtml();
    $("#pm-play").addEventListener("click", function () { closeModal(modal); });
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
        var t = TOOLS[+btn.getAttribute("data-tool")];
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
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = fields.map(check).every(Boolean);
      var okS = checkServices();
      if (!ok || !okS) {
        status.className = "form-status err"; status.textContent = "Revisa los campos marcados.";
        var bad = $('[aria-invalid="true"]', form) || services[0]; if (bad) bad.focus();
        return;
      }
      var d = new FormData(form);
      var body = "Nombre: " + d.get("nombre") + "\nCorreo: " + d.get("correo") + "\nTeléfono: " + d.get("telefono") + "\nEmpresa: " + (d.get("empresa") || "—") + "\nServicios: " + d.getAll("servicio").join(", ") + "\n\n" + d.get("mensaje");
      var url = "mailto:dannarb0444@gmail.com?subject=" + encodeURIComponent("Nuevo proyecto — " + d.get("nombre")) + "&body=" + encodeURIComponent(body);
      status.className = "form-status ok"; status.textContent = "¡Gracias! Se abrirá tu app de correo con el mensaje listo para enviar.";
      window.location.href = url;
    });
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

  /* ---------------- Salón de récords (LocalStorage, formato JSON) ----------------
     Los juegos 2D guardan sus estadísticas en estas claves; el portafolio las lee,
     las valida y permite reiniciarlas. Datos inexistentes o dañados = valores en 0. */
  var RECORDS = [
    {
      key: "blackdot-football", gameId: "atarifootball", title: "Atari Football 2D", color: "#D9FF56",
      stats: function (d) {
        return [[d.played, "Partidos"], [d.won, "Victorias"], [d.best, "Mejor racha"], [d.bestGoals, "Récord de goles"]];
      },
      modes: { ai: "vs CPU", two: "2 jugadores" }
    },
    {
      key: "blackdot-pixelpong-v1", gameId: "pixelpong", title: "Pixel Pong 2D", color: "#52E5FF",
      stats: function (d) {
        return [[d.games, "Partidas"], [d.wins, "Victorias"], [d.bestStreak, "Mejor racha"], [d.best, "Récord desafío"]];
      },
      modes: { ai: "vs IA", local: "2 jugadores", challenge: "Desafío" }
    }
  ];
  function readRecord(key) {
    var d = {};
    try {
      var v = JSON.parse(localStorage.getItem(key) || "{}");
      if (v && typeof v === "object" && !Array.isArray(v)) d = v;
    } catch (e) { d = {}; }
    function num(n) { n = Number(n); return isFinite(n) && n >= 0 ? Math.floor(n) : 0; }
    var out = {};
    ["played", "won", "best", "bestGoals", "games", "wins", "bestStreak"].forEach(function (k) { out[k] = num(d[k]); });
    out.history = Array.isArray(d.history) ? d.history.filter(function (h) { return h && isFinite(h.a) && isFinite(h.b); }).slice(0, 5) : [];
    return out;
  }
  function fmtDate(iso) {
    var d = iso ? new Date(iso) : null;
    return d && !isNaN(d) ? d.toLocaleDateString("es-CO", { day: "2-digit", month: "short" }) : "—";
  }
  function renderRecords() {
    var grid = $("#records-grid");
    if (!grid) return;
    grid.innerHTML = RECORDS.map(function (r) {
      var d = readRecord(r.key);
      var hist = d.history.length ? d.history.map(function (h) {
        return "<li><span>" + esc(fmtDate(h.date)) + "</span><span>" + esc(r.modes[h.mode] || h.mode || "—") + "</span><b>" + esc(h.a + " – " + h.b) + "</b></li>";
      }).join("") : '<li class="empty">Aún no hay partidas registradas.</li>';
      return '<article class="record-card" style="--gc:' + r.color + '">' +
        '<header><h4>' + esc(r.title) + '</h4><button type="button" class="record-play" data-play="' + r.gameId + '">Jugar <span aria-hidden="true">→</span></button></header>' +
        '<dl class="record-stats">' + r.stats(d).map(function (s) { return "<div><dt>" + esc(s[1]) + "</dt><dd>" + s[0] + "</dd></div>"; }).join("") + "</dl>" +
        '<p class="record-sub">Últimas partidas</p><ul class="record-history">' + hist + "</ul>" +
        '<button type="button" class="record-reset" data-reset="' + r.key + '">Reiniciar estadísticas</button>' +
        "</article>";
    }).join("");
  }
  function initRecords() {
    var grid = $("#records-grid");
    if (!grid) return;
    renderRecords();
    grid.addEventListener("click", function (e) {
      var reset = e.target.closest("[data-reset]");
      if (reset) {
        var r = RECORDS.filter(function (x) { return x.key === reset.getAttribute("data-reset"); })[0];
        if (!r || !confirm("¿Borrar las estadísticas e historial de " + r.title + "?")) return;
        try {
          /* Se conservan las preferencias (sonido, dificultad) y se borran los datos de juego */
          var prev = JSON.parse(localStorage.getItem(r.key) || "{}") || {};
          localStorage.setItem(r.key, JSON.stringify({ sound: prev.sound !== false, difficulty: prev.difficulty }));
        } catch (err) { try { localStorage.removeItem(r.key); } catch (e2) {} }
        renderRecords();
        toast("Estadísticas de " + r.title + " reiniciadas.");
        return;
      }
      var play = e.target.closest("[data-play]");
      if (play) {
        var g = GAMES.filter(function (x) { return x.id === play.getAttribute("data-play"); })[0];
        if (g) playGame(g, e);
      }
    });
    /* El juego corre en un iframe del mismo origen: el evento storage avisa de cada guardado */
    addEventListener("storage", function (e) {
      if (!e.key || RECORDS.some(function (r) { return r.key === e.key; })) renderRecords();
    });
    document.addEventListener("gameclosed", renderRecords);
  }

  function initGames() {
    initPlayer();
    renderGames();
    initRecords();
  }

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
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
