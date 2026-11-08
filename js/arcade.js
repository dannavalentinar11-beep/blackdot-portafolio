/* ==========================================================================
   BLACKDOT ARCADE — controlador de la sala (vanilla JS)
   - Pantalla de entrada con puertas y transición cinematográfica.
   - Sala 3D (js/arcade3d.js + Three.js, cargado solo al entrar) o
     galería pseudo-3D en modo ligero (sin WebGL, movimiento reducido o
     equipos de baja capacidad). La persona puede cambiar de modo.
   - Seis estaciones, panel de información, ficha de cada juego y
     «Jugar ahora» con el reproductor original del portafolio (js/script.js).
   ========================================================================== */
(function () {
  "use strict";

  function init() {
    var B = window.BLACKDOT;
    var section = document.getElementById("juegos");
    if (!B || !section || !document.getElementById("arcade-hall")) return;

    /* Orden de la sala (izquierda → derecha): Cúcuta Open World y Sky Bound ocupan
       las dos posiciones centrales; los otros cuatro quedan igual de visibles a los lados. */
    var ORDER = ["dynasty", "rally", "cucuta", "skybound", "pixelpong", "atarifootball"];
    var GAMES = ORDER.map(function (id) { return B.GAMES.filter(function (g) { return g.id === id; })[0]; }).filter(Boolean);
    var IMG = "assets/img/arcade/";
    var $ = function (s, c) { return (c || document).querySelector(s); };
    var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
    var esc = B.esc;
    var reduced = B.reduced;
    var room = $("#arcade-room"), hall = $("#arcade-hall"), stage = $("#hall-stage"), list = $("#stations");
    var info = $("#hall-info"), tip = $("#hall-tip"), canvas = $("#arcade-canvas");
    var sheet = $("#game-sheet"), modeBtn = $("#hall-mode"), overviewBtn = $("#hall-overview");

    var cur = Math.max(0, ORDER.indexOf("cucuta")), entered = false, focused = false, mode = "flat", engine = null, loading = null, inView = false, pendingEnter = false, sheetIdx = 0, swallowClick = false;

    function setFocused(v) { focused = v; hall.classList.toggle("is-overview", mode === "3d" && !v); }
    function pad(n) { return n < 10 ? "0" + n : String(n); }
    function wrap(i) { return (i + GAMES.length) % GAMES.length; }

    /* ---------- Capacidades del dispositivo ---------- */
    var hasWebGL = (function () {
      try { var c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl"))); } catch (e) { return false; }
    })();
    var nav = navigator;
    var lowPower = !!((nav.connection && nav.connection.saveData) || (nav.deviceMemory && nav.deviceMemory <= 2) || (nav.hardwareConcurrency && nav.hardwareConcurrency <= 2));
    var coarse = window.matchMedia("(pointer: coarse)").matches;
    function readMode() { try { return localStorage.getItem("blackdot-arcade-mode"); } catch (e) { return null; } }
    function saveMode(m) { try { localStorage.setItem("blackdot-arcade-mode", m); } catch (e) {} }
    function preferredMode() {
      if (!hasWebGL) return "flat";
      var s = readMode();
      if (s === "3d" || s === "flat") return s;
      return (reduced || lowPower) ? "flat" : "3d";
    }
    function tier() {
      if (coarse || innerWidth < 760) return "low";
      if ((nav.hardwareConcurrency || 8) <= 4 || (devicePixelRatio || 1) > 2.5) return "medium";
      return "high";
    }
    function layout() {
      var mobile = innerWidth <= 760;
      var r = info.getBoundingClientRect(), W = stage.clientWidth || innerWidth;
      return { panel: mobile ? "bottom" : "left", frac: mobile ? 0 : Math.min(0.45, (r.right + 12) / W) };
    }

    /* ---------- Estaciones ---------- */
    list.innerHTML = GAMES.map(function (g, i) {
      var n = pad(i + 1);
      return '<li style="--gc:' + g.color + '"><button class="st" type="button" data-i="' + i + '" aria-label="Estación ' + n + ": " + esc(g.name) + " — " + esc(g.genre) + '">' +
        '<span class="st-marquee"><span class="st-num">' + n + '</span><span class="st-name">' + esc(g.name) + "</span></span>" +
        '<span class="st-screen"><img src="' + IMG + g.shots[0] + '-640.webp" alt="" width="640" height="360" loading="lazy" decoding="async"></span>' +
        '<span class="st-genre">' + esc(g.station) + " · " + esc(g.dim) + "</span>" +
        '<span class="st-short">' + esc(g.short) + "</span>" +
        "</button>" +
        '<button class="st-play" type="button" data-play="' + i + '" aria-label="Jugar ' + esc(g.name) + '"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5z"/></svg> Jugar</button></li>';
    }).join("");
    var items = $$("li", list), buttons = $$(".st", list);

    function fillInfo(i) {
      var g = GAMES[i];
      info.style.setProperty("--gc", g.color);
      $("#hi-num").textContent = pad(i + 1);
      $("#hi-station").textContent = g.station + " · " + g.dim;
      $("#hi-name").textContent = g.name;
      $("#hi-genre").textContent = g.genre;
      $("#hi-desc").textContent = g.desc;
      $("#hall-num").textContent = pad(i + 1);
      info.classList.remove("is-swap"); void info.offsetWidth; if (!reduced) info.classList.add("is-swap");
    }
    function layoutFlat() {
      items.forEach(function (li, i) { li.classList.toggle("is-current", i === cur); });
      /* En pantallas estrechas la fila de máquinas se desplaza: centra la seleccionada */
      if (mode !== "3d" && list.scrollWidth > list.clientWidth + 4) {
        var li = items[cur];
        list.scrollTo({ left: Math.max(0, li.offsetLeft - (list.clientWidth - li.offsetWidth) / 2), behavior: reduced ? "auto" : "smooth" });
      }
    }
    function scrollRail() {
      if (mode !== "3d") return;
      var b = buttons[cur]; if (!b) return;
      var l = b.parentNode.offsetLeft - (list.clientWidth - b.parentNode.offsetWidth) / 2;
      list.scrollTo({ left: Math.max(0, l), behavior: reduced ? "auto" : "smooth" });
    }
    function select(i, opts) {
      opts = opts || {};
      cur = wrap(i);
      buttons.forEach(function (b, k) {
        b.classList.toggle("is-active", k === cur);
        if (k === cur) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current");
      });
      fillInfo(cur);
      layoutFlat();
      scrollRail();
      if (engine && !opts.noCamera) { engine.focus(cur); setFocused(true); }
    }

    /* ---------- Ficha del juego ---------- */
    function fillSheet(i) {
      sheetIdx = wrap(i);
      var g = GAMES[sheetIdx];
      sheet.style.setProperty("--gc", g.color);
      $("#gs-bg").src = IMG + g.shots[0] + "-640.webp";
      var img = $("#gs-img");
      img.src = IMG + g.shots[0] + ".webp";
      img.alt = "Captura real de " + g.name;
      $("#gs-dim").textContent = g.dim + " · " + g.station;
      $("#gs-thumbs").innerHTML = g.shots.map(function (s, k) {
        return '<button type="button" data-shot="' + s + '" aria-pressed="' + (k === 0) + '" aria-label="Ver captura ' + (k + 1) + " de " + esc(g.name) + '"><img src="' + IMG + s + '-640.webp" alt="" width="640" height="360" loading="lazy"></button>';
      }).join("");
      $("#gs-kicker").textContent = "Estación " + pad(sheetIdx + 1) + " · " + g.station;
      $("#gs-title").textContent = g.name;
      $("#gs-genre").textContent = g.genre + " · " + g.dim;
      $("#gs-desc").textContent = g.desc;
      $("#gs-mech").innerHTML = g.mechanics.map(function (m) { return "<li>" + esc(m) + "</li>"; }).join("");
      $("#gs-ctrl").innerHTML = g.controls.map(function (c) { return "<li><kbd>" + esc(c[0]) + "</kbd><span>" + esc(c[1]) + "</span></li>"; }).join("");
      $("#gs-help").textContent = g.help || "";
      $("#gs-tech").innerHTML = g.tech.map(function (t) { return "<span>" + esc(t) + "</span>"; }).join("");
      $("#gs-tab").href = g.file;
      $(".sheet-panel", sheet).scrollTop = 0;
    }
    function openSheet(i, trigger) {
      fillSheet(i);
      if (sheet.hidden) B.openModal(sheet, trigger || buttons[cur]);
      syncActive();
    }
    $("#gs-thumbs").addEventListener("click", function (e) {
      var b = e.target.closest("[data-shot]"); if (!b) return;
      $("#gs-img").src = IMG + b.getAttribute("data-shot") + ".webp";
      $$("[data-shot]", sheet).forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
    });
    $("#gs-play").addEventListener("click", function (e) {
      var g = GAMES[sheetIdx];
      B.closeModal(sheet);
      B.playGame(g, e);
    });
    $("#gs-prev").addEventListener("click", function () { fillSheet(sheetIdx - 1); select(sheetIdx); });
    $("#gs-next").addEventListener("click", function () { fillSheet(sheetIdx + 1); select(sheetIdx); });
    sheet._onClosed = function () { syncActive(); };

    /* ---------- Panel ---------- */
    $("#hi-play").addEventListener("click", function (e) { B.playGame(GAMES[cur], e); });
    $("#hi-open").addEventListener("click", function (e) { openSheet(cur, e.currentTarget); });
    $("#hall-prev").addEventListener("click", function () { select(cur - 1); });
    $("#hall-next").addEventListener("click", function () { select(cur + 1); });
    overviewBtn.addEventListener("click", function () { if (engine) { engine.overview(); setFocused(false); } });
    list.addEventListener("click", function (e) {
      var p = e.target.closest(".st-play");
      if (p) { var k = +p.getAttribute("data-play"); select(k, { noCamera: true }); B.playGame(GAMES[k], e); return; }
      var b = e.target.closest(".st"); if (!b) return;
      if (swallowClick) { swallowClick = false; return; }
      var i = +b.getAttribute("data-i");
      if (mode !== "3d") { select(i); openSheet(i, b); }
      else if (i === cur && focused) openSheet(i, b);
      else select(i);
    });


    /* ---------- Teclado ---------- */
    addEventListener("keydown", function (e) {
      if (e.defaultPrevented || !entered || !inView || B.hasOpenModal() || B.isPlayerOpen()) return;
      var t = e.target;
      if (t && (/INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable)) return;
      if (e.key === "ArrowRight") { e.preventDefault(); select(cur + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); select(cur - 1); }
      else if (e.key === "Home") { e.preventDefault(); select(0); }
      else if (e.key === "End") { e.preventDefault(); select(GAMES.length - 1); }
      else if (e.key === "Enter" && !(t && t.closest && t.closest("button, a"))) { e.preventDefault(); openSheet(cur); }
      else if (e.key === "Escape" && engine && focused) { engine.overview(); setFocused(false); }
    });

    /* ---------- Tooltip de la sala 3D ---------- */
    function onHover(i, x, y) {
      canvas.classList.toggle("is-hover", i >= 0);
      if (i < 0) { tip.classList.remove("is-show"); return; }
      var g = GAMES[i];
      if (tip._i !== i) {
        tip._i = i;
        tip.style.setProperty("--gc", g.color);
        $("small", tip).textContent = "Estación " + pad(i + 1) + " · " + g.station;
        $("strong", tip).textContent = g.name;
        $("span", tip).textContent = g.short;
        $("em", tip).textContent = (i === cur && focused) ? "Clic para abrir la ficha" : "Clic para seleccionar";
      }
      var r = stage.getBoundingClientRect();
      var tx = Math.min(r.width - 266, x - r.left + 18), ty = Math.min(r.height - 130, y - r.top + 18);
      tip.style.setProperty("--tx", Math.max(8, tx) + "px");
      tip.style.setProperty("--ty", Math.max(8, ty) + "px");
      tip.classList.add("is-show");
    }

    /* ---------- Motor 3D ---------- */
    var dynImport = null;
    function loadModule() {
      if (!loading) {
        try { dynImport = dynImport || new Function("u", "return import(u)"); } catch (e) { return Promise.reject(e); }
        loading = dynImport(new URL("js/arcade3d.js?v=2.2", document.baseURI).href);
        loading.catch(function () { loading = null; });
      }
      return loading;
    }
    function shouldRender() { return entered && inView && !document.hidden && !B.isPlayerOpen() && sheet.hidden; }
    function syncActive() { if (engine) engine.setActive(entered && inView && !document.hidden); }
    function fallbackToFlat(msg) {
      if (engine) { try { engine.dispose(); } catch (e) {} engine = null; }
      setMode("flat", false);
      if (msg) B.toast(msg, true);
    }
    function startEngine() {
      hall.classList.remove("is-ready");
      $("#hall-load-txt").textContent = "Encendiendo la sala…";
      var token = {};
      startEngine.token = token;
      var timer = setTimeout(function () { if (startEngine.token === token && !engine) fallbackToFlat("La sala 3D tardó demasiado en cargar. Se muestra el modo ligero."); }, 20000);
      loadModule().then(function (mod) {
        if (startEngine.token !== token || mode !== "3d") return;
        engine = mod.createArcade({
          canvas: canvas, container: stage, games: GAMES, imgBase: IMG, tier: tier(), reduced: reduced,
          getLayout: layout, shouldRender: shouldRender,
          onHover: onHover,
          onPick: function (i) {
            var wasFocused = focused && i === cur;
            select(i);
            setTimeout(function () { openSheet(i, buttons[i]); }, wasFocused || reduced ? 0 : 950);
          },
          onSwipe: function (dir) { select(cur + dir); },
          onProgress: function (p) { $("#hall-load-txt").textContent = "Encendiendo la sala… " + Math.round(p * 100) + "%"; },
          onLost: function () { fallbackToFlat("Se perdió el contexto gráfico. Se muestra el modo ligero."); }
        });
        return engine.ready.then(function () {
          clearTimeout(timer);
          if (startEngine.token !== token || !engine) return;
          hall.classList.add("is-ready");
          syncActive();
          engine.intro();
          setFocused(false);
          /* En vertical la vista general solo muestra el centro: se acerca a la estación actual al terminar la entrada */
          if (innerWidth <= 760 && innerHeight > innerWidth) setTimeout(function () { if (engine && !focused) select(cur); }, reduced ? 0 : 2800);
        });
      }).catch(function (err) {
        clearTimeout(timer);
        if (window.console) console.warn("BLACKDOT ARCADE: la sala 3D no está disponible.", err);
        if (startEngine.token === token) fallbackToFlat("La sala 3D no está disponible en este navegador. Se muestra el modo ligero.");
      });
    }
    function setMode(m, persist) {
      mode = (m === "3d" && hasWebGL) ? "3d" : "flat";
      hall.classList.toggle("is-3d", mode === "3d");
      hall.classList.toggle("is-flat", mode !== "3d");
      modeBtn.setAttribute("aria-pressed", mode === "flat" ? "true" : "false");
      $("#hall-mode-txt").textContent = mode === "3d" ? "Modo ligero" : "Sala 3D";
      modeBtn.title = mode === "3d" ? "Cambiar al modo ligero (sin 3D)" : (hasWebGL ? "Volver a la sala 3D" : "Tu navegador no soporta WebGL");
      modeBtn.setAttribute("aria-label", modeBtn.title);
      modeBtn.disabled = !hasWebGL && mode === "flat";
      overviewBtn.hidden = mode !== "3d";
      tip.classList.remove("is-show");
      if (persist) saveMode(mode);
      if (mode === "3d") { if (entered && !engine) startEngine(); }
      else if (engine) { startEngine.token = null; engine.dispose(); engine = null; setFocused(false); }
      layoutFlat();
      if (mode === "3d") scrollRail(); else requestAnimationFrame(layoutFlat);
    }
    modeBtn.addEventListener("click", function () { setMode(mode === "3d" ? "flat" : "3d", true); });

    /* ---------- Entrada ---------- */
    function enter() {
      if (entered) return;
      entered = true; pendingEnter = false;
      setMode(preferredMode(), false);
      section.classList.add("is-opening");
      select(cur, { noCamera: true });
      setTimeout(function () {
        section.classList.add("is-entered");
        var b = buttons[cur]; if (b) b.focus({ preventScroll: true });
      }, reduced ? 0 : 700);
    }
    var enterBtn = $("#arcade-enter");
    enterBtn.addEventListener("click", enter);
    /* Precarga por intención: solo cuando la persona apunta al botón de entrada */
    function prefetch() { if (hasWebGL && preferredMode() === "3d") loadModule().catch(function () {}); }
    $$("#arcade-enter, [data-enter-arcade]").forEach(function (b) {
      b.addEventListener("pointerenter", prefetch, { once: true });
      b.addEventListener("focus", prefetch, { once: true });
    });
    $$("[data-enter-arcade]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        prefetch();
        pendingEnter = true;
        room.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
        if (history.replaceState) history.replaceState(null, "", "#juegos");
        setTimeout(function () { if (pendingEnter) enter(); }, 1600);
      });
    });

    /* ---------- Visibilidad: pausa la sala fuera de pantalla ---------- */
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) {
        inView = en[0].intersectionRatio > 0.15;
        if (pendingEnter && en[0].intersectionRatio > 0.6) enter();
        syncActive();
      }, { threshold: [0, 0.15, 0.6, 1] }).observe(room);
    } else { inView = true; }
    document.addEventListener("visibilitychange", syncActive);
    document.addEventListener("gameclosed", function () {
      syncActive();
      if (entered && buttons[cur]) buttons[cur].focus({ preventScroll: true });
    });

    /* Estado inicial (sin entrar todavía): modo ligero preparado, sin cargar 3D */
    setMode("flat", false);
    select(cur, { noCamera: true });
    if (location.hash === "#juegos") {
      pendingEnter = true;
      /* Llegada desde un juego (index.html#juegos): al terminar de cargar, corrige la
         posición si el diseño cambió de altura y entra sin depender solo del observador */
      addEventListener("load", function () {
        if (!pendingEnter) return;
        var top = room.getBoundingClientRect().top;
        if (Math.abs(top) > 40) room.scrollIntoView({ block: "start" });
        inView = true;
        setTimeout(function () { if (pendingEnter) enter(); }, 300);
      }, { once: true });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
