(() => {
  "use strict";
  const $ = (s) => document.querySelector(s),
    canvas = $("#game"),
    ctx = canvas.getContext("2d"),
    overlay = $("#overlay"),
    card = $("#card");
  const storeKey = "blackdot-pixelpong-v1";
  const HISTORY_MAX = 10;
  const defaults = () => ({
    games: 0,
    wins: 0,
    losses: 0,
    points: 0,
    best: 0,
    streak: 0,
    bestStreak: 0,
    history: [],
    sound: true,
    difficulty: "Normal",
  });
  /* Lee LocalStorage validando cada campo: si el dato no existe o está
     dañado se usa el valor por defecto en lugar de romper el juego. */
  function loadData() {
    let raw = {};
    try {
      const parsed = JSON.parse(localStorage.getItem(storeKey) || "{}");
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) raw = parsed;
    } catch {}
    const d = defaults();
    for (const k of ["games", "wins", "losses", "points", "best", "streak", "bestStreak"]) {
      const n = Number(raw[k]);
      d[k] = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
    }
    d.sound = raw.sound !== false;
    if (typeof raw.difficulty === "string") d.difficulty = raw.difficulty;
    d.history = Array.isArray(raw.history)
      ? raw.history.filter((h) => h && typeof h === "object" && Number.isFinite(h.a) && Number.isFinite(h.b)).slice(0, HISTORY_MAX)
      : [];
    /* Compatibilidad con la versión anterior, que guardaba "AI 7–3" en `recent` */
    if (!d.history.length && Array.isArray(raw.recent)) {
      for (const r of raw.recent) {
        const m = /^(\w+)\s+(\d+)\D+(\d+)$/.exec(String(r));
        if (m) d.history.push({ date: null, mode: m[1].toLowerCase(), a: +m[2], b: +m[3] });
      }
      d.history = d.history.slice(0, HISTORY_MAX);
    }
    return d;
  }
  let data = loadData();
  const save = () => {
    try {
      localStorage.setItem(storeKey, JSON.stringify(data));
    } catch {}
  };
  let state = "MENU",
    mode = "ai",
    difficulty = data.difficulty || "Normal",
    target = 7,
    scores = [0, 0],
    winner = 0,
    serveDir = 1,
    pausedFrom = "PLAYING",
    last = 0,
    elapsed = 0,
    particles = [],
    trail = [],
    keys = {},
    touchY = [null, null],
    shake = 0,
    pointTimer = 0,
    ball = { x: 0, y: 0, vx: 0, vy: 0, r: 8 },
    paddles = [
      { x: 0, y: 0, w: 13, h: 76, vy: 0, color: "#52e5ff", glow: "#52e5ff" },
      { x: 0, y: 0, w: 13, h: 76, vy: 0, color: "#ff4f9a", glow: "#ff4f9a" },
    ];
  let W = 900,
    H = 470,
    dpr = 1;
  const cfg = {
    Facil: { speed: 340, react: 0.33, error: 0.24, pad: 72 },
    Normal: { speed: 385, react: 0.22, error: 0.13, pad: 55 },
    Dificil: { speed: 425, react: 0.14, error: 0.065, pad: 38 },
    Experto: { speed: 450, react: 0.095, error: 0.035, pad: 25 },
  };
  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    W = r.width;
    H = r.height;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paddles.forEach((p, i) => {
      p.x = i ? W - 28 : 15;
      p.h = Math.max(43, Math.min(i && mode === "local" ? H * 0.19 : H * 0.17, 76));
      p.y = p.y || H / 2;
    });
  }
  new ResizeObserver(resize).observe(canvas);
  /* Un único AudioContext reutilizado (antes se creaba uno por sonido) */
  let actx = null;
  function audio(freq = 420, dur = 0.06, type = "sine", vol = 0.035) {
    if (!data.sound) return;
    try {
      actx ||= new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === "suspended") actx.resume();
      const a = actx,
        o = a.createOscillator(),
        g = a.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, a.currentTime);
      g.gain.setValueAtTime(vol, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
      o.connect(g);
      g.connect(a.destination);
      o.start();
      o.stop(a.currentTime + dur);
      o.onended = () => g.disconnect();
    } catch {}
  }
  function show(html) {
    card.innerHTML = html;
    overlay.classList.remove("hidden");
  }
  function hide() {
    overlay.classList.add("hidden");
  }
  function home() {
    state = "MENU";
    $("#status").textContent = "SISTEMA LISTO";
    $("#modeLabel").textContent = "—";
    show(
      `<div class="brand">BLACKDOT <b>ARCADE</b></div><h2>PIXEL PONG 2D</h2><p>El clásico arcade, reconstruido para la era del neón.</p><div class="actions"><button class="btn primary" data-act="select">▶ &nbsp; JUGAR CONTRA IA</button><button class="btn cyan" data-act="local">DOS JUGADORES</button><button class="btn" data-act="challenge">DESAFÍO ARCADE</button><button class="btn" data-act="stats">ESTADÍSTICAS</button><button class="btn" data-act="settings">CONFIGURACIÓN</button></div>`,
    );
  }
  function selectScreen() {
    state = "SELECT_MODE";
    show(
      `<h2>PREPARA EL PARTIDO</h2><p>Elige dificultad y duración de la partida.</p><div class="options">${Object.keys(
        cfg,
      )
        .map(
          (x) =>
            `<button class="pill ${difficulty === x ? "active" : ""}" data-diff="${x}">${x.toUpperCase()}</button>`,
        )
        .join(
          "",
        )}</div><div class="options">${[5, 7, 10, 15].map((x) => `<button class="pill ${target === x ? "active" : ""}" data-target="${x}">A ${x} PUNTOS</button>`).join("")}</div><div class="actions"><button class="btn primary" data-act="start">COMENZAR PARTIDO</button><button class="btn" data-act="home">VOLVER</button></div>`,
    );
  }
  const MODE_LABEL = { ai: "VS IA", local: "2 JUG.", challenge: "DESAFÍO" };
  function fmtDate(iso) {
    const d = iso ? new Date(iso) : null;
    return d && !isNaN(d) ? d.toLocaleDateString("es-CO", { day: "2-digit", month: "short" }) : "—";
  }
  function statsScreen() {
    state = "MENU";
    const rows = data.history.length
      ? data.history.map((h) => `<li><span>${fmtDate(h.date)}</span><span>${MODE_LABEL[h.mode] || h.mode}</span><b>${h.a} — ${h.b}</b></li>`).join("")
      : "<li><span>Juega tu primera partida.</span></li>";
    show(
      `<h2>ESTADÍSTICAS</h2><p>Tu historial en la arena.</p><div class="stats"><div class="stat"><strong>${data.games}</strong><span>PARTIDAS</span></div><div class="stat"><strong>${data.wins}</strong><span>VICTORIAS</span></div><div class="stat"><strong>${data.losses}</strong><span>DERROTAS</span></div><div class="stat"><strong>${data.best}</strong><span>RÉCORD DESAFÍO</span></div><div class="stat"><strong>${data.points}</strong><span>PUNTOS MARCADOS</span></div><div class="stat"><strong>${data.bestStreak}</strong><span>MEJOR RACHA</span></div></div><p>ÚLTIMAS PARTIDAS</p><ul class="history">${rows}</ul><div class="actions"><button class="btn primary" data-act="home">VOLVER AL MENÚ</button><button class="btn" data-act="reset">REINICIAR ESTADÍSTICAS</button></div>`,
    );
  }
  function resetStats() {
    if (!confirm("¿Borrar todas las estadísticas e historial de Pixel Pong? Esta acción no se puede deshacer.")) return;
    data = { ...defaults(), sound: data.sound, difficulty };
    save();
    statsScreen();
  }
  function settingsScreen() {
    state = "MENU";
    show(
      `<h2>CONFIGURACIÓN</h2><p>Ajusta el sonido y el comportamiento del juego.</p><div class="options"><button class="pill" data-act="sound">SONIDO: ${data.sound ? "ACTIVADO" : "DESACTIVADO"}</button></div><p>DIFICULTAD PREFERIDA</p><div class="options">${Object.keys(
        cfg,
      )
        .map(
          (x) =>
            `<button class="pill ${difficulty === x ? "active" : ""}" data-diff="${x}">${x.toUpperCase()}</button>`,
        )
        .join("")}</div><button class="btn primary" data-act="home">LISTO</button>`,
    );
  }
  function resetBall(dir = 1) {
    ball.x = W / 2;
    ball.y = H / 2;
    ball.r = Math.max(5, Math.min(8, W * 0.009));
    const speed = (cfg[difficulty]?.speed || 385) * (mode === "challenge" ? 1 + scores[0] * 0.025 : 1);
    ball.vx = speed * dir;
    ball.vy = (Math.random() - 0.5) * speed * 0.72;
    trail = [];
  }
  function start(m) {
    mode = m;
    scores = [0, 0];
    winner = 0;
    particles = [];
    paddles.forEach((p) => (p.y = H / 2));
    resetBall(Math.random() < 0.5 ? -1 : 1);
    state = "PLAYING";
    $("#modeLabel").textContent =
      m === "local"
        ? "DOS JUGADORES"
        : m === "challenge"
          ? "DESAFÍO ARCADE"
          : `CONTRA IA · ${difficulty.toUpperCase()}`;
    $("#status").textContent = "EN PARTIDA";
    hide();
    audio(640, 0.13, "triangle");
  }
  function endMatch(w) {
    state = "FINISHED";
    winner = w;
    data.games++;
    if (mode === "challenge") {
      data.best = Math.max(data.best, scores[0]);
      if (w === 0) {
        data.wins++;
        data.streak++;
        data.bestStreak = Math.max(data.bestStreak, data.streak);
      } else {
        data.losses++;
        data.streak = 0;
      }
    } else if (mode === "local") {
      /* En modo local no hay victoria/derrota personal: solo se registra el historial */
    } else if (w === 0) {
      data.wins++;
      data.streak++;
      data.bestStreak = Math.max(data.bestStreak, data.streak);
    } else {
      data.losses++;
      data.streak = 0;
    }
    data.history.unshift({ date: new Date().toISOString(), mode, a: scores[0], b: scores[1] });
    data.history = data.history.slice(0, HISTORY_MAX);
    save();
    $("#status").textContent = "PARTIDA TERMINADA";
    audio(w === 0 ? 760 : 180, 0.35, "sawtooth", 0.05);
    show(
      `<div class="brand">BLACKDOT ARCADE</div><h2 style="color:${w === 0 ? "var(--cyan)" : "var(--pink)"}">${mode === "local" ? (w === 0 ? "AZUL GANA" : "ROSA GANA") : w === 0 ? "¡VICTORIA!" : "FIN DEL JUEGO"}</h2><p>RESULTADO &nbsp; <b style="color:white;font-size:20px">${scores[0]} — ${scores[1]}</b><br>${mode === "challenge" ? `Récord personal: ${data.best}` : ""}</p><div class="actions"><button class="btn primary" data-act="rematch">REVANCHA</button><button class="btn" data-act="home">MENÚ PRINCIPAL</button></div>`,
    );
  }
  function pause() {
    if (state === "PLAYING" || state === "POINT") {
      pausedFrom = state;
      state = "PAUSED";
      $("#status").textContent = "PARTIDA EN PAUSA";
      show(
        `<h2>PAUSA</h2><p>Respira. La arena espera.</p><div class="actions"><button class="btn primary" data-act="resume">CONTINUAR</button><button class="btn" data-act="restart">REINICIAR</button><button class="btn" data-act="home">MENÚ</button></div>`,
      );
    } else if (state === "PAUSED") resume();
  }
  function resume() {
    state = "PLAYING";
    $("#status").textContent = "EN PARTIDA";
    hide();
  }
  function point(scored) {
    scores[scored]++;
    if (scored === 0) data.points++; // puntos del jugador 1
    save();
    $("#scoreL").textContent = scores[0];
    $("#scoreR").textContent = scores[1];
    shake = 7;
    for (let i = 0; i < 30; i++) burst(W / 2, H / 2, scored === 0 ? "#52e5ff" : "#ff4f9a");
    if (mode === "challenge" && scored === 1) {
      endMatch(1);
      return;
    }
    if (mode !== "challenge" && scores[scored] >= target) {
      endMatch(scored);
      return;
    }
    state = "POINT";
    pointTimer = 0.85;
    $("#status").textContent = scored === 0 ? "PUNTO AZUL" : "PUNTO ROSA";
    audio(220, 0.18, "triangle");
    resetBall(-ball.vx / Math.abs(ball.vx));
  }
  function burst(x, y, color, n = 12) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2,
        s = 40 + Math.random() * 240;
      particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.35 + Math.random() * 0.45,
        max: 0.8,
        color,
        r: 1 + Math.random() * 2,
      });
    }
  }
  function aiUpdate(dt) {
    const p = paddles[1],
      c = cfg[difficulty] || cfg.Normal;
    let aim = H / 2;
    if (ball.vx > 0) {
      let t = (p.x - ball.x) / ball.vx,
        py = ball.y + ball.vy * Math.max(0, t);
      const top = 28,
        bottom = H - 28;
      while (py < top || py > bottom) {
        if (py < top) py = top + (top - py);
        if (py > bottom) py = bottom - (py - bottom);
      }
      aim = py + (Math.random() - 0.5) * H * c.error;
    } else aim = H / 2 + (Math.random() - 0.5) * H * 0.18;
    let delta = aim - p.y;
    let max = c.speed * dt;
    p.y += Math.sign(delta) * Math.min(Math.abs(delta), max);
    p.y = Math.max(p.h / 2 + 12, Math.min(H - p.h / 2 - 12, p.y));
  }
  function update(dt) {
    elapsed += dt;
    if (state === "POINT") {
      pointTimer -= dt;
      if (pointTimer <= 0) {
        state = "PLAYING";
        $("#status").textContent = "EN PARTIDA";
      }
      return;
    }
    if (state !== "PLAYING") return;
    const p1 = paddles[0],
      p2 = paddles[1],
      moveSpeed = H * 1.05;
    /* Contra la IA o en el desafío, el jugador 1 también puede usar las flechas */
    const solo = mode !== "local";
    p1.vy = (keys.KeyW || (solo && keys.ArrowUp) ? -1 : 0) + (keys.KeyS || (solo && keys.ArrowDown) ? 1 : 0);
    if (touchY[0] != null) p1.y += (touchY[0] - p1.y) * Math.min(1, dt * 18);
    else p1.y += p1.vy * moveSpeed * dt;
    p1.y = Math.max(p1.h / 2 + 12, Math.min(H - p1.h / 2 - 12, p1.y));
    if (mode === "local") {
      p2.vy = (keys.ArrowUp ? -1 : 0) + (keys.ArrowDown ? 1 : 0);
      if (touchY[1] != null) p2.y += (touchY[1] - p2.y) * Math.min(1, dt * 18);
      else p2.y += p2.vy * moveSpeed * dt;
      p2.y = Math.max(p2.h / 2 + 12, Math.min(H - p2.h / 2 - 12, p2.y));
    } else aiUpdate(dt);
    let steps = Math.max(
        1,
        Math.ceil((Math.max(Math.abs(ball.vx), Math.abs(ball.vy)) * dt) / (ball.r * 0.65)),
      ),
      sub = dt / steps;
    for (let k = 0; k < steps; k++) {
      const ox = ball.x,
        oy = ball.y;
      ball.x += ball.vx * sub;
      ball.y += ball.vy * sub;
      if (ball.y - ball.r < 24) {
        ball.y = 24 + ball.r;
        ball.vy = Math.abs(ball.vy);
        burst(ball.x, ball.y, "#7996ff", 5);
        audio(260, 0.035, "sine", 0.018);
      }
      if (ball.y + ball.r > H - 24) {
        ball.y = H - 24 - ball.r;
        ball.vy = -Math.abs(ball.vy);
        burst(ball.x, ball.y, "#7996ff", 5);
        audio(260, 0.035, "sine", 0.018);
      }
      for (let i = 0; i < 2; i++) {
        let p = paddles[i],
          going = i === 0 ? ball.vx < 0 : ball.vx > 0,
          plane = i === 0 ? p.x + p.w : p.x;
        if (
          going &&
          ((i === 0 && ox - ball.r > plane && ball.x - ball.r <= plane) ||
            (i === 1 && ox + ball.r < plane && ball.x + ball.r >= plane)) &&
          Math.abs(ball.y - p.y) < p.h / 2 + ball.r
        ) {
          ball.x = plane + (i === 0 ? ball.r : -ball.r);
          let offset = Math.max(-1, Math.min(1, (ball.y - p.y) / (p.h / 2)));
          let speed = Math.min(ballSpeedCap(), Math.hypot(ball.vx, ball.vy) * 1.045 + 8);
          let angle = offset * 1.08;
          ball.vx = (i === 0 ? 1 : -1) * speed * Math.cos(angle);
          ball.vy = speed * Math.sin(angle) + p.vy * moveSpeed * 0.12;
          let mag = Math.hypot(ball.vx, ball.vy);
          ball.vx *= speed / mag;
          ball.vy *= speed / mag;
          burst(plane, ball.y, p.color, 15);
          shake = 3;
          audio(420 + Math.abs(offset) * 260, 0.07, "square", 0.026);
        }
      }
      if (ball.x < -ball.r - 15) {
        point(1);
        return;
      }
      if (ball.x > W + ball.r + 15) {
        point(0);
        return;
      }
    }
    trail.unshift({ x: ball.x, y: ball.y });
    if (trail.length > 16) trail.pop();
    for (let i = particles.length - 1; i >= 0; i--) {
      let p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(0.12, dt);
      p.vy *= Math.pow(0.12, dt);
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    shake *= Math.pow(0.04, dt);
  }
  function ballSpeedCap() {
    return Math.min(950, Math.max(W, H) * 2.2);
  }
  function render(t) {
    const sx = canvas.width / dpr,
      sy = canvas.height / dpr;
    ctx.clearRect(0, 0, sx, sy);
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    let grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#101827");
    grad.addColorStop(0.5, "#090e18");
    grad.addColorStop(1, "#0e1421");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.strokeStyle = "#ffffff08";
    ctx.lineWidth = 1;
    for (let x = 30; x < W; x += 42) {
      ctx.beginPath();
      ctx.moveTo(x, 24);
      ctx.lineTo(x, H - 24);
      ctx.stroke();
    }
    for (let y = 30; y < H; y += 42) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.restore();
    ctx.shadowBlur = 16;
    ctx.shadowColor = "#4c6680";
    ctx.strokeStyle = "#516179";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(10, 23, W - 20, H - 46, 9);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.setLineDash([5, 10]);
    ctx.strokeStyle = "#63718b66";
    ctx.beginPath();
    ctx.moveTo(W / 2, 26);
    ctx.lineTo(W / 2, H - 26);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, Math.min(54, H * 0.14), 0, Math.PI * 2);
    ctx.strokeStyle = "#35445e";
    ctx.stroke();
    ctx.fillStyle = "#70809a";
    for (let y = H * 0.3; y < H * 0.8; y += H * 0.1) {
      ctx.beginPath();
      ctx.arc(W / 2, y, 2, 0, 7);
      ctx.fill();
    }
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    for (let i = trail.length - 1; i >= 0; i--) {
      let q = trail[i],
        a = (1 - i / trail.length) * 0.27;
      ctx.globalAlpha = a;
      ctx.fillStyle = "#bdf7ff";
      ctx.beginPath();
      ctx.arc(q.x, q.y, ball.r * (0.5 + (i / trail.length) * 0.7), 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    paddles.forEach((p) => {
      ctx.save();
      ctx.shadowColor = p.glow;
      ctx.shadowBlur = 22;
      let g = ctx.createLinearGradient(p.x, p.y - p.h / 2, p.x + p.w, p.y + p.h / 2);
      g.addColorStop(0, p.color + "aa");
      g.addColorStop(0.5, p.color);
      g.addColorStop(1, "#ffffff");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(p.x, p.y - p.h / 2, p.w, p.h, 7);
      ctx.fill();
      ctx.restore();
    });
    let bg = ctx.createRadialGradient(
      ball.x - ball.r * 0.3,
      ball.y - ball.r * 0.3,
      1,
      ball.x,
      ball.y,
      ball.r * 2.5,
    );
    bg.addColorStop(0, "#fff");
    bg.addColorStop(0.32, "#e8fcff");
    bg.addColorStop(1, "#42dfff");
    ctx.shadowColor = "#53eaff";
    ctx.shadowBlur = 25;
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, 7);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
    $("#speedBar").style.width = Math.min(100, (Math.hypot(ball.vx, ball.vy) / ballSpeedCap()) * 100) + "%";
    requestAnimationFrame(render);
  }
  function act(a) {
    if (a === "home") home();
    if (a === "select") selectScreen();
    if (a === "start") start("ai");
    if (a === "local") start("local");
    if (a === "challenge") start("challenge");
    if (a === "stats") statsScreen();
    if (a === "settings") settingsScreen();
    if (a === "sound") {
      data.sound = !data.sound;
      save();
      settingsScreen();
    }
    if (a === "resume") resume();
    if (a === "restart") start(mode);
    if (a === "rematch") start(mode);
    if (a === "reset") resetStats();
  }
  card.addEventListener("click", (e) => {
    let b = e.target.closest("button");
    if (!b) return;
    audio(540, 0.045, "triangle", 0.018);
    if (b.dataset.diff) {
      difficulty = b.dataset.diff;
      data.difficulty = difficulty;
      save();
      state === "SELECT_MODE" ? selectScreen() : settingsScreen();
    } else if (b.dataset.target) {
      target = +b.dataset.target;
      selectScreen();
    } else if (b.dataset.act) act(b.dataset.act);
  });
  $("#soundBtn").onclick = () => {
    data.sound = !data.sound;
    save();
    $("#soundBtn").textContent = data.sound ? "◖♪ SONIDO" : "◖× SONIDO";
    audio(550, 0.04);
  };
  $("#pauseBtn").onclick = pause;
  window.addEventListener("keydown", (e) => {
    if (["ArrowUp", "ArrowDown", "Space"].includes(e.code)) e.preventDefault();
    keys[e.code] = true;
    if (e.repeat) return;
    if (e.code === "Escape" || e.code === "KeyP") pause();
    if (e.code === "Space") {
      if (state === "PAUSED") resume();
      else if (state === "MENU") selectScreen();
      else if (state === "POINT") {
        state = "PLAYING";
        pointTimer = 0;
      }
    }
    if (e.code === "KeyR" && ["PLAYING", "POINT", "PAUSED", "FINISHED"].includes(state)) start(mode);
  });
  window.addEventListener("keyup", (e) => (keys[e.code] = false));
  /* Control táctil / ratón: cada dedo controla la paleta de su mitad de la
     mesa (en modo local se pueden usar dos dedos a la vez). */
  const pointerSide = new Map();
  function pointer(e) {
    const r = canvas.getBoundingClientRect(),
      y = ((e.clientY - r.top) / r.height) * H,
      x = ((e.clientX - r.left) / r.width) * W;
    if (!pointerSide.has(e.pointerId)) pointerSide.set(e.pointerId, x < W / 2 ? 0 : 1);
    const i = pointerSide.get(e.pointerId);
    if (i === 0 || mode === "local")
      touchY[i] = Math.max(paddles[i].h / 2 + 12, Math.min(H - paddles[i].h / 2 - 12, y));
  }
  function release(e) {
    const i = pointerSide.get(e.pointerId);
    if (i !== undefined) touchY[i] = null;
    pointerSide.delete(e.pointerId);
  }
  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointer(e);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (e.buttons || e.pointerType === "touch") pointer(e);
  });
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state === "PLAYING") pause();
  });
  window.addEventListener("blur", () => (keys = {}));
  if (window.top === window.self) $("#portfolio").hidden = false;

  /* Gancho de pruebas automatizadas (solo con ?qa=1 en la URL) */
  if (new URLSearchParams(location.search).has("qa")) {
    window.__PP = {
      get data() { return data; }, get state() { return state; }, get scores() { return scores; },
      get paddles() { return paddles; }, get ball() { return ball; }, get mode() { return mode; },
      start, endMatch,
    };
  }
  function loop(now) {
    let dt = Math.min(0.033, (now - last) / 1000 || 0);
    last = now;
    update(dt);
    $("#scoreL").textContent = scores[0];
    $("#scoreR").textContent = scores[1];
    requestAnimationFrame(loop);
  }
  home();
  resize();
  requestAnimationFrame(render);
  requestAnimationFrame(loop);
})();
