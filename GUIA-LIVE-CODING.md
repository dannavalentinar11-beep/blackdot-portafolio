# Guía para el live coding — Atari Football 2D

Prueba presencial: **1 hora** para programar una mecánica sorpresa en `futbol.html` sin romper los 60 FPS.

En esta carpeta hay cuatro mecánicas **ya probadas** (turbo, viento, obstáculos y gol gana). Sirven como referencia y como plan B. En el examen lo ideal es que la escribas tú; esta guía te da el plan, el código mínimo de cada una y lo que debes explicar.

---

## 1. Cómo está organizado el juego

Todo el código del juego está en `js/futbol.js`, dividido en 9 bloques numerados:

| Bloque | Qué contiene | Funciones clave |
|---|---|---|
| 1 | Configuración, estado, LocalStorage | `FIELD`, `loadStats()`, `save()`, `speedFactor()` |
| 2 | **Sistema de mecánicas** (ganchos) | `Mecanicas.registrar()`, `Mecanicas.emitir()`, `Mecanicas.factor()` |
| 3 | Menús e interfaz | `chooseStart()`, `statsScreen()`, `instructions()` |
| 4 | Entrada (teclado y táctil) | `keys`, `codes`, `readInput()` |
| 5 | Jugadores, IA y porteros | `movePlayer()`, `aiUpdate()`, `keeperUpdate()`, `kick()` |
| 6 | Física y colisiones | `collidePlayers()`, `collideBallPlayers()`, `collidePost()`, `collideField()`, `updateBall()` |
| 7 | Goles y estadísticas | `scoreGoal()`, `finish()` |
| 8 | **Game Loop** | `loop()`, `update()`, `togglePause()`, `startGame()` |
| 9 | Render en Canvas | `draw()`, `drawField()`, `drawPlayer()`, `drawBall()` |

### El Game Loop en una frase

`requestAnimationFrame(loop)` llama a `loop(now)` ~60 veces por segundo. `loop` calcula `dt` (segundos desde el frame anterior, máximo 0,033), llama a `update(dt)` (entrada → IA → física → goles) y después a `draw()`. Como todo se multiplica por `dt`, el juego va a la misma velocidad en pantallas de 60 Hz o de 144 Hz.

### Los ganchos (dónde se enchufa una mecánica nueva)

Una mecánica es un objeto con funciones opcionales. El juego las llama en momentos fijos:

| Gancho | Cuándo se llama | Para qué sirve |
|---|---|---|
| `alIniciar(juego)` | Al empezar o reiniciar el partido | Reiniciar variables de la mecánica |
| `alActualizar(dt, juego)` | Cada frame, después de mover jugadores | Temporizadores, energía, lógica |
| `alMoverBalon(dt, juego)` | Cada frame, antes de mover el balón | Fuerzas sobre el balón (viento) |
| `alColisionBalon(balon, juego)` | En cada sub-paso de la física | Colisiones nuevas (obstáculos) |
| `velocidadJugador(p, juego)` | Al mover cada jugador | Devuelve un multiplicador (turbo) |
| `alChutar(p, juego)` | Al chutar | Devuelve un multiplicador de potencia |
| `alGol(lado, juego)` | Antes de sumar un gol | `return false` anula el gol |
| `despuesDeGol(lado, juego)` | Gol ya sumado | Reglas como gol gana |
| `alTerminarTiempo(juego)` | Reloj en 0 | `return false` evita terminar |
| `alDibujar(ctx, juego)` | Después de la cancha | Dibujar en el césped |
| `alDibujarHUD(ctx, juego)` | Encima de todo | Barras, textos, indicadores |
| `alTecla(tecla, presionada, juego)` | Al pulsar o soltar | Acciones de una sola pulsación |

El objeto `juego` da acceso a: `ball`, `players` (0 = J1, 3 = J2/CPU, 6 y 7 = porteros), `score`, `state`, `mode` (`'ai'` o `'two'`), `keys` (por `e.key`: `'w'`, `'arrowup'`, `' '`), `codes` (por `e.code`: `'ShiftLeft'`), `timeLeft`, `goalLimit`, `FIELD`, `clamp`, `rand`, `dist`, `toast(texto)`, `sound()`, `finish()`.

### Plantilla para empezar (cópiala en un archivo nuevo)

```html
<!-- en futbol.html, debajo de <script src="js/futbol.js"></script> -->
<script src="live-coding/mi-mecanica.js"></script>
```

```js
(() => {
  'use strict';
  const { Mecanicas } = window.Futbol;
  const CONFIG = { /* números ajustables */ };

  Mecanicas.registrar({
    nombre: 'mi-mecanica',
    alIniciar(juego) { },
    alActualizar(dt, juego) { },
    alDibujarHUD(ctx, juego) { },
  });
})();
```

> Ventaja para explicar: **no se toca el motor**. Si la mecánica falla, se comenta una línea y el juego vuelve a funcionar.
>
> Si el profesor pide modificar `futbol.js` directamente, los mismos fragmentos se pegan en las funciones del motor que aparecen entre paréntesis en cada sección.

---

## 2. Plan para la hora del examen

| Minuto | Qué hacer |
|---|---|
| 0–5 | Leer el enunciado. Decidir qué gancho usar (tabla de arriba). Abrir `futbol.html` con Live Server y la consola (F12). |
| 5–10 | Crear el archivo con la plantilla y cargarlo en `futbol.html`. Comprobar con `console.log` que se llama. |
| 10–35 | Programar la lógica mínima que funcione (la versión corta de abajo). |
| 35–45 | Dibujar el HUD o el indicador visual. |
| 45–52 | Probar: modo CPU, modo 2 jugadores, pausa (ESC), reinicio (R), gol, fin de partido. Pulsar **F** para ver los FPS. |
| 52–60 | Ajustar números de `CONFIG`, limpiar `console.log` y preparar la explicación. |

**Reglas de oro para no perder puntos**

1. Nunca crees otro `requestAnimationFrame`. Usa los ganchos o el `loop` existente.
2. Todo lo que se mueve se multiplica por `dt`.
3. Nada de `setInterval` para la física; para temporizadores usa un acumulador: `reloj += dt; if (reloj >= 8) {...}`.
4. Reinicia tus variables en `alIniciar` (el botón **R** y la revancha deben funcionar).
5. Prueba con la consola abierta: cero errores en rojo.

---

## 3. Las cuatro mecánicas paso a paso

### 3.1 Turbo con barra de energía (`turbo.js`)

**Idea:** mientras se mantiene Shift, el jugador corre 1,6 veces más rápido y gasta energía. Sin Shift, la barra se recarga.

**Versión mínima (unas 15 líneas):**

```js
let energia = 1, activo = false;
Mecanicas.registrar({
  alIniciar() { energia = 1; },
  alActualizar(dt, juego) {
    activo = juego.codes.ShiftLeft && energia > 0;
    energia = juego.clamp(energia + (activo ? -0.55 : 0.22) * dt, 0, 1);
  },
  velocidadJugador(p, juego) { return activo && p === juego.players[0] ? 1.6 : 1; },
  alDibujarHUD(ctx) {
    ctx.fillStyle = '#ffffff33'; ctx.fillRect(96, 28, 180, 10);
    ctx.fillStyle = '#58b9ed';   ctx.fillRect(96, 28, 180 * energia, 10);
  },
});
```

**Si se pide dentro del motor:** en `movePlayer()` multiplica `speed` por 1,6 si el turbo está activo; la energía se actualiza en `update(dt)` y la barra se dibuja al final de `draw()`.

**Qué explicar:** la energía es una variable entre 0 y 1; cambia con `dt`, así que gasta lo mismo a cualquier tasa de FPS. El umbral `minimoParaActivar` evita que el turbo parpadee con la barra vacía.

### 3.2 Viento que cambia la trayectoria (`viento.js`)

**Idea:** el viento es una aceleración (px/s²). En cada frame: `ball.vx += viento.x * dt`.

**Versión mínima:**

```js
const viento = { x: 0, y: 0 }; let reloj = 0;
function nuevo() { const a = Math.random() * Math.PI * 2, f = 60 + Math.random() * 100;
  viento.x = Math.cos(a) * f; viento.y = Math.sin(a) * f; reloj = 0; }
Mecanicas.registrar({
  alIniciar: nuevo,
  alActualizar(dt) { reloj += dt; if (reloj > 8) nuevo(); },
  alMoverBalon(dt, juego) { juego.ball.vx += viento.x * dt; juego.ball.vy += viento.y * dt; },
  alDibujarHUD(ctx) { ctx.fillStyle = '#fff'; ctx.font = '14px monospace';
    ctx.fillText(`VIENTO ${Math.round(Math.hypot(viento.x, viento.y))}`, 460, 40); },
});
```

**Si se pide dentro del motor:** las dos líneas `ball.vx += ...` van al inicio de `updateBall(dt)`.

**Qué explicar:** física de Euler (la velocidad cambia con la aceleración por `dt`). El rozamiento existente (`0.988`) sigue actuando, así que el balón no acelera sin límite. La versión completa no empuja un balón quieto, para que el saque desde el centro sea justo.

### 3.3 Obstáculos aleatorios (`obstaculos.js`)

**Idea:** círculos en posiciones aleatorias. El balón rebota (colisión círculo–círculo) y los jugadores no pueden atravesarlos.

**Fórmulas que debes saber:**

- Hay colisión si `distancia(balón, obstáculo) < r_balón + r_obstáculo`.
- Normal: `n = (balón − obstáculo) / distancia`.
- Se saca el balón hasta el borde: `balón = obstáculo + n · (r1 + r2)`.
- Rebote: `v = v − (1 + e)(v·n) n` (con `e` entre 0 y 1 para la restitución). Es la misma fórmula de `collidePost()` en el motor.

**Versión mínima:**

```js
let obs = [];
Mecanicas.registrar({
  alIniciar(juego) {
    obs = [];
    for (let i = 0; i < 4; i++) obs.push({ x: juego.rand(250, 750), y: juego.rand(120, 490), r: 20 });
  },
  alColisionBalon(b) {
    for (const o of obs) {
      const dx = b.x - o.x, dy = b.y - o.y, d = Math.hypot(dx, dy), min = b.r + o.r;
      if (d === 0 || d >= min) continue;
      const nx = dx / d, ny = dy / d;
      b.x = o.x + nx * min; b.y = o.y + ny * min;
      const vn = b.vx * nx + b.vy * ny;
      if (vn < 0) { b.vx -= 1.8 * vn * nx; b.vy -= 1.8 * vn * ny; }
    }
  },
  alDibujar(ctx) { ctx.fillStyle = '#ff8a3d';
    for (const o of obs) { ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.fill(); } },
});
```

**Si se pide dentro del motor:** el bucle de colisión va dentro de `updateBall()`, en el `for` de sub-pasos, justo antes de `collideField()`. Así un balón rápido no los atraviesa.

**Qué explicar:** por qué la colisión va en los sub-pasos (anti-túnel). La versión completa evita el círculo central y los jugadores al generar, y renueva los obstáculos cada 15 s.

### 3.4 Modalidad "Gol Gana" (`gol-gana.js`)

Pueden pedir dos variantes:

- **Primer gol gana:** en `despuesDeGol` pon `juego.goalLimit = 1` (o el marcador actual). El motor ya termina el partido cuando se alcanza el límite, después de la celebración.
- **Muerte súbita si hay empate al final:** en `alTerminarTiempo` devuelve `false` si `score[0] === score[1]` (el partido sigue) y activa la bandera `golGana`.

**Versión mínima (primer gol gana):**

```js
Mecanicas.registrar({
  alIniciar(juego) { juego.toast('¡GOL GANA!'); },
  despuesDeGol(lado, juego) { juego.goalLimit = Math.max(...juego.score); },
});
```

**Si se pide dentro del motor:** en `scoreGoal()`, después de `score[side]++`, añade `goalTimer = 0.9; goalLimit = score[side];`. En `update()`, la condición `if (timeLeft <= 0)` se cambia por `if (timeLeft <= 0 && score[0] !== score[1])`.

**Qué explicar:** no se llama a `finish()` en mitad de la física. Se reutiliza el estado `GOAL` del Game Loop, que ya celebra el gol y termina el partido, así que se guardan las estadísticas en LocalStorage como en cualquier partido.

---

## 4. Otras mecánicas que podrían pedir (y qué gancho usar)

| Pedido | Gancho | Idea en una línea |
|---|---|---|
| Balón más grande o más pequeño | `alIniciar` | `juego.ball.r = 18` (ojo: `resetPositions` lo recrea; usa también `despuesDeGol`). |
| Supertiro cada 10 s | `alChutar` | `return listo ? 1.8 : 1`. |
| Portería que se mueve | `alActualizar` | Cambiar `FIELD.goalTop` y `FIELD.goalBottom` con `Math.sin(t)`. |
| Lluvia (cancha resbaladiza) | `velocidadJugador` + `alMoverBalon` | Menos rozamiento: `ball.vx *= 1.004`. |
| Power-up que aparece | `alActualizar` + `alDibujar` | Si `dist(jugador, powerup) < r`, se activa el efecto. |
| Gol doble en el último minuto | `despuesDeGol` | Si `timeLeft < 60`, `juego.score[lado]++`. |
| Congelar al rival 2 s | `velocidadJugador` | `return congelado && p.team === 1 ? 0 : 1`. |

---

## 5. Cómo demostrar que no se rompió el rendimiento

1. Pulsa **F** en el partido: aparece el contador de FPS (verde ≥ 55).
2. DevTools → Performance → grabar 10 s: frames de unos 16,7 ms y sin tareas largas en rojo.
3. Pausa con **ESC**: el bucle se detiene (no hay frames en el panel Performance).
4. Pulsa **R** varias veces: sigue habiendo un solo bucle (el motor cancela el anterior con `cancelAnimationFrame`).

## 6. Respuestas cortas para la sustentación

- **¿Por qué `requestAnimationFrame` y no `setInterval`?** Se sincroniza con el refresco de la pantalla, se pausa en pestañas ocultas y no acumula llamadas.
- **¿Qué es `dt`?** El tiempo real entre frames. Se limita a 33 ms para que, al volver de otra pestaña, el balón no “salte”.
- **¿Cómo detectas el gol?** Cuando el centro del balón pasa la línea de gol más de medio radio y su altura está entre los postes (`goalTop` y `goalBottom`). Los postes son colisionadores circulares y el balón se integra en sub-pasos para que no atraviese nada a alta velocidad.
- **¿Cómo guardas los récords?** `localStorage.setItem('blackdot-football', JSON.stringify(stats))`. Al cargar, cada campo se valida, y si el dato está dañado se usa el valor por defecto.
- **¿Cómo funciona la IA?** El delantero CPU persigue el balón con un retardo de reacción según la dificultad; los defensas se escalonan y los porteros siguen la altura del balón dentro del arco.
