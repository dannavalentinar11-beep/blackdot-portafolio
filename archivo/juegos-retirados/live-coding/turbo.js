/* ==========================================================================
   MECÁNICA SORPRESA · TURBO CON BARRA DE ENERGÍA
   Jugador 1: Shift izquierdo · Jugador 2: Shift derecho (o Ctrl derecho)
   Mientras se mantiene la tecla el jugador corre más rápido y gasta energía;
   al soltarla la barra se recarga poco a poco.
   Activar: en futbol.html, después de js/futbol.js →
            <script src="live-coding/turbo.js"></script>
   ========================================================================== */
(() => {
  'use strict';
  const { Mecanicas } = window.Futbol;

  const CONFIG = {
    multiplicador: 1.6, // velocidad extra con turbo (1 = normal)
    gasto: 0.55, // energía por segundo usando turbo (la barra va de 0 a 1)
    recarga: 0.22, // energía recuperada por segundo sin turbo
    minimoParaActivar: 0.15, // evita encender/apagar con la barra vacía
  };
  const TECLAS = [['ShiftLeft'], ['ShiftRight', 'ControlRight']];
  const energia = [1, 1];
  const activo = [false, false];

  // El jugador controlado por cada equipo: J1 = índice 0, J2 (o CPU) = índice 3
  const controlado = (juego, equipo) => juego.players[equipo === 0 ? 0 : 3];

  function dibujarBarra(ctx, x, y, valor, color, texto) {
    ctx.fillStyle = '#06100dcc';
    ctx.fillRect(x - 6, y - 16, 192, 34);
    ctx.fillStyle = '#ffffff22';
    ctx.fillRect(x, y, 180, 10);
    ctx.fillStyle = valor < CONFIG.minimoParaActivar ? '#ff6b61' : color;
    ctx.fillRect(x, y, 180 * valor, 10);
    ctx.fillStyle = '#f5f7ed';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${texto} ${Math.round(valor * 100)}%`, x, y - 4);
  }

  Mecanicas.registrar({
    nombre: 'turbo',

    alIniciar() {
      energia[0] = energia[1] = 1;
      activo[0] = activo[1] = false;
    },

    alActualizar(dt, juego) {
      for (let eq = 0; eq < 2; eq++) {
        const humano = eq === 0 || juego.mode === 'two';
        const pulsado = humano && TECLAS[eq].some((k) => juego.codes[k]);
        const umbral = activo[eq] ? 0 : CONFIG.minimoParaActivar;
        activo[eq] = pulsado && energia[eq] > umbral;
        const cambio = activo[eq] ? -CONFIG.gasto : CONFIG.recarga;
        energia[eq] = juego.clamp(energia[eq] + cambio * dt, 0, 1);
      }
    },

    // Multiplica la velocidad solo del jugador que tiene el turbo encendido
    velocidadJugador(p, juego) {
      return activo[p.team] && p === controlado(juego, p.team) ? CONFIG.multiplicador : 1;
    },

    // Estela detrás del jugador con turbo (debajo de los jugadores)
    alDibujar(ctx, juego) {
      for (let eq = 0; eq < 2; eq++) {
        if (!activo[eq]) continue;
        const p = controlado(juego, eq);
        ctx.fillStyle = eq === 0 ? '#58b9ed55' : '#ff6b6155';
        for (let k = 1; k <= 3; k++) {
          ctx.beginPath();
          ctx.arc(p.x - p.vx * 0.04 * k, p.y - p.vy * 0.04 * k, 16 - k * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },

    alDibujarHUD(ctx, juego) {
      dibujarBarra(ctx, 96, 28, energia[0], '#58b9ed', 'TURBO J1 (SHIFT IZQ)');
      if (juego.mode === 'two') dibujarBarra(ctx, 724, 28, energia[1], '#ff6b61', 'TURBO J2 (SHIFT DER)');
    },
  });
})();
