/* ==========================================================================
   BLACKDOT — almacenamiento local (API localStorage) · módulo BDStore
   --------------------------------------------------------------------------
   Registro de claves (cada módulo usa la suya para evitar conflictos):

   Portafolio (prefijo blackdot-)
     blackdot-theme          "light" | "dark"           tema elegido
     blackdot-arcade-mode    "3d" | "flat"              modo de la sala del arcade
     blackdot-hall-v1        { v:1, games:{…} }         récords centrales (js/halloffame.js)
     blackdot-metrics-v1     { v:1, … }                 métricas de interacción (este módulo)
   Videojuegos (claves propias de cada juego; este módulo NO las modifica)
     blackdot-pixelpong-v1   Ping-Pong 2D: estadísticas e historial de marcadores
     blackdot-football       Fútbol 2D Atari: estadísticas e historial de marcadores
     skybound.profiles.v1 / skybound.save.v2.<piloto>   Sky Bound (aviones 3D)
     cow_save_v1_<nombre>    Cúcuta Open World
     dynastyfc.progress      Dynasty FC
     rallyrush_v1            Rally Rush

   No se guardan datos personales: el formulario de contacto no se almacena;
   las métricas solo cuentan acciones (visitas, partidas, cargas, interacciones).
   ========================================================================== */
(function () {
  "use strict";
  var METRICS_KEY = "blackdot-metrics-v1";
  var available = (function () {
    try { var k = "__bd_test__"; localStorage.setItem(k, "1"); localStorage.removeItem(k); return true; }
    catch (e) { console.warn("BLACKDOT: localStorage no está disponible (modo privado o bloqueado). Los datos no se guardarán.", e); return false; }
  })();

  function read(key, validate, fallback) {
    if (!available) return fallback;
    var raw;
    try { raw = localStorage.getItem(key); } catch (e) { console.warn("BLACKDOT: no se pudo leer", key, e); return fallback; }
    if (raw == null) return fallback;
    try {
      var v = JSON.parse(raw);
      if (validate && !validate(v)) { console.warn("BLACKDOT: datos con formato inválido en", key, "— se usan valores por defecto"); return fallback; }
      return v;
    } catch (e) { console.warn("BLACKDOT: JSON inválido en", key, e); return fallback; }
  }
  function write(key, value) {
    if (!available) return false;
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { console.warn("BLACKDOT: no se pudo guardar", key, "(¿almacenamiento lleno?)", e); return false; }
  }

  var isObj = function (o) { return !!o && typeof o === "object" && !Array.isArray(o); };
  var n = function (x) { x = Number(x); return isFinite(x) && x >= 0 ? Math.floor(x) : 0; };
  function emptyMetrics() {
    var now = new Date().toISOString();
    return { v: 1, firstVisit: now, lastVisit: now, visits: 0, pages: {}, games: {}, lab: {}, ar: { sessions: 0, interactions: 0, modes: {}, parts: {} }, contact: { sent: 0, whatsapp: 0 } };
  }
  function validMetrics(m) { return isObj(m) && m.v === 1 && isObj(m.pages) && isObj(m.games) && isObj(m.lab) && isObj(m.ar) && isObj(m.contact); }
  function getMetrics() { return read(METRICS_KEY, validMetrics, null) || emptyMetrics(); }
  function inc(obj, k, by) { obj[k] = n(obj[k]) + (by || 1); }

  /* Registra una acción. Tipos: page, game, lab, ar-session, ar-interaction, contact */
  function track(type, data) {
    var m = getMetrics(); data = data || {};
    m.lastVisit = new Date().toISOString();
    switch (type) {
      case "page": inc(m.pages, String(data.page || "index").slice(0, 40)); break;
      case "game":
        var g = m.games[data.id] = isObj(m.games[data.id]) ? m.games[data.id] : { plays: 0 };
        inc(g, "plays"); g.last = m.lastVisit; break;
      case "lab": inc(m.lab, String(data.id || "?").slice(0, 20)); break;
      case "ar-session": inc(m.ar, "sessions"); inc(m.ar.modes = isObj(m.ar.modes) ? m.ar.modes : {}, String(data.mode || "3d")); break;
      case "ar-interaction": inc(m.ar, "interactions"); inc(m.ar.parts = isObj(m.ar.parts) ? m.ar.parts : {}, String(data.part || "?").slice(0, 30)); break;
      case "contact": inc(m.contact, data.channel === "whatsapp" ? "whatsapp" : "sent"); break;
      default: console.warn("BLACKDOT: tipo de métrica desconocido", type); return m;
    }
    write(METRICS_KEY, m);
    document.dispatchEvent(new CustomEvent("blackdot:metrics", { detail: m }));
    return m;
  }

  /* Una visita por sesión del navegador */
  (function countVisit() {
    var page = (location.pathname.split("/").pop() || "index.html").replace(".html", "") || "index";
    var first = true;
    try { first = !sessionStorage.getItem("blackdot-session"); sessionStorage.setItem("blackdot-session", "1"); } catch (e) { first = true; }
    var m = getMetrics();
    if (first) { m.visits = n(m.visits) + 1; write(METRICS_KEY, m); }
    track("page", { page: page });
  })();

  window.BDStore = {
    available: available, read: read, write: write, track: track, getMetrics: getMetrics,
    resetMetrics: function () { var m = emptyMetrics(); write(METRICS_KEY, m); document.dispatchEvent(new CustomEvent("blackdot:metrics", { detail: m })); return m; },
    KEYS: { theme: "blackdot-theme", arcadeMode: "blackdot-arcade-mode", hall: "blackdot-hall-v1", metrics: METRICS_KEY }
  };
})();
