/* ==========================================================================
   MECÁNICA SORPRESA · OBSTÁCULOS ALEATORIOS EN LA CANCHA
   Aparecen conos circulares en posiciones aleatorias (lejos del centro y de
   las áreas). El balón rebota en ellos y los jugadores no pueden atravesarlos.
   Se reubican cada cierto tiempo.
   Activar: en futbol.html, después de js/futbol.js →
            <script src="live-coding/obstaculos.js"></script>
   ========================================================================== */
(() => {
  'use strict';
  const { Mecanicas } = window.Futbol;

  const CONFIG = {
    cantidad: 4,
    radioMin: 16,
    radioMax: 24,
    renovarCada: 15, // segundos
    rebote: 0.85, // restitución del balón al chocar (1 = sin pérdida)
  };
  let obstaculos = [];
  let reloj = 0;

  /* Posición válida: dentro de la cancha, fuera del círculo central y de las
     áreas grandes, sin pisar a otro obstáculo ni a un jugador. */
  function generar(juego) {
    obstaculos = [];
    let intentos = 0;
    while (obstaculos.length < CONFIG.cantidad && intentos++ < 400) {
      const r = juego.rand(CONFIG.radioMin, CONFIG.radioMax);
      const o = { x: juego.rand(230, 770), y: juego.rand(110, 500), r };
      const lejosDelCentro = Math.hypot(o.x - 500, o.y - 305) > 110;
      const libre = obstaculos.every((q) => juego.dist(o, q) > o.r + q.r + 40) && juego.players.every((p) => juego.dist(o, p) > o.r + p.r + 30) && juego.dist(o, juego.ball) > o.r + 60;
      if (lejosDelCentro && libre) obstaculos.push(o);
    }
    reloj = 0;
  }

  // Empuja un círculo (balón o jugador) fuera del obstáculo; devuelve la normal si chocó
  function separar(c, o) {
    const dx = c.x - o.x;
    const dy = c.y - o.y;
    const d = Math.hypot(dx, dy);
    const min = c.r + o.r;
    if (d >= min || d === 0) return null;
    const nx = dx / d;
    const ny = dy / d;
    c.x = o.x + nx * min;
    c.y = o.y + ny * min;
    return { nx, ny };
  }

  Mecanicas.registrar({
    nombre: 'obstaculos',
    get obstaculos() { return obstaculos; }, // para depurar desde la consola

    alIniciar(juego) {
      generar(juego);
    },

    alActualizar(dt, juego) {
      reloj += dt;
      if (reloj >= CONFIG.renovarCada) {
        generar(juego);
        juego.toast('¡NUEVOS OBSTÁCULOS!', 900);
      }
      for (const p of juego.players) for (const o of obstaculos) separar(p, o);
    },

    // Rebote del balón: reflexión de la velocidad respecto a la normal (v - (1+e)(v·n)n)
    alColisionBalon(b, juego) {
      for (const o of obstaculos) {
        const n = separar(b, o);
        if (!n) continue;
        const vn = b.vx * n.nx + b.vy * n.ny;
        if (vn < 0) {
          b.vx -= (1 + CONFIG.rebote) * vn * n.nx;
          b.vy -= (1 + CONFIG.rebote) * vn * n.ny;
          juego.sound(300, 0.05, 'square', 0.03);
        }
      }
    },

    alDibujar(ctx) {
      for (const o of obstaculos) {
        ctx.fillStyle = '#07120f66';
        ctx.beginPath();
        ctx.ellipse(o.x + 3, o.y + 6, o.r, o.r * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff8a3d';
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff3';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r * 0.6, 0, Math.PI * 2);
        ctx.stroke();
      }
    },
  });
})();
