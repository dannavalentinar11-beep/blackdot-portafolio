/* ==========================================================================
   BLACKDOT — panel «Tus métricas» (arcade.html)
   Muestra lo que guarda localStorage: visitas, partidas iniciadas por juego,
   récords registrados, uso del 3D Lab y de la experiencia WebAR, y el historial
   de marcadores de los juegos de la asignatura (Ping-Pong 2D y Fútbol 2D Atari).
   ========================================================================== */
(function () {
  "use strict";
  function init() {
    var grid = document.getElementById("metrics-grid"), hist = document.getElementById("metrics-hist");
    var S = window.BDStore, B = window.BLACKDOT;
    if (!grid || !S || !B) return;
    var esc = B.esc;
    var names = {}; B.GAMES.forEach(function (g) { names[g.id] = g.course || g.name; });
    var fmtDate = function (v) { var d = new Date(v); return isNaN(d) ? "—" : d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }); };
    var sum = function (o) { return Object.keys(o || {}).reduce(function (a, k) { return a + (Number(o[k]) || 0); }, 0); };

    function render() {
      var m = S.getMetrics();
      var plays = B.GAMES.map(function (g) { var x = m.games[g.id]; return { g: g, n: x ? x.plays || 0 : 0 }; });
      var totalPlays = plays.reduce(function (a, p) { return a + p.n; }, 0);
      var hall = S.read(S.KEYS.hall, function (h) { return h && typeof h.games === "object"; }, { games: {} });
      var withRec = Object.keys(hall.games).filter(function (k) { return names[k] && hall.games[k].has; }).length;
      var cards = [
        ["Visitas", m.visits, "Desde el " + fmtDate(m.firstVisit)],
        ["Partidas iniciadas", totalPlays, "En los 6 juegos del arcade"],
        ["Juegos con récord", withRec + " / " + B.GAMES.length, "Registrados en el Salón de la fama"],
        ["Modelos 3D vistos", sum(m.lab), "En BLACKDOT 3D Lab"],
        ["Sesiones WebAR", m.ar.sessions || 0, (m.ar.interactions || 0) + " interacciones con el cursor"],
        ["Mensajes enviados", (m.contact.sent || 0) + (m.contact.whatsapp || 0), "Formulario y WhatsApp"]
      ];
      grid.innerHTML = cards.map(function (c) { return '<div class="metric"><span>' + esc(c[0]) + '</span><b>' + esc(String(c[1])) + '</b><small>' + esc(c[2]) + "</small></div>"; }).join("") +
        '<div class="metric metric--wide"><span>Partidas por juego</span><ul class="metric-bars">' + plays.map(function (p) {
          var w = totalPlays ? Math.round((p.n / totalPlays) * 100) : 0;
          return '<li><em>' + esc(names[p.g.id]) + (p.g.group === "curso" ? " ★" : "") + '</em><i style="--w:' + w + '%;--gc:' + p.g.color + '"></i><b>' + p.n + "</b></li>";
        }).join("") + "</ul></div>";

      /* Historial de marcadores guardado por los propios juegos 2D */
      var rows = [];
      var pp = S.read("blackdot-pixelpong-v1", function (d) { return d && typeof d === "object"; }, {});
      (Array.isArray(pp.history) ? pp.history : []).slice(0, 5).forEach(function (h) { if (h && isFinite(h.a) && isFinite(h.b)) rows.push(["Ping-Pong 2D", { ai: "vs IA", local: "2 jugadores", challenge: "Desafío" }[h.mode] || "Partida", h.a + " – " + h.b, h.date]); });
      var fb = S.read("blackdot-football", function (d) { return d && typeof d === "object"; }, {});
      (Array.isArray(fb.history) ? fb.history : []).slice(0, 5).forEach(function (h) { if (h && isFinite(h.a) && isFinite(h.b)) rows.push(["Fútbol 2D Atari", { ai: "vs CPU", two: "2 jugadores" }[h.mode] || "Partido", h.a + " – " + h.b, h.date]); });
      rows.sort(function (a, b) { return new Date(b[3] || 0) - new Date(a[3] || 0); });
      hist.innerHTML = rows.length
        ? '<table class="metrics-table"><thead><tr><th scope="col">Juego</th><th scope="col">Modo</th><th scope="col">Marcador</th><th scope="col">Fecha</th></tr></thead><tbody>' +
          rows.map(function (r) { return "<tr><td>" + esc(r[0]) + "</td><td>" + esc(r[1]) + "</td><td><b>" + esc(r[2]) + "</b></td><td>" + esc(r[3] ? fmtDate(r[3]) : "—") + "</td></tr>"; }).join("") + "</tbody></table>"
        : '<p class="metrics-empty">Aún no hay partidas. Juega Ping-Pong 2D o Fútbol 2D Atari y tu marcador aparecerá aquí.</p>';
    }
    render();
    document.addEventListener("blackdot:metrics", render);
    document.addEventListener("gameclosed", render);
    addEventListener("storage", render);
    var btn = document.getElementById("metrics-reset");
    if (btn) btn.addEventListener("click", function () {
      if (!confirm("¿Reiniciar las métricas de interacción? Los récords y partidas guardadas de los juegos se conservan.")) return;
      S.resetMetrics(); B.toast("Métricas reiniciadas.");
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
