/* ==========================================================================
   MECÁNICA SORPRESA · MODALIDAD "GOL GANA"
   CONFIG.modo = 'siempre'  → el primer gol del partido gana.
   CONFIG.modo = 'empate'   → si el tiempo se acaba empatado, el partido sigue
                              en muerte súbita hasta el siguiente gol.
   Activar: en futbol.html, después de js/futbol.js →
            <script src="live-coding/gol-gana.js"></script>
   ========================================================================== */
(() => {
  'use strict';
  const { Mecanicas } = window.Futbol;

  const CONFIG = { modo: 'empate' }; // 'siempre' | 'empate'
  let golGana = false;

  Mecanicas.registrar({
    nombre: 'gol-gana',

    alIniciar(juego) {
      golGana = CONFIG.modo === 'siempre';
      if (golGana) juego.toast('¡GOL GANA!', 1400);
    },

    // Devolver false impide que el partido termine al llegar el reloj a 0
    alTerminarTiempo(juego) {
      if (CONFIG.modo !== 'empate' || juego.score[0] !== juego.score[1]) return true;
      if (!golGana) {
        golGana = true;
        juego.toast('¡MUERTE SÚBITA · GOL GANA!', 1800);
      }
      return false;
    },

    // El gol ya está en el marcador: bajar el límite hace que el juego cierre
    // el partido después de la celebración (rama GOAL del Game Loop).
    despuesDeGol(lado, juego) {
      if (golGana) juego.goalLimit = Math.max(...juego.score);
    },

    alDibujarHUD(ctx) {
      if (!golGana) return;
      ctx.fillStyle = '#ff5b55';
      ctx.fillRect(420, 14, 160, 30);
      ctx.fillStyle = '#fff';
      ctx.font = '900 18px Impact, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GOL GANA', 500, 36);
    },
  });
})();
