/* ==========================================================================
   SALÓN DE LA FAMA BLACKDOT — sistema central de récords (vanilla JS)

   Cada videojuego ya guarda sus resultados reales en LocalStorage con su propia
   clave y formato. Este módulo NO modifica el código de los juegos: un adaptador
   por juego lee su guardado, lo normaliza y lo compara con el registro central
   (`blackdot-hall-v1`), que conserva el mejor resultado de cada categoría y la
   fecha en que se consiguió.

   Flujo: ARCADE → JUEGO (iframe del mismo origen) → el juego guarda →
   evento `storage` en el portafolio → sync() → ¿supera el récord? → panel + aviso.
   ========================================================================== */
(function () {
  "use strict";

  var HALL_KEY = "blackdot-hall-v1";
  var IMG = "assets/img/arcade/";
  var MISSIONS_TOTAL = 8; /* misiones definidas en Cúcuta Open World (m1 … m8) */

  /* ---------- Utilidades ---------- */
  function readJSON(k) {
    try { var v = JSON.parse(localStorage.getItem(k)); return v && typeof v === "object" ? v : null; } catch (e) { return null; }
  }
  function writeJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function num(n) { n = Number(n); return isFinite(n) && n >= 0 ? Math.floor(n) : 0; }
  function keysWith(prefix) {
    var out = [];
    try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf(prefix) === 0) out.push(k); } } catch (e) {}
    return out;
  }
  function fmt(n) { return Number(n || 0).toLocaleString("es-CO"); }
  function fdate(v) {
    if (!v) return "";
    var d = new Date(v);
    return isNaN(d) ? "" : d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
  }
  var EMPTY = { has: false, bests: {}, stats: [], history: [] };

  /* ---------- Adaptadores: un lector por videojuego ----------
     Cada uno devuelve { has, player, primary, bests, stats, history, historyTitle, updated, reset }
     usando únicamente datos que el juego realmente guarda. */
  var ADAPTERS = {
    cucuta: {
      metric: "missions",
      labels: { missions: "Misiones completadas", money: "Mayor fortuna", vehicles: "Vehículos propios" },
      show: { missions: function (v) { return v + " / " + MISSIONS_TOTAL; }, money: function (v) { return "$ " + fmt(v); }, vehicles: fmt },
      note: "Mundo abierto sin puntuación: se registra el progreso real de la partida.",
      resetText: "Cúcuta Open World no tiene puntuaciones: sus métricas son el progreso de la partida. Se borrarán las partidas guardadas (misiones, dinero y vehículos) de este navegador.",
      read: function () {
        var list = keysWith("cow_save_v1_").map(readJSON).filter(function (p) { return p && p.v === 1; });
        if (!list.length) return EMPTY;
        function missions(p) { return p.missions && Array.isArray(p.missions.completed) ? Object.keys(p.missions.completed.reduce(function (o, m) { o[m] = 1; return o; }, {})).length : 0; }
        list.sort(function (a, b) { return (missions(b) - missions(a)) || (num(b.savedAt) - num(a.savedAt)); });
        var p = list[0], m = Math.min(MISSIONS_TOTAL, missions(p));
        var owned = Array.isArray(p.ownedVehicles) ? p.ownedVehicles.length : 0;
        var hist = Array.isArray(p.walletHistory) ? p.walletHistory : [];
        return {
          has: true, player: p.name, updated: p.savedAt,
          bests: { missions: m, money: num(p.money), vehicles: owned },
          stats: [["Dinero actual", "$ " + fmt(num(p.money))], ["Vehículos propios", fmt(owned)], ["Objetos recogidos", fmt(Array.isArray(p.pickups) ? p.pickups.length : 0)], ["Perfiles guardados", fmt(list.length)]],
          historyTitle: "Últimos movimientos de la billetera",
          history: hist.slice(0, 3).map(function (h) { return { left: String(h.label), right: (h.amount < 0 ? "− $ " : "+ $ ") + fmt(Math.abs(h.amount)), date: h.at }; })
        };
      },
      reset: function () { keysWith("cow_save_v1_").forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} }); try { localStorage.removeItem("cow_last_profile"); } catch (e) {} }
    },

    skybound: {
      metric: "score",
      labels: { score: "Récord de puntos", coins: "Récord de monedas", battle: "Mejor batalla aérea", wave: "Mejor oleada" },
      show: { score: fmt, coins: fmt, battle: fmt, wave: fmt },
      note: "Sky Bound no guarda historial de vuelos; se muestran los récords de cada piloto.",
      resetText: "Se borrarán las puntuaciones récord de todos los pilotos de Sky Bound (puntos, monedas por vuelo, mejor batalla, derribos y oleada). Tus monedas, aviones, niveles desbloqueados y victorias se conservan.",
      pilots: function () {
        var idx = readJSON("skybound.profiles.v1");
        var names = idx && Array.isArray(idx.names) ? idx.names : [];
        return names.map(function (n) {
          var key = "skybound.save.v2." + encodeURIComponent(String(n).trim().toLowerCase());
          return { name: n, key: key, s: readJSON(key) };
        }).filter(function (p) { return p.s; });
      },
      read: function () {
        var pilots = this.pilots();
        if (!pilots.length) return EMPTY;
        var b = { score: 0, coins: 0, battle: 0, wave: 0 }, wins = 0, kills = 0, holder = pilots[0], levels = 0, stars = 0;
        pilots.forEach(function (p) {
          var s = p.s, c = s.combat || {};
          if (num(s.bestScore) > b.score || (num(s.bestScore) === b.score && num(c.best) > b.battle)) holder = p;
          b.score = Math.max(b.score, num(s.bestScore)); b.coins = Math.max(b.coins, num(s.bestCoins));
          b.battle = Math.max(b.battle, num(c.best)); b.wave = Math.max(b.wave, num(c.bestWave));
          wins = Math.max(wins, num(c.wins)); kills = Math.max(kills, num(c.kills));
        });
        (holder.s.levels || []).forEach(function (l) { if (l && l.done) levels++; stars += num(l && l.stars); });
        var has = b.score > 0 || b.battle > 0 || wins > 0 || levels > 0;
        return {
          has: has, player: holder.name,
          bests: b,
          stats: [["Niveles completados", levels + " / 3"], ["Estrellas", stars + " / 9"], ["Mejor batalla aérea", fmt(b.battle)], ["Victorias en batalla", fmt(wins)], ["Derribos", fmt(kills)], ["Mejor oleada", fmt(b.wave)]],
          historyTitle: "Pilotos registrados",
          history: pilots.slice(0, 4).map(function (p) { return { left: p.name, right: fmt(num(p.s.bestScore)) + " pts" }; })
        };
      },
      reset: function () {
        this.pilots().forEach(function (p) {
          var s = p.s;
          s.bestScore = 0; s.bestCoins = 0;
          if (Array.isArray(s.levels)) s.levels.forEach(function (l) { if (l) { l.best = 0; } });
          if (s.combat) { s.combat.best = 0; s.combat.kills = 0; s.combat.bestWave = 0; if (s.combat.recs) Object.keys(s.combat.recs).forEach(function (k) { if (s.combat.recs[k]) s.combat.recs[k].best = 0; }); }
          writeJSON(p.key, s);
        });
      }
    },

    dynasty: {
      metric: "wins",
      labels: { wins: "Victorias", goals: "Goles marcados", margin: "Mayor goleada", clean: "Porterías a cero" },
      show: { wins: fmt, goals: fmt, margin: function (v) { return "+" + v; }, clean: fmt },
      resetText: "Se borrarán las estadísticas de partidos de Dynasty FC (partidos, resultados, goles, títulos e historial). Los logros y desbloqueos conseguidos se conservan.",
      read: function () {
        var w = readJSON("dynastyfc.progress"), d = w && w.data;
        if (!d || !num(d.matches)) return EMPTY;
        var big = d.biggestWin;
        var recent = Array.isArray(d.recent) ? d.recent : [];
        return {
          has: true, updated: w.savedAt,
          bests: { wins: num(d.wins), goals: num(d.goals), margin: big ? num(big.margin) : 0, clean: num(d.cleanSheets) },
          stats: [["Partidos", fmt(num(d.matches))], ["V · E · D", num(d.wins) + " · " + num(d.draws) + " · " + num(d.losses)], ["Goles a favor / en contra", num(d.goals) + " / " + num(d.conceded)], ["Porterías a cero", fmt(num(d.cleanSheets))], ["Mayor goleada", big ? big.gf + "–" + big.ga + " vs " + big.vs : "—"], ["Títulos de liga", fmt(num(d.titles))]],
          historyTitle: "Últimos partidos",
          history: recent.slice(0, 3).map(function (r) {
            var mine = r.side === "away" ? r.as : r.hs, other = r.side === "away" ? r.hs : r.as;
            return { left: r.home + " " + r.hs + "–" + r.as + " " + r.away, right: mine > other ? "Victoria" : mine === other ? "Empate" : "Derrota", date: r.date };
          })
        };
      },
      reset: function () {
        var w = readJSON("dynastyfc.progress");
        if (!w || !w.data) return;
        var keep = Array.isArray(w.data.achievements) ? w.data.achievements : [];
        w.data = { matches: 0, wins: 0, draws: 0, losses: 0, goals: 0, conceded: 0, cleanSheets: 0, hatTricks: 0, comebacks: 0, legendWins: 0, titles: 0, biggestWin: null, recent: [], scorers: {}, achievements: keep };
        w.savedAt = new Date().toISOString();
        writeJSON("dynastyfc.progress", w);
      }
    },

    rally: {
      metric: "wins",
      labels: { wins: "Encuentros ganados", level: "Nivel alcanzado" },
      show: { wins: fmt, level: fmt },
      resetText: "Se borrarán los encuentros, victorias, partidas e historial de Rally Rush. Tus Rush Coins, nivel y objetos desbloqueados se conservan.",
      level: function (xp) { var l = 1; xp = num(xp); while (xp >= 60 + 40 * l) { xp -= 60 + 40 * l; l++; } return l; },
      read: function () {
        var S = readJSON("rallyrush_v1");
        if (!S || S.v !== 1 || !num(S.matches)) return EMPTY;
        var lv = this.level(S.xp);
        return {
          has: true, player: S.name,
          bests: { wins: num(S.wins), level: lv },
          stats: [["Encuentros jugados", fmt(num(S.matches))], ["Encuentros ganados", fmt(num(S.wins))], ["Partidas jugadas", fmt(num(S.games))], ["Nivel", fmt(lv)], ["Rush Coins", fmt(num(S.coins))]],
          historyTitle: "Últimos encuentros",
          history: (Array.isArray(S.hist) ? S.hist : []).slice(0, 3).map(function (h) {
            h = String(h); var mark = h.charAt(0);
            return { left: h.slice(1).trim(), right: mark === "✔" ? "Victoria" : mark === "✘" ? "Derrota" : "2 jugadores" };
          })
        };
      },
      reset: function () {
        var S = readJSON("rallyrush_v1"); if (!S) return;
        S.wins = 0; S.games = 0; S.matches = 0; S.hist = [];
        writeJSON("rallyrush_v1", S);
      }
    },

    pixelpong: {
      metric: "challenge",
      /* Si todavía no se ha jugado el Desafío arcade, el dato principal son las victorias */
      pick: function (b) { return num(b.challenge) > 0 ? "challenge" : "wins"; },
      labels: { challenge: "Récord en Desafío arcade", streak: "Mejor racha", wins: "Victorias" },
      show: { challenge: function (v) { return fmt(v) + " pts"; }, streak: fmt, wins: fmt },
      modes: { ai: "vs IA", local: "2 jugadores", challenge: "Desafío" },
      resetText: "Se borrarán las estadísticas e historial de Pixel Pong 2D. Tus preferencias (sonido y dificultad) se conservan.",
      read: function () {
        var d = readJSON("blackdot-pixelpong-v1") || {};
        if (!num(d.games) && !num(d.best)) return EMPTY;
        var modes = this.modes, hist = Array.isArray(d.history) ? d.history : [];
        return {
          has: true,
          bests: { challenge: num(d.best), streak: num(d.bestStreak), wins: num(d.wins) },
          stats: [["Partidas", fmt(num(d.games))], ["Victorias", fmt(num(d.wins))], ["Derrotas", fmt(num(d.losses))], ["Mejor racha", fmt(num(d.bestStreak))], ["Puntos totales", fmt(num(d.points))]],
          historyTitle: "Últimas partidas",
          history: hist.filter(function (h) { return h && isFinite(h.a) && isFinite(h.b); }).slice(0, 3).map(function (h) { return { left: modes[h.mode] || "Partida", right: h.a + " – " + h.b, date: h.date }; })
        };
      },
      reset: function () { var p = readJSON("blackdot-pixelpong-v1") || {}; writeJSON("blackdot-pixelpong-v1", { sound: p.sound !== false, difficulty: p.difficulty }); }
    },

    atarifootball: {
      metric: "wins",
      labels: { wins: "Victorias", streak: "Mejor racha", goals: "Récord de goles en un partido" },
      show: { wins: fmt, streak: fmt, goals: fmt },
      modes: { ai: "vs CPU", two: "2 jugadores" },
      resetText: "Se borrarán las estadísticas e historial de Atari Football 2D. Tus preferencias (sonido y dificultad) se conservan.",
      read: function () {
        var d = readJSON("blackdot-football") || {};
        if (!num(d.played)) return EMPTY;
        var modes = this.modes, hist = Array.isArray(d.history) ? d.history : [];
        return {
          has: true,
          bests: { wins: num(d.won), streak: num(d.best), goals: num(d.bestGoals) },
          stats: [["Partidos", fmt(num(d.played))], ["V · E · D", num(d.won) + " · " + num(d.drawn) + " · " + num(d.lost)], ["Goles a favor / en contra", num(d.scored) + " / " + num(d.conceded)], ["Mejor racha", fmt(num(d.best))], ["Más goles en un partido", fmt(num(d.bestGoals))]],
          historyTitle: "Últimos partidos",
          history: hist.filter(function (h) { return h && isFinite(h.a) && isFinite(h.b); }).slice(0, 3).map(function (h) { return { left: modes[h.mode] || "Partido", right: h.a + " – " + h.b, date: h.date }; })
        };
      },
      reset: function () { var p = readJSON("blackdot-football") || {}; writeJSON("blackdot-football", { sound: p.sound !== false, difficulty: p.difficulty }); }
    }
  };

  /* ---------- Registro central ---------- */
  function loadHall() {
    var h = readJSON(HALL_KEY);
    if (!h || h.v !== 1 || typeof h.games !== "object") h = { v: 1, games: {} };
    return h;
  }

  function init() {
    var B = window.BLACKDOT, grid = document.getElementById("hof-grid");
    if (!B || !grid) return;
    var esc = B.esc;
    /* Orden del salón: los dos títulos destacados primero, después el resto */
    var ORDER = ["cucuta", "skybound", "dynasty", "rally", "pixelpong", "atarifootball"];
    var games = ORDER.map(function (id) { return B.GAMES.filter(function (g) { return g.id === id; })[0]; }).filter(Boolean);
    var filter = "all", snaps = {};

    /* Lee los seis juegos, actualiza el registro central y devuelve los nuevos récords */
    function sync() {
      var hall = loadHall(), now = new Date().toISOString(), news = [];
      games.forEach(function (g) {
        var A = ADAPTERS[g.id]; if (!A) return;
        var s; try { s = A.read(); } catch (e) { s = EMPTY; }
        snaps[g.id] = s;
        var first = !hall.games[g.id];
        var entry = hall.games[g.id] || (hall.games[g.id] = { bests: {}, at: {}, events: [] });
        var wasHas = !!entry.has || Object.keys(entry.bests).some(function (k) { return num(entry.bests[k]) > 0; });
        /* Primera partida de un juego: se guarda la línea base y se anuncia como primer
           registro; a partir de ahí, cada mejora es un «nuevo récord». */
        var firstGame = !first && !wasHas && s.has;
        if (s.has) entry.has = true;
        Object.keys(s.bests || {}).forEach(function (k) {
          var v = num(s.bests[k]), old = num(entry.bests[k]);
          if (v > old) {
            entry.bests[k] = v;
            entry.at[k] = first ? (s.updated || null) : now;
            if (!first && !firstGame) {
              var text = A.labels[k] + ": " + A.show[k](v);
              entry.events.unshift({ at: now, text: text });
              news.push({ g: g, text: text, main: k === (A.pick ? A.pick(entry.bests) : A.metric) });
            }
          }
        });
        if (firstGame) {
          entry.events.unshift({ at: now, text: "Primera partida registrada" });
          news.push({ g: g, text: "Primera partida registrada", firstGame: true });
        }
        entry.events = entry.events.slice(0, 6);
      });
      writeJSON(HALL_KEY, hall);
      return { hall: hall, news: news };
    }

    function moduleHTML(g, i, hall) {
      var A = ADAPTERS[g.id], s = snaps[g.id] || EMPTY, e = hall.games[g.id] || { bests: {}, at: {}, events: [] };
      var key = A.pick ? A.pick(e.bests) : A.metric;
      var best = Math.max(num(e.bests[key]), num(s.bests && s.bests[key]));
      var has = s.has || Object.keys(e.bests).some(function (k) { return num(e.bests[k]) > 0; });
      var head =
        '<div class="hof-media"><img src="' + IMG + g.shots[0] + '-640.webp" alt="Captura de ' + esc(g.name) + '" width="640" height="360" loading="lazy" decoding="async">' +
        '<span class="hof-status ' + (has ? "is-on" : "") + '">' + (has ? "Récord registrado" : "Sin partidas") + "</span>" +
        '<span class="hof-dim">' + esc(g.dim) + "</span></div>";
      var title = '<header class="hof-head"><span class="hof-num">' + String(i + 1).padStart(2, "0") + '</span><div><h3>' + esc(g.name) + "</h3><p>" + esc(g.genre) + "</p></div></header>";
      var body;
      if (!has) {
        body = '<div class="hof-empty"><p class="hof-empty-t">Sin partidas registradas</p><p>Juega una partida y tu primer récord aparecerá aquí automáticamente.</p></div>';
      } else {
        var when = e.at[key] && best > 0 ? "Conseguido el " + fdate(e.at[key]) : "";
        body =
          '<div class="hof-primary"><span>' + esc(A.labels[key]) + "</span><b>" + esc(A.show[key](best)) + "</b>" +
          '<small>' + esc([s.player ? "Récord de " + s.player : "", when].filter(Boolean).join(" · ")) + "</small></div>" +
          '<dl class="hof-stats">' + (s.stats || []).map(function (st) { return "<div><dt>" + esc(st[0]) + "</dt><dd>" + esc(st[1]) + "</dd></div>"; }).join("") + "</dl>";
        var hist = s.history || [];
        body += '<div class="hof-hist"><p class="hof-h">' + esc(s.historyTitle || "Historial") + "</p>" +
          (hist.length ? "<ul>" + hist.map(function (h) { return "<li><span>" + esc(h.left) + "</span><b>" + esc(h.right) + "</b>" + (h.date ? "<time>" + esc(fdate(h.date)) + "</time>" : "") + "</li>"; }).join("") + "</ul>"
            : '<p class="hof-muted">' + esc(A.note || "Aún no hay historial.") + "</p>") + "</div>";
        if (e.events.length) body += '<div class="hof-hist hof-events"><p class="hof-h">Récords conseguidos</p><ul>' + e.events.slice(0, 2).map(function (ev) { return "<li><span>" + esc(ev.text) + "</span><time>" + esc(fdate(ev.at)) + "</time></li>"; }).join("") + "</ul></div>";
        if (A.note && hist.length) body += '<p class="hof-muted">' + esc(A.note) + "</p>";
      }
      var actions = '<div class="hof-actions"><button class="btn btn-blue btn-sm" type="button" data-hof-play="' + g.id + '">Jugar <span class="arr" aria-hidden="true">→</span></button>' +
        (has ? '<button class="hof-reset" type="button" data-hof-reset="' + g.id + '">Reiniciar datos</button>' : "") + "</div>";
      return '<article class="hof-card' + (has ? "" : " is-empty") + '" data-hof="' + g.id + '" style="--gc:' + g.color + '">' + head + '<div class="hof-body">' + title + body + actions + "</div></article>";
    }

    function render(hall, newIds) {
      hall = hall || loadHall();
      grid.innerHTML = games.map(function (g, i) { return moduleHTML(g, i, hall); }).join("");
      var withRec = grid.querySelectorAll(".hof-card:not(.is-empty)").length;
      var c = document.getElementById("hof-count-rec"), e = document.getElementById("hof-count-empty");
      if (c) c.textContent = withRec; if (e) e.textContent = games.length - withRec;
      applyFilter();
      (newIds || []).forEach(function (id) { var el = grid.querySelector('[data-hof="' + id + '"]'); if (el) el.classList.add("is-new"); });
    }
    function applyFilter() {
      Array.prototype.forEach.call(grid.children, function (card) {
        var empty = card.classList.contains("is-empty");
        card.hidden = (filter === "rec" && empty) || (filter === "empty" && !empty);
      });
    }

    function refresh(announce) {
      var r = sync();
      render(r.hall, r.news.map(function (n) { return n.g.id; }));
      if (r.news.length) {
        var n = r.news.filter(function (x) { return x.main; })[0] || r.news[0];
        B.toast(n.firstGame ? "Primera partida registrada en " + n.g.name + ". Míralo en el Salón de la fama." : "¡Nuevo récord en " + n.g.name + "! " + n.text + (r.news.length > 1 ? " (+" + (r.news.length - 1) + ")" : ""));
      } else if (announce) {
        B.toast("Récords actualizados desde este navegador.");
      }
    }

    grid.addEventListener("click", function (ev) {
      var play = ev.target.closest("[data-hof-play]");
      if (play) { var g = games.filter(function (x) { return x.id === play.getAttribute("data-hof-play"); })[0]; if (g) B.playGame(g, ev); return; }
      var rs = ev.target.closest("[data-hof-reset]");
      if (rs) {
        var id = rs.getAttribute("data-hof-reset"), A = ADAPTERS[id], gg = games.filter(function (x) { return x.id === id; })[0];
        if (!confirm("¿Reiniciar los datos de " + gg.name + "?\n\n" + A.resetText + "\n\nEsta acción no se puede deshacer.")) return;
        try { A.reset(); } catch (e) {}
        var hall = loadHall(); delete hall.games[id]; writeJSON(HALL_KEY, hall);
        sync(); render();
        B.toast("Datos de " + gg.name + " reiniciados.");
      }
    });
    var btn = document.getElementById("hof-refresh");
    if (btn) btn.addEventListener("click", function () { refresh(true); });
    Array.prototype.forEach.call(document.querySelectorAll("[data-hof-filter]"), function (b) {
      b.addEventListener("click", function () {
        filter = b.getAttribute("data-hof-filter");
        Array.prototype.forEach.call(document.querySelectorAll("[data-hof-filter]"), function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); x.classList.toggle("is-active", x === b); });
        applyFilter();
      });
    });

    /* El juego corre en un iframe del mismo origen (o en otra pestaña): cada guardado
       dispara `storage` en el portafolio. Se agrupan las escrituras seguidas. */
    var t = 0;
    addEventListener("storage", function (ev) {
      if (ev.key === HALL_KEY) return;
      clearTimeout(t); t = setTimeout(function () { refresh(false); }, 250);
    });
    document.addEventListener("gameclosed", function () { refresh(false); });
    document.addEventListener("visibilitychange", function () { if (!document.hidden) refresh(false); });

    /* Primera lectura: importa los datos existentes sin avisos */
    var first = sync();
    render(first.hall);
    window.BLACKDOT.hallOfFame = { refresh: refresh, adapters: ADAPTERS };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
