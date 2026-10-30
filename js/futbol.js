/* ==========================================================================
   ATARI FOOTBALL 2D — BLACKDOT ARCADE
   HTML5 Canvas + JavaScript ES6+, sin dependencias.

   Índice del archivo
     1. Configuración, estado y persistencia (LocalStorage)
     2. Sistema de mecánicas (ganchos para el live coding)
     3. Menús e interfaz (DOM)
     4. Entrada: teclado y controles táctiles
     5. Jugadores, IA y porteros
     6. Física del balón y colisiones
     7. Goles, fin de partido y estadísticas
     8. Game Loop (requestAnimationFrame)
     9. Render en Canvas
   ========================================================================== */
(() => {
  'use strict';

  /* ---------------------------------------------------------------------
     1. CONFIGURACIÓN, ESTADO Y PERSISTENCIA
     --------------------------------------------------------------------- */
  const $ = (s) => document.querySelector(s);
  const canvas = $('#pitch');
  const ctx = canvas.getContext('2d');

  /* Geometría de la cancha (coordenadas internas del canvas 1000×610) */
  const FIELD = {
    left: 74, right: 926, top: 68, bottom: 542, // líneas de cal
    midX: 500, midY: 305,
    goalTop: 260, goalBottom: 350, goalDepth: 22, // boca de la portería
    postR: 4, // radio del poste (colisión circular)
  };
  const POSTS = [
    { x: FIELD.left, y: FIELD.goalTop }, { x: FIELD.left, y: FIELD.goalBottom },
    { x: FIELD.right, y: FIELD.goalTop }, { x: FIELD.right, y: FIELD.goalBottom },
  ];

  const STORAGE_KEY = 'blackdot-football';
  const HISTORY_MAX = 10;
  const defaults = {
    played: 0, won: 0, lost: 0, drawn: 0, scored: 0, conceded: 0,
    streak: 0, best: 0, bestGoals: 0, history: [], sound: true, difficulty: 'NORMAL',
  };

  /* Lee LocalStorage y valida cada campo: datos inexistentes o dañados
     vuelven al valor por defecto en lugar de romper el juego. */
  function loadStats() {
    let raw = {};
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) raw = parsed;
    } catch { raw = {}; }
    const s = { ...defaults };
    for (const k of ['played', 'won', 'lost', 'drawn', 'scored', 'conceded', 'streak', 'best', 'bestGoals']) {
      const n = Number(raw[k]);
      s[k] = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
    }
    s.sound = raw.sound !== false;
    s.difficulty = typeof raw.difficulty === 'string' ? raw.difficulty : 'NORMAL';
    s.history = Array.isArray(raw.history)
      ? raw.history.filter((h) => h && typeof h === 'object' && Number.isFinite(h.a) && Number.isFinite(h.b)).slice(0, HISTORY_MAX)
      : [];
    /* Compatibilidad con la versión anterior, que guardaba "3–1" en `recent` */
    if (!s.history.length && Array.isArray(raw.recent)) {
      for (const r of raw.recent) {
        const m = /^(\d+)\D+(\d+)$/.exec(String(r));
        if (m) s.history.push({ date: null, mode: 'ai', a: +m[1], b: +m[2], duration: null });
      }
    }
    return s;
  }
  let stats = loadStats();
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stats)); } catch {}
  }

  const diff = {
    FACIL: { speed: 0.72, react: 0.48, aim: 0.62, press: 0.27, keeper: 0.62 },
    NORMAL: { speed: 0.88, react: 0.68, aim: 0.75, press: 0.52, keeper: 0.74 },
    DIFÍCIL: { speed: 1.04, react: 0.84, aim: 0.86, press: 0.75, keeper: 0.86 },
    EXPERTO: { speed: 1.14, react: 0.94, aim: 0.94, press: 0.95, keeper: 0.96 },
  };

  let mode = 'ai';
  let difficulty = diff[stats.difficulty] ? stats.difficulty : 'NORMAL';
  let duration = 120;
  let goalLimit = 5;
  let state = 'MENU'; // MENU · PLAYING · PAUSED · GOAL · FINISHED
  let keys = {}; // por e.key en minúsculas: 'w', 'arrowup', ' ', 'enter'…
  let codes = {}; // por e.code: 'ShiftLeft', 'KeyQ'…
  let players = [];
  let ball = {};
  let score = [0, 0];
  let timeLeft = 120;
  let last = 0;
  let raf = 0;
  let goalTimer = 0;
  let particles = [];
  let cam = 0;
  let shotCooldown = [0, 0];
  let audio = null;
  let showFps = false;
  let fps = 60;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function sound(f = 240, d = 0.1, type = 'sine', vol = 0.035) {
    if (!stats.sound) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = type;
      o.frequency.value = f;
      g.gain.value = vol;
      o.connect(g);
      g.connect(audio.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + d);
      o.stop(audio.currentTime + d);
    } catch {}
  }

  /* Velocidad progresiva: el balón sale más rápido a medida que avanza el
     partido (hasta +35 %) y con cada gol marcado (hasta +15 %). */
  function speedFactor() {
    const elapsed = duration > 0 ? 1 - timeLeft / duration : 0;
    return 1 + clamp(elapsed, 0, 1) * 0.35 + Math.min(0.15, (score[0] + score[1]) * 0.03);
  }

  /* ---------------------------------------------------------------------
     2. SISTEMA DE MECÁNICAS (live coding)
     Una mecánica es un objeto con funciones opcionales; el juego las llama
     en momentos concretos del Game Loop. Ver carpeta live-coding/.
       alIniciar(juego)                 al comenzar o reiniciar el partido
       alActualizar(dt, juego)          cada frame, antes de mover el balón
       alMoverBalon(dt, juego)          cada frame, antes de integrar el balón
       alColisionBalon(balon, juego)    en cada sub-paso de la física (colisiones extra)
       velocidadJugador(p, juego)       devuelve un multiplicador de velocidad
       alChutar(p, juego)               devuelve un multiplicador de potencia
       alGol(lado, juego)               devolver false anula el gol
       despuesDeGol(lado, juego)        el gol ya se sumó al marcador
       alTerminarTiempo(juego)          devolver false evita terminar el partido
       alDibujar(ctx, juego)            después de la cancha (bajo jugadores)
       alDibujarHUD(ctx, juego)         encima de todo
       alTecla(tecla, presionada, juego)
     --------------------------------------------------------------------- */
  const Mecanicas = {
    lista: [],
    registrar(m) {
      this.lista.push(m);
      return m;
    },
    /* Ejecuta un evento en todas las mecánicas activas. Si alguna devuelve
       false, el resultado es false (sirve para anular acciones). */
    emitir(evento, ...args) {
      let ok = true;
      for (const m of this.lista) {
        if (m.activa === false || typeof m[evento] !== 'function') continue;
        if (m[evento](...args, juego) === false) ok = false;
      }
      return ok;
    },
    /* Multiplica los valores numéricos que devuelvan las mecánicas */
    factor(evento, ...args) {
      let f = 1;
      for (const m of this.lista) {
        if (m.activa === false || typeof m[evento] !== 'function') continue;
        const v = m[evento](...args, juego);
        if (Number.isFinite(v)) f *= v;
      }
      return f;
    },
  };

  /* Objeto público que reciben las mecánicas */
  const juego = {
    FIELD, POSTS, canvas, ctx, clamp, rand, dist,
    get ball() { return ball; },
    get players() { return players; },
    get score() { return score; },
    get state() { return state; },
    get mode() { return mode; },
    get keys() { return keys; },
    get codes() { return codes; },
    get timeLeft() { return timeLeft; },
    set timeLeft(v) { timeLeft = Math.max(0, v); },
    get duration() { return duration; },
    get goalLimit() { return goalLimit; },
    set goalLimit(v) { goalLimit = Math.max(1, v); },
    get difficulty() { return difficulty; },
    speedFactor,
    toast: (txt, ms = 1050) => flash(txt, ms),
    sound,
    finish: () => finish(),
    resetPositions: () => resetPositions(),
  };
  window.Futbol = { Mecanicas, juego };

  /* ---------------------------------------------------------------------
     3. MENÚS E INTERFAZ
     --------------------------------------------------------------------- */
  function show(html) {
    $('#modalbody').innerHTML = html;
    $('#modal').classList.add('show');
    const f = $('#modalbody button');
    if (f) f.focus({ preventScroll: true });
  }
  function hide() {
    $('#modal').classList.remove('show');
  }
  function flash(txt, ms = 1050) {
    const t = $('#toast');
    t.textContent = txt;
    t.classList.add('on');
    clearTimeout(flash.timer);
    flash.timer = setTimeout(() => t.classList.remove('on'), ms);
  }

  function chooseStart(m) {
    mode = m;
    show(`<p class="eyebrow">PREPARA EL PARTIDO</p><h2>${m === 'two' ? 'DOS JUGADORES' : 'PARTIDO RÁPIDO'}</h2>
      <p>${m === 'two' ? 'Azul: W A S D + ESPACIO · Rojo: FLECHAS + ENTER. Los porteros se mueven solos.' : 'Elige dificultad, duración y límite de goles.'} El partido termina al agotarse el reloj o alcanzar el marcador.</p>
      <div style="font:11px 'DM Mono';color:#a8b6aa;margin:18px 0 7px">DIFICULTAD ${m === 'two' ? '(PORTEROS)' : 'DE LA CPU'}</div>
      <div class="choices" id="diffs">${Object.keys(diff).map((x) => `<button class="choice ${difficulty === x ? 'active' : ''}" data-diff="${x}"><strong>${x}</strong><span>RIVAL ${x === 'FACIL' ? 'RELAJADO' : x === 'EXPERTO' ? 'IMPLACABLE' : 'COMPETITIVO'}</span></button>`).join('')}</div>
      <div class="row">
        <label style="font:11px 'DM Mono';color:#a8b6aa">TIEMPO <select id="dur" style="background:#1b2b23;color:white;border:1px solid #46564a;padding:9px;margin-left:8px"><option value="90">90 segundos</option><option value="120" selected>2 minutos</option><option value="180">3 minutos</option><option value="300">5 minutos</option></select></label>
        <label style="font:11px 'DM Mono';color:#a8b6aa">GOLES <select id="lim" style="background:#1b2b23;color:white;border:1px solid #46564a;padding:9px;margin-left:8px"><option>3</option><option selected>5</option><option>7</option><option>10</option></select></label>
      </div>
      <button class="btn primary" id="startmatch" style="margin-top:24px;width:100%">PITAZO INICIAL →</button>`);
    document.querySelectorAll('[data-diff]').forEach((b) => (b.onclick = () => {
      difficulty = b.dataset.diff;
      stats.difficulty = difficulty;
      save();
      document.querySelectorAll('[data-diff]').forEach((q) => q.classList.toggle('active', q === b));
    }));
    $('#startmatch').onclick = () => {
      duration = +$('#dur').value;
      goalLimit = +$('#lim').value;
      hide();
      startGame();
    };
  }

  function instructions() {
    show(`<p class="eyebrow">JUEGA A TU MANERA</p><h2>CONTROLES</h2>
      <p><b style="color:#d9ff56">JUGADOR 1 · AZUL</b><br>W A S D para correr · ESPACIO para chutar (mantén para cargar potencia)<br><br>
      <b style="color:#ff7067">JUGADOR 2 · ROJO</b> (modo dos jugadores)<br>FLECHAS para correr · ENTER para chutar<br><br>
      <b style="color:#d9ff56">PARTIDO</b><br>ESC o P pausa y reanuda · R reinicia · F muestra los FPS · botón Ⅱ PAUSA en pantalla.<br>
      Los porteros (dorsal 1) defienden solos. El balón acelera a medida que avanza el partido.
      En móvil usa el pad táctil y el botón CHUTA.</p>
      <button class="btn primary" id="ok" style="margin-top:16px">ENTENDIDO</button>`);
    $('#ok').onclick = hide;
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d) ? '—' : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }
  function statsScreen() {
    const rows = stats.history.length
      ? stats.history.map((h) => `<tr><td>${fmtDate(h.date)}</td><td>${h.mode === 'two' ? '2 JUG.' : 'VS CPU'}</td><td><b style="color:#d9ff56">${h.a} – ${h.b}</b></td><td>${h.a > h.b ? 'Victoria azul' : h.a < h.b ? 'Victoria rival' : 'Empate'}</td></tr>`).join('')
      : '<tr><td colspan="4">Juega tu primer partido.</td></tr>';
    show(`<p class="eyebrow">TU HISTORIAL</p><h2>ESTADÍSTICAS</h2>
      <div class="statgrid">
        <div class="stat"><b>${stats.played}</b><small>PARTIDOS</small></div>
        <div class="stat"><b>${stats.won}</b><small>VICTORIAS</small></div>
        <div class="stat"><b>${stats.drawn}</b><small>EMPATES</small></div>
        <div class="stat"><b>${stats.lost}</b><small>DERROTAS</small></div>
        <div class="stat"><b>${stats.scored}</b><small>GOLES A FAVOR</small></div>
        <div class="stat"><b>${stats.conceded}</b><small>EN CONTRA</small></div>
        <div class="stat"><b>${stats.best}</b><small>MEJOR RACHA</small></div>
        <div class="stat"><b>${stats.bestGoals}</b><small>RÉCORD DE GOLES</small></div>
        <div class="stat"><b>${stats.played ? Math.round((stats.won / stats.played) * 100) : 0}%</b><small>% VICTORIAS</small></div>
      </div>
      <p style="margin-bottom:6px">ÚLTIMOS PARTIDOS</p>
      <table class="history"><thead><tr><th>FECHA</th><th>MODO</th><th>MARCADOR</th><th>RESULTADO</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="endbuttons"><button class="btn primary" id="statok">VOLVER</button><button class="btn secondary" id="statreset">REINICIAR ESTADÍSTICAS</button></div>`);
    $('#statok').onclick = hide;
    $('#statreset').onclick = () => {
      if (!confirm('¿Borrar todas las estadísticas e historial de Atari Football? Esta acción no se puede deshacer.')) return;
      stats = { ...defaults, history: [], sound: stats.sound, difficulty };
      save();
      statsScreen();
    };
  }

  function settingsScreen() {
    show(`<p class="eyebrow">PREFERENCIAS</p><h2>CONFIGURACIÓN</h2><p>Personaliza el ambiente de juego.</p>
      <div class="choices"><button class="choice" id="snd"><strong>SONIDO: ${stats.sound ? 'ACTIVO' : 'MUTED'}</strong><span>EFECTOS DE JUEGO</span></button><button class="choice" id="level"><strong>${difficulty}</strong><span>DIFICULTAD ACTUAL</span></button></div>
      <button class="btn primary" id="done">LISTO</button>`);
  }

  $('#play').onclick = () => chooseStart('ai');
  $('#two').onclick = () => chooseStart('two');
  $('#close').onclick = hide;
  $('#settings').onclick = settingsScreen;
  $('#modalbody').onclick = (e) => {
    if (e.target.closest('#snd')) {
      stats.sound = !stats.sound;
      save();
      settingsScreen();
    }
    if (e.target.closest('#level')) chooseStart(mode);
    if (e.target.closest('#done')) hide();
  };
  $('#stats').onclick = statsScreen;
  $('#instructions').onclick = instructions;
  $('#home').addEventListener('click', (e) => {
    if (e.target.id === 'play' || e.target.id === 'two') sound(350, 0.06);
  });

  /* Enlace de regreso al portafolio cuando el juego se abre fuera del reproductor */
  if (window.top === window.self) $('#portfolio').hidden = false;

  /* ---------------------------------------------------------------------
     4. ENTRADA: TECLADO Y CONTROLES TÁCTILES
     --------------------------------------------------------------------- */
  const GAME_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '];
  window.addEventListener('keydown', (e) => {
    if (GAME_KEYS.includes(e.key) && state !== 'MENU') e.preventDefault();
    const k = e.key.toLowerCase();
    if (e.repeat && (k === 'escape' || k === 'p' || k === 'r' || k === 'f')) return;
    if (k === 'escape' || k === 'p') { togglePause(); return; }
    if (k === 'r') { restart(); return; }
    if (k === 'f') { showFps = !showFps; if (state !== 'PLAYING') draw(); return; }
    keys[k] = true;
    codes[e.code] = true;
    Mecanicas.emitir('alTecla', k, true);
  });
  window.addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    keys[k] = false;
    codes[e.code] = false;
    Mecanicas.emitir('alTecla', k, false);
  });
  window.addEventListener('blur', () => {
    keys = {};
    codes = {};
    if (state === 'PLAYING') togglePause();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state === 'PLAYING') togglePause();
  });

  const touchMap = { up: 'w', down: 's', left: 'a', right: 'd' };
  document.querySelectorAll('.pad button').forEach((b) => {
    const dn = (e) => { e.preventDefault(); keys[touchMap[b.dataset.k]] = true; };
    const up = (e) => { e.preventDefault(); keys[touchMap[b.dataset.k]] = false; };
    b.addEventListener('pointerdown', dn);
    ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => b.addEventListener(t, up));
  });
  const kickbtn = $('[data-kick]');
  kickbtn.addEventListener('pointerdown', (e) => { e.preventDefault(); keys[' '] = true; });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => kickbtn.addEventListener(t, () => (keys[' '] = false)));

  /* Lectura de controles por jugador (cada uno con sus propias teclas) */
  const CONTROLS = [
    { up: 'w', down: 's', left: 'a', right: 'd', kick: ' ' },
    { up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright', kick: 'enter' },
  ];
  function readInput(c) {
    return { x: (keys[c.right] ? 1 : 0) - (keys[c.left] ? 1 : 0), y: (keys[c.down] ? 1 : 0) - (keys[c.up] ? 1 : 0), kick: !!keys[c.kick] };
  }

  /* ---------------------------------------------------------------------
     5. JUGADORES, IA Y PORTEROS
     Índices: 0 = jugador 1 (azul) · 1,2 = apoyo azul
              3 = delantero rojo (CPU o jugador 2) · 4,5 = apoyo rojo
              6 = portero azul · 7 = portero rojo
     --------------------------------------------------------------------- */
  function makePlayer(team, x, y, num, role = 'field') {
    return { x, y, vx: 0, vy: 0, r: 20, team, num, role, stamina: 1, face: team === 0 ? 1 : -1, kick: 0, run: 0 };
  }
  function resetPositions() {
    players = [
      makePlayer(0, 290, 305, 7), makePlayer(0, 385, 195, 11), makePlayer(0, 385, 415, 10),
      makePlayer(1, 710, 305, 9), makePlayer(1, 615, 195, 6), makePlayer(1, 615, 415, 8),
      makePlayer(0, 112, 305, 1, 'gk'), makePlayer(1, 888, 305, 1, 'gk'),
    ];
    ball = { x: 500, y: 305, vx: 0, vy: 0, r: 12, spin: 0, trail: [] };
    particles = [];
    shotCooldown = [0, 0];
  }

  function movePlayer(p, ix, iy, dt, speed = 1) {
    speed *= Mecanicas.factor('velocidadJugador', p);
    const n = Math.hypot(ix, iy);
    if (n > 1) { ix /= n; iy /= n; }
    const accel = 1200 * speed;
    p.vx += ix * accel * dt;
    p.vy += iy * accel * dt;
    const max = 235 * speed;
    const v = Math.hypot(p.vx, p.vy);
    if (v > max) { p.vx *= max / v; p.vy *= max / v; }
    const f = Math.pow(0.0008, dt);
    p.vx *= f;
    p.vy *= f;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.x = clamp(p.x, 90, 910);
    p.y = clamp(p.y, 80, 530);
    p.run = Math.min(1, v / 130);
    if (Math.abs(p.vx) > 4) p.face = Math.sign(p.vx);
  }

  /* IA del equipo rojo: el delantero (3) persigue el balón de forma
     autónoma; los defensas (4,5) se escalonan según la posición del balón. */
  function aiUpdate(dt) {
    const d = diff[difficulty] || diff.NORMAL;
    /* Si el jugador 1 está lejos del balón, el delantero deja de cubrir y va a buscarlo */
    const rivalCerca = dist(players[0], ball) < 160;
    for (let i = 3; i < 6; i++) {
      const p = players[i];
      const def = i !== 3;
      let tx, ty;
      if (def) {
        tx = 700 + (ball.x - 500) * 0.09;
        ty = 305 + (ball.y - 305) * 0.53;
      } else {
        tx = ball.x + 24;
        ty = ball.y;
      }
      const goalBias = ball.x < 500 ? -0.35 : !def && !rivalCerca ? -0.2 : 0.6;
      tx += goalBias * 50;
      const react = d.react * (0.58 + 0.42 * Math.sin(performance.now() / 1000 + i * 9));
      /* Ganancia constante (equivale a la original a 60 FPS): antes dependía de dt
         y la CPU era hasta 3 veces más lenta en pantallas de 144–180 Hz. */
      const gain = Math.min(1, react * 0.05);
      tx = p.x + (tx - p.x) * gain;
      ty = p.y + (ty - p.y) * gain;
      movePlayer(p, tx - p.x, ty - p.y, dt, d.speed);
      if (dist(p, ball) < p.r + ball.r + 12 && Math.random() < dt * (1 + d.press)) kick(p, null, d.aim);
    }
  }

  /* Porteros: se quedan en el área chica y siguen la altura del balón
     dentro de la boca del arco; despejan si el balón llega a su alcance. */
  function keeperUpdate(p, dt) {
    const d = diff[difficulty] || diff.NORMAL;
    const home = p.team === 0 ? 112 : 888;
    const attacking = p.team === 0 ? ball.x < 330 : ball.x > 670;
    const tx = attacking ? home + (p.team === 0 ? 1 : -1) * clamp(Math.abs(ball.x - home) * 0.18, 0, 36) : home;
    const ty = clamp(305 + (ball.y - 305) * (attacking ? 0.9 : 0.4), FIELD.goalTop - 6, FIELD.goalBottom + 6);
    movePlayer(p, (tx - p.x) / 30, (ty - p.y) / 30, dt, 0.78 * d.keeper);
    if (dist(p, ball) < p.r + ball.r + 10) kick(p, null, d.aim);
  }

  /* Jugadores de apoyo: acompañan la jugada manteniendo separación */
  function supportUpdate(dt) {
    for (const i of [1, 2, 4, 5]) {
      const q = players[i];
      const sign = q.team === 0 ? 1 : -1;
      const tx = clamp(ball.x - sign * 115, 130, 870);
      const ty = clamp(ball.y + (i % 2 ? 125 : -125), 100, 510);
      movePlayer(q, (tx - q.x) * 0.8, (ty - q.y) * 0.8, dt, 0.65);
    }
  }

  /* Chute. `input` = dirección del jugador humano ({x,y}) o null para la IA */
  function kick(p, input, aim = 1) {
    const id = p.team;
    if (shotCooldown[id] > 0.13) return;
    const dx = ball.x - p.x;
    const dy = ball.y - p.y;
    if (Math.hypot(dx, dy) > p.r + ball.r + 28) return;
    let dirx, diry;
    if (input && (input.x || input.y)) {
      dirx = input.x || p.face * 0.52;
      diry = input.y;
    } else {
      dirx = p.team === 0 ? 1 : -1;
      diry = (305 - ball.y) / 460;
    }
    if (!input && p.team === 1 && p.role !== 'gk') {
      dirx = -1;
      diry = (305 - ball.y) / 350 + (Math.random() - 0.5) * (1 - aim) * 0.8;
    }
    if (p.role === 'gk') diry += (Math.random() - 0.5) * 0.9; // despeje hacia una banda
    const l = Math.hypot(dirx, diry) || 1;
    dirx /= l;
    diry /= l;
    const charge = clamp(p.kick || 0, 0, 1);
    const powerV = (360 + charge * 390) * speedFactor() * Mecanicas.factor('alChutar', p);
    ball.vx = dirx * powerV;
    ball.vy = diry * powerV + p.vy * 0.23;
    ball.x += dirx * 7;
    ball.y += diry * 7;
    p.kick = 0;
    shotCooldown[id] = 0.2;
    for (let j = 0; j < 8; j++) particles.push({ x: ball.x, y: ball.y, vx: rand(-90, 90), vy: rand(-90, 90), life: rand(0.18, 0.38), color: '#e9f4d8', r: rand(1, 3) });
    sound(120 + powerV * 0.35, 0.08, 'triangle', 0.045);
  }

  /* Jugador humano: movimiento + carga de chute (mantener y soltar) */
  function humanUpdate(p, c, dt) {
    const input = readInput(c);
    movePlayer(p, input.x, input.y, dt);
    if (input.kick) p.kick = Math.min(1, (p.kick || 0) + dt * 1.2);
    else if (p.kick > 0) kick(p, input);
  }

  /* ---------------------------------------------------------------------
     6. FÍSICA DEL BALÓN Y COLISIONES
     --------------------------------------------------------------------- */
  /* Separación jugador–jugador (círculo contra círculo) */
  function collidePlayers() {
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const a = players[i];
        const b = players[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.001;
        const min = a.r + b.r - 4;
        if (d < min) {
          const nx = dx / d;
          const ny = dy / d;
          const over = min - d;
          a.x -= nx * over * 0.5;
          a.y -= ny * over * 0.5;
          b.x += nx * over * 0.5;
          b.y += ny * over * 0.5;
          const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (rel < 0) {
            a.vx += nx * rel * 0.55;
            b.vx -= nx * rel * 0.55;
            a.vy += ny * rel * 0.55;
            b.vy -= ny * rel * 0.55;
          }
        }
      }
    }
  }

  /* Balón contra jugadores: lo empuja fuera y transfiere parte de la velocidad */
  function collideBallPlayers() {
    for (const q of players) {
      const dx = ball.x - q.x;
      const dy = ball.y - q.y;
      const d = Math.hypot(dx, dy) || 0.01;
      const min = ball.r + q.r;
      if (d < min) {
        const nx = dx / d;
        const ny = dy / d;
        ball.x = q.x + nx * min;
        ball.y = q.y + ny * min;
        const rel = ball.vx * nx + ball.vy * ny;
        if (rel < 80) {
          ball.vx += nx * (100 - rel) + q.vx * 0.72;
          ball.vy += ny * (100 - rel) + q.vy * 0.72;
        }
      }
    }
  }

  /* Rebote del balón contra un poste (círculo contra círculo) */
  function collidePost(post) {
    const dx = ball.x - post.x;
    const dy = ball.y - post.y;
    const d = Math.hypot(dx, dy);
    const min = ball.r + FIELD.postR;
    if (d >= min || d === 0) return;
    const nx = dx / d;
    const ny = dy / d;
    ball.x = post.x + nx * min;
    ball.y = post.y + ny * min;
    const vn = ball.vx * nx + ball.vy * ny;
    if (vn < 0) {
      ball.vx -= 1.75 * vn * nx; // reflexión con restitución 0,75
      ball.vy -= 1.75 * vn * ny;
      sound(900, 0.06, 'square', 0.03);
    }
  }

  /* Límites de la cancha, postes, red y detección de gol.
     Devuelve el lado que anotó (0 azul, 1 rojo) o -1. */
  function collideField() {
    const { left, right, top, bottom, goalTop, goalBottom, goalDepth } = FIELD;
    const r = ball.r;
    const inMouth = ball.y > goalTop && ball.y < goalBottom;
    const insideGoal = ball.x < left || ball.x > right; // centro detrás de la línea de gol

    // Bandas superior e inferior (nunca son gol)
    if (!insideGoal) {
      if (ball.y - r < top) { ball.y = top + r; ball.vy = Math.abs(ball.vy) * 0.78; sound(100, 0.04, 'sine', 0.02); }
      if (ball.y + r > bottom) { ball.y = bottom - r; ball.vy = -Math.abs(ball.vy) * 0.78; sound(100, 0.04, 'sine', 0.02); }
    }
    // Líneas de fondo: rebote fuera de la boca del arco
    if (!inMouth && !insideGoal) {
      if (ball.x - r < left) { ball.x = left + r; ball.vx = Math.abs(ball.vx) * 0.78; }
      if (ball.x + r > right) { ball.x = right - r; ball.vx = -Math.abs(ball.vx) * 0.78; }
    }
    for (const p of POSTS) collidePost(p);
    // Dentro del arco: la red lateral y el fondo contienen el balón
    if (insideGoal) {
      ball.y = clamp(ball.y, goalTop + r * 0.5, goalBottom - r * 0.5);
      if (ball.x < left - goalDepth + r) { ball.x = left - goalDepth + r; ball.vx = Math.abs(ball.vx) * 0.2; }
      if (ball.x > right + goalDepth - r) { ball.x = right + goalDepth - r; ball.vx = -Math.abs(ball.vx) * 0.2; }
    }
    // Gol: el centro del balón supera la línea en más de medio radio dentro de la boca
    if (ball.y > goalTop && ball.y < goalBottom) {
      if (ball.x < left - r / 2) return 1; // arco azul (izquierda) → gol rojo
      if (ball.x > right + r / 2) return 0; // arco rojo (derecha) → gol azul
    }
    return -1;
  }

  /* Integra el balón en sub-pasos para que no atraviese postes a alta velocidad */
  function updateBall(dt) {
    Mecanicas.emitir('alMoverBalon', dt);
    const speed = Math.hypot(ball.vx, ball.vy);
    const steps = Math.max(1, Math.ceil((speed * dt) / (ball.r * 0.5)));
    const h = dt / steps;
    for (let s = 0; s < steps; s++) {
      ball.x += ball.vx * h;
      ball.y += ball.vy * h;
      Mecanicas.emitir('alColisionBalon', ball);
      const side = collideField();
      if (side >= 0) { scoreGoal(side); return; }
    }
    const fr = Math.pow(0.988, dt * 60);
    ball.vx *= fr;
    ball.vy *= fr;
    ball.spin += speed * dt * 0.02;
    ball.trail.unshift({ x: ball.x, y: ball.y });
    if (ball.trail.length > 7) ball.trail.pop();
  }

  /* ---------------------------------------------------------------------
     7. GOLES, FIN DE PARTIDO Y ESTADÍSTICAS
     --------------------------------------------------------------------- */
  function scoreGoal(side) {
    if (state !== 'PLAYING') return;
    if (Mecanicas.emitir('alGol', side) === false) return;
    score[side]++;
    state = 'GOAL';
    goalTimer = 1.75;
    for (let i = 0; i < 130; i++) {
      const angle = Math.random() * Math.PI * 2;
      const s = rand(100, 480);
      particles.push({ x: side ? 870 : 130, y: 305, vx: Math.cos(angle) * s, vy: Math.sin(angle) * s - 100, life: rand(1, 2.8), color: ['#d9ff56', '#f5f7ed', '#ff6b61', '#58b9ed'][i % 4], r: rand(2, 6) });
    }
    flash(side === 0 ? '¡GOL AZUL!' : mode === 'two' ? '¡GOL ROJO!' : '¡GOL CPU!');
    sound(680, 0.5, 'sawtooth', 0.07);
    Mecanicas.emitir('despuesDeGol', side);
    updateUI();
    if (Math.max(...score) >= goalLimit) goalTimer = 0.9;
  }

  function finish() {
    if (state === 'FINISHED' || state === 'MENU') return;
    state = 'FINISHED';
    cancelAnimationFrame(raf);
    stats.played++;
    stats.scored += score[0];
    stats.conceded += score[1];
    const win = score[0] > score[1];
    const draw0 = score[0] === score[1];
    if (win) { stats.won++; stats.streak++; stats.best = Math.max(stats.best, stats.streak); }
    else if (draw0) { stats.drawn++; }
    else { stats.lost++; stats.streak = 0; }
    stats.bestGoals = Math.max(stats.bestGoals, score[0]);
    stats.history.unshift({ date: new Date().toISOString(), mode, a: score[0], b: score[1], duration: Math.round(duration - timeLeft) });
    stats.history = stats.history.slice(0, HISTORY_MAX);
    save();
    draw();
    const rival = mode === 'two' ? 'ROJO' : 'CPU';
    setTimeout(() => {
      if (state !== 'FINISHED') return;
      show(`<p class="eyebrow">${draw0 ? 'PARTIDO CERRADO' : win ? 'VICTORIA AZUL' : 'VICTORIA ' + rival}</p><h2>${draw0 ? 'EMPATE' : win ? (mode === 'two' ? '¡GANA AZUL!' : '¡GANASTE!') : mode === 'two' ? '¡GANA ROJO!' : 'BUEN PARTIDO'}</h2>
        <p>Marcador final · <b style="color:#d9ff56">${score[0]} — ${score[1]}</b></p>
        <div class="statgrid"><div class="stat"><b>${score[0]}</b><small>AZUL</small></div><div class="stat"><b>${score[1]}</b><small>${rival}</small></div><div class="stat"><b>${stats.best}</b><small>MEJOR RACHA</small></div></div>
        <div class="endbuttons"><button class="btn primary" id="rematch">REVANCHA</button><button class="btn secondary" id="tomenu">MENÚ</button></div>`);
      $('#rematch').onclick = () => { hide(); startGame(); };
      $('#tomenu').onclick = endToMenu;
    }, 450);
  }

  function updateUI() {
    $('#scoreA').textContent = score[0];
    $('#scoreB').textContent = score[1];
    $('#clock').textContent = `${String(Math.floor(timeLeft / 60)).padStart(2, '0')}:${String(Math.floor(timeLeft % 60)).padStart(2, '0')}`;
    $('#speed').textContent = `VEL ×${speedFactor().toFixed(2)}`;
  }

  /* ---------------------------------------------------------------------
     8. GAME LOOP
     Un único bucle requestAnimationFrame activo a la vez (`raf`).
     dt = segundos desde el frame anterior, limitado a 33 ms para evitar
     saltos de simulación al volver de otra pestaña.
     --------------------------------------------------------------------- */
  function startLoop() {
    cancelAnimationFrame(raf);
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function startGame() {
    mode = mode || 'ai';
    score = [0, 0];
    timeLeft = duration;
    state = 'PLAYING';
    cam = 0;
    keys = {};
    codes = {};
    resetPositions();
    $('#home').style.display = 'none';
    $('#game').classList.add('show');
    $('#teamB').textContent = mode === 'two' ? 'ROJO' : 'CPU';
    $('#hint').textContent = mode === 'two'
      ? 'AZUL: WASD + ESPACIO · ROJO: FLECHAS + ENTER · ESC/P PAUSA · R REINICIA'
      : 'WASD MOVER · ESPACIO CHUTAR (MANTÉN = POTENCIA) · ESC/P PAUSA · R REINICIA';
    $('#touch').style.display = 'ontouchstart' in window || navigator.maxTouchPoints > 0 ? 'flex' : 'none';
    $('#pause').textContent = 'Ⅱ PAUSA';
    Mecanicas.emitir('alIniciar');
    updateUI();
    sound(550, 0.14, 'square');
    startLoop();
  }

  function endToMenu() {
    state = 'MENU';
    cancelAnimationFrame(raf);
    $('#game').classList.remove('show');
    $('#home').style.display = '';
    keys = {};
    codes = {};
    hide();
  }

  /* Pausa: detiene el bucle (no consume CPU) y recuerda si veníamos de un gol */
  let pausedFrom = 'PLAYING';
  function togglePause() {
    if (state === 'PLAYING' || state === 'GOAL') {
      pausedFrom = state;
      state = 'PAUSED';
      cancelAnimationFrame(raf);
      keys = {};
      $('#pause').textContent = '▶ SEGUIR';
      draw();
    } else if (state === 'PAUSED') {
      state = pausedFrom;
      $('#pause').textContent = 'Ⅱ PAUSA';
      startLoop();
    }
  }

  function restart() {
    if (!['PLAYING', 'PAUSED', 'GOAL', 'FINISHED'].includes(state)) return;
    hide();
    startGame();
  }

  $('#back').onclick = () => {
    if (state === 'PLAYING' || state === 'PAUSED' || state === 'GOAL') {
      if (state !== 'PAUSED') togglePause();
      if (confirm('¿Salir del partido y volver al menú?')) endToMenu();
    } else endToMenu();
  };
  $('#pause').onclick = togglePause;

  /* Actualización de un frame de juego (solo en estado PLAYING) */
  function update(dt) {
    timeLeft -= dt;
    if (timeLeft <= 0) {
      timeLeft = 0;
      if (Mecanicas.emitir('alTerminarTiempo') !== false) { finish(); return; }
    }
    for (let i = 0; i < 2; i++) shotCooldown[i] = Math.max(0, shotCooldown[i] - dt);

    humanUpdate(players[0], CONTROLS[0], dt);
    if (mode === 'two') humanUpdate(players[3], CONTROLS[1], dt);
    else aiUpdate(dt);
    supportUpdate(dt);
    keeperUpdate(players[6], dt);
    keeperUpdate(players[7], dt);
    Mecanicas.emitir('alActualizar', dt);
    if (state !== 'PLAYING') return;

    collidePlayers();
    collideBallPlayers();
    updateBall(dt);
    updateEffects(dt);
  }

  function updateEffects(dt) {
    particles = particles.filter((a) => {
      a.life -= dt;
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.vx *= 0.98;
      a.vy *= 0.98;
      return a.life > 0;
    });
    cam += (Math.abs(ball.vx) > 370 ? Math.sin(performance.now() / 180) * 0.45 - cam : 0) * dt * 3;
  }

  function loop(now) {
    const dt = clamp((now - last) / 1000, 0, 0.033);
    if (now > last) fps += (1000 / (now - last) - fps) * 0.05;
    last = now;
    if (state === 'PLAYING') {
      update(dt);
    } else if (state === 'GOAL') {
      updateEffects(dt);
      goalTimer -= dt;
      if (goalTimer <= 0) {
        if (Math.max(...score) >= goalLimit) { finish(); return; }
        resetPositions();
        state = 'PLAYING';
      }
    } else {
      return; // PAUSED / FINISHED / MENU: el bucle se detiene
    }
    updateUI();
    if (state === 'FINISHED' || state === 'MENU') return;
    draw();
    raf = requestAnimationFrame(loop);
  }

  /* ---------------------------------------------------------------------
     9. RENDER
     --------------------------------------------------------------------- */
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }
  function drawField() {
    const g = ctx.createLinearGradient(80, 65, 920, 545);
    g.addColorStop(0, '#3d8148');
    g.addColorStop(1, '#286139');
    ctx.fillStyle = '#112319';
    ctx.fillRect(0, 0, 1000, 610);
    ctx.fillStyle = '#14261c';
    for (let i = 0; i < 12; i++) ctx.fillRect(i * 84, 0, 1, 610);
    ctx.fillStyle = g;
    rr(74, 68, 852, 474, 15);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(74, 68, 852, 474, 15);
    ctx.clip();
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = i % 2 ? '#ffffff08' : '#082b0e0a';
      ctx.fillRect(74 + i * 85, 68, 85, 474);
    }
    const grd = ctx.createRadialGradient(500, 300, 120, 500, 300, 620);
    grd.addColorStop(0, 'transparent');
    grd.addColorStop(1, '#06100d65');
    ctx.fillStyle = grd;
    ctx.fillRect(74, 68, 852, 474);
    ctx.restore();
    ctx.strokeStyle = '#e3f0d2b9';
    ctx.lineWidth = 2;
    rr(74, 68, 852, 474, 15);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(500, 68);
    ctx.lineTo(500, 542);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(500, 305, 76, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#eff7d8';
    for (const [x, y] of [[500, 305], [120, 305], [880, 305]]) {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeRect(74, 183, 130, 244);
    ctx.strokeRect(74, 235, 52, 140);
    ctx.strokeRect(796, 183, 130, 244);
    ctx.strokeRect(874, 235, 52, 140);
    // porterías con red
    for (const x of [52, 926]) {
      ctx.fillStyle = '#d7e0c7';
      ctx.fillRect(x, 260, 22, 90);
      ctx.strokeStyle = '#9eb39e';
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x + i * 5, 260); ctx.lineTo(x + i * 5, 350); ctx.stroke(); }
      for (let j = 0; j < 8; j++) { ctx.beginPath(); ctx.moveTo(x, 260 + j * 12); ctx.lineTo(x + 22, 260 + j * 12); ctx.stroke(); }
    }
    // postes
    ctx.fillStyle = '#f5f7ed';
    for (const p of POSTS) { ctx.beginPath(); ctx.arc(p.x, p.y, FIELD.postR, 0, Math.PI * 2); ctx.fill(); }
    // público y focos
    for (let i = 0; i < 56; i++) {
      const x = 82 + i * 15.2;
      ctx.fillStyle = ['#e2ba67', '#d16f63', '#cbd4ad', '#85bad0'][i % 4];
      ctx.globalAlpha = 0.5 + Math.sin(performance.now() / 200 + i) * 0.15;
      ctx.fillRect(x, 48 + (i % 3) * 4, 3, 5);
      ctx.fillRect(x, 557 + (i % 3) * 4, 3, 5);
    }
    ctx.globalAlpha = 1;
    for (const x of [230, 770]) {
      ctx.fillStyle = '#e9ff9d22';
      ctx.beginPath();
      ctx.arc(x, 65, 100, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPlayer(p) {
    const moving = Math.hypot(p.vx, p.vy) > 25;
    const step = moving ? Math.sin(performance.now() * 0.018 + p.num) * 6 : Math.sin(performance.now() * 0.003 + p.num) * 1.4;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(Math.atan2(p.vy, p.vx || p.face) * 0.15);
    ctx.fillStyle = '#07120f66';
    ctx.beginPath();
    ctx.ellipse(2, 13, 20, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    const gk = p.role === 'gk';
    const shirt = gk ? (p.team === 0 ? '#e6c229' : '#f08a24') : p.team === 0 ? '#1688be' : '#d94740';
    const shade = gk ? (p.team === 0 ? '#9c8314' : '#a65a12') : p.team === 0 ? '#0f5e8d' : '#912f2a';
    ctx.strokeStyle = '#15211a';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-7, 11); ctx.lineTo(-9 - step, 20); ctx.lineTo(-11 - step, 26);
    ctx.moveTo(7, 11); ctx.lineTo(9 + step, 20); ctx.lineTo(11 + step, 26);
    ctx.stroke();
    ctx.fillStyle = '#eee8ce';
    ctx.fillRect(-15 - step, 24, 9, 4);
    ctx.fillRect(8 + step, 24, 9, 4);
    ctx.strokeStyle = shirt;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-11, -1); ctx.lineTo(-16, 7 + step * 0.2);
    ctx.moveTo(11, -1); ctx.lineTo(16, 7 - step * 0.2);
    ctx.stroke();
    if (gk) { // guantes del portero
      ctx.fillStyle = '#f5f7ed';
      ctx.beginPath(); ctx.arc(-16, 8 + step * 0.2, 3.5, 0, Math.PI * 2); ctx.arc(16, 8 - step * 0.2, 3.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = shade;
    rr(-13, -4, 26, 23, 7);
    ctx.fill();
    ctx.fillStyle = shirt;
    rr(-10, -7, 20, 23, 5);
    ctx.fill();
    ctx.fillStyle = '#ffffffbd';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(p.num, 0, 7);
    ctx.fillStyle = '#efc9a3';
    ctx.beginPath();
    ctx.arc(0, -13, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#352b20';
    ctx.beginPath();
    ctx.arc(0, -17, 8, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBall() {
    for (let i = ball.trail.length - 1; i > 1; i--) {
      const q = ball.trail[i];
      const a = (1 - i / ball.trail.length) * 0.17;
      ctx.fillStyle = `rgba(245,247,237,${a})`;
      ctx.beginPath();
      ctx.arc(q.x, q.y, ball.r * (1 - i / ball.trail.length) * 0.72, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#07120f77';
    ctx.beginPath();
    ctx.ellipse(ball.x + 3, ball.y + 8, 13, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(ball.spin);
    ctx.fillStyle = '#f3f1df';
    ctx.beginPath();
    ctx.arc(0, 0, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#242923';
    for (let a = 0; a < 5; a++) {
      const an = (a * Math.PI * 2) / 5;
      ctx.beginPath();
      ctx.arc(Math.cos(an) * 9, Math.sin(an) * 9, 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#46493f';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(0, 0, ball.r - 1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    ctx.save();
    ctx.translate(cam, 0);
    drawField();
    Mecanicas.emitir('alDibujar', ctx);
    for (const p of players) drawPlayer(p);
    drawBall();
    for (const q of particles) {
      ctx.globalAlpha = clamp(q.life, 0, 1);
      ctx.fillStyle = q.color;
      ctx.beginPath();
      ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    Mecanicas.emitir('alDibujarHUD', ctx);
    if (showFps) {
      ctx.fillStyle = '#06100dcc';
      ctx.fillRect(8, 8, 92, 24);
      ctx.fillStyle = fps >= 55 ? '#d9ff56' : '#ff6b61';
      ctx.font = '13px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${Math.round(fps)} FPS`, 16, 25);
    }
    if (state === 'PAUSED' || state === 'FINISHED') {
      ctx.fillStyle = '#06100dbb';
      ctx.fillRect(0, 0, 1000, 610);
      ctx.fillStyle = '#d9ff56';
      ctx.textAlign = 'center';
      ctx.font = '900 56px Impact, sans-serif';
      ctx.fillText(state === 'PAUSED' ? 'PAUSA' : 'TIEMPO', 500, 296);
      ctx.fillStyle = 'white';
      ctx.font = '16px monospace';
      ctx.fillText(state === 'PAUSED' ? 'Pulsa ESC, P o SEGUIR para volver al partido' : '', 500, 332);
    }
  }

  window.addEventListener('resize', () => {
    if (state !== 'MENU') draw();
  });

  /* Gancho de pruebas automatizadas (solo con ?qa=1 en la URL) */
  if (new URLSearchParams(location.search).has('qa')) {
    window.__AF = {
      get state() { return state; }, get score() { return score; }, get ball() { return ball; },
      get players() { return players; }, get stats() { return stats; }, get raf() { return raf; }, get fps() { return fps; },
      start(m = 'two', secs = 120, limit = 5) { mode = m; duration = secs; goalLimit = limit; startGame(); },
      setTime(v) { timeLeft = v; },
    };
  }
})();
