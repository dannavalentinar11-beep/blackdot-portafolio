/* ==========================================================================
   MECÁNICA SORPRESA · VIENTO QUE DESVÍA EL BALÓN
   Cada cierto tiempo cambia la dirección y fuerza del viento. El viento es
   una aceleración constante (px/s²) que se suma a la velocidad del balón
   mientras rueda: v = v + a · dt.
   Activar: en futbol.html, después de js/futbol.js →
            <script src="live-coding/viento.js"></script>
   ========================================================================== */
(() => {
  'use strict';
  const { Mecanicas } = window.Futbol;

  const CONFIG = {
    fuerzaMax: 160, // aceleración máxima en px/s²
    cambioCada: 8, // segundos entre cambios de viento
    suavizado: 1.5, // qué tan rápido pasa al nuevo viento (mayor = más rápido)
    velocidadMinima: 25, // no empuja un balón quieto (saque del centro)
  };
  const viento = { x: 0, y: 0 };
  const objetivo = { x: 0, y: 0 };
  let reloj = 0;
  let rafagas = [];

  function nuevoViento() {
    const ang = Math.random() * Math.PI * 2;
    const fuerza = CONFIG.fuerzaMax * (0.35 + Math.random() * 0.65);
    objetivo.x = Math.cos(ang) * fuerza;
    objetivo.y = Math.sin(ang) * fuerza;
    reloj = 0;
  }

  Mecanicas.registrar({
    nombre: 'viento',

    alIniciar(juego) {
      viento.x = viento.y = 0;
      rafagas = Array.from({ length: 18 }, () => ({ x: Math.random() * 1000, y: 80 + Math.random() * 450, l: 20 + Math.random() * 30 }));
      nuevoViento();
      juego.toast('¡HAY VIENTO!', 1200);
    },

    alActualizar(dt) {
      reloj += dt;
      if (reloj >= CONFIG.cambioCada) nuevoViento();
      const k = Math.min(1, CONFIG.suavizado * dt);
      viento.x += (objetivo.x - viento.x) * k;
      viento.y += (objetivo.y - viento.y) * k;
      for (const r of rafagas) {
        r.x += viento.x * dt * 1.6;
        r.y += viento.y * dt * 1.6;
        if (r.x > 1000) r.x -= 1000;
        if (r.x < 0) r.x += 1000;
        if (r.y > 540) r.y = 80;
        if (r.y < 80) r.y = 540;
      }
    },

    // Física: el viento acelera el balón (antes de integrar su posición)
    alMoverBalon(dt, juego) {
      const b = juego.ball;
      if (Math.hypot(b.vx, b.vy) < CONFIG.velocidadMinima) return;
      b.vx += viento.x * dt;
      b.vy += viento.y * dt;
    },

    alDibujar(ctx) {
      const f = Math.hypot(viento.x, viento.y);
      if (f < 1) return;
      ctx.strokeStyle = '#ffffff30';
      ctx.lineWidth = 2;
      for (const r of rafagas) {
        ctx.beginPath();
        ctx.moveTo(r.x, r.y);
        ctx.lineTo(r.x - (viento.x / f) * r.l, r.y - (viento.y / f) * r.l);
        ctx.stroke();
      }
    },

    // Indicador: flecha con dirección y fuerza
    alDibujarHUD(ctx) {
      const f = Math.hypot(viento.x, viento.y);
      const cx = 500, cy = 32;
      ctx.fillStyle = '#06100dcc';
      ctx.fillRect(cx - 95, cy - 20, 190, 40);
      ctx.save();
      ctx.translate(cx - 55, cy);
      ctx.rotate(Math.atan2(viento.y, viento.x));
      ctx.strokeStyle = '#ffd166';
      ctx.fillStyle = '#ffd166';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(10, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(6, -7);
      ctx.lineTo(6, 7);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#f5f7ed';
      ctx.font = '12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`VIENTO ${Math.round((f / CONFIG.fuerzaMax) * 100)}%`, cx - 30, cy + 4);
    },
  });
})();
