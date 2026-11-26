/* ==========================================================================
   BLACKDOT AR EXPERIENCE — showroom publicitario interactivo (A-Frame 1.6 / WebXR)
   --------------------------------------------------------------------------
   Producto protagonista: Linterna BLACKDOT (assets/models/linterna-blackdot.glb).
   Modos:
     1. «Explorar en 3D»   Sin permisos. Ratón/táctil + cursor virtual (raycaster).
     2. «Ver en AR»        WebXR immersive-ar (Chrome en Android con ARCore): detección
                           de superficies (hit-test) para colocar el producto en el
                           mundo real; toque en pantalla = selección (raycaster xrselect).
     3. «Usar la cámara»   Alternativa para navegadores sin WebXR AR (p. ej. Safari iOS):
                           video de la cámara trasera detrás de la escena transparente,
                           cámara virtual guiada por el giroscopio y cursor de mirada
                           (fuse). Es una superposición sin anclaje al espacio real.
   A-Frame (≈1,3 MB) se descarga solo al iniciar la experiencia. La cámara se pide
   únicamente al pulsar «Usar la cámara» o «Ver en AR».
   ========================================================================== */
(function () {
  "use strict";
  var AFRAME_URL = "https://aframe.io/releases/1.6.0/aframe.min.js";
  var MODEL_SCALE_3D = 8, MODEL_SCALE_AR = 3;
  var $ = function (s) { return document.querySelector(s); };

  var PARTS = {
    lente: { mesh: "Lente_Frontal", title: "Lente azul luminosa", text: "Lente frontal con anillos interiores azules emisivos y aro exterior metálico. Pulsa «Encender» para activar el haz de luz." },
    boton: { mesh: "Boton_Encendido", title: "Botón de encendido", text: "Botón frontal con collar metálico, anillo luminoso y el símbolo de energía." },
    orejas: { mesh: "Cabezal_Oreja_Derecha", title: "Cabezal con orejas felinas", text: "El cabezal remata en dos orejas y dos franjas luminosas laterales: guiño de diseño al personaje NOX." },
    emblema: { mesh: "Emblema_Huella_Felina_Mango", title: "Emblema de huella felina", text: "Empuñadura con paneles antideslizantes y el emblema de la huella felina, firma de la marca BLACKDOT." },
    correa: { mesh: "Correa_Banda", title: "Correa de transporte", text: "Correa lateral con hebilla, manguito y pieza azul para llevar la linterna colgada." }
  };

  var state = { loaded: false, loading: null, mode: null, stream: null, lightOn: false, spinning: true, placed: false };
  var ui = {};

  function track(type, data) { if (window.BDStore) window.BDStore.track(type, data); }
  function status(msg, isErr) { ui.status.textContent = msg; ui.status.classList.toggle("is-err", !!isErr); }

  /* ---------- Compatibilidad ---------- */
  function checkSupport() {
    var rows = [];
    var secure = window.isSecureContext;
    rows.push(["Conexión segura (HTTPS)", secure ? "Sí" : "No — la cámara y WebXR requieren HTTPS", secure]);
    var cam = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    rows.push(["Acceso a la cámara", cam ? "Disponible (se pide permiso al usarla)" : "No disponible en este navegador", cam]);
    var xrp = navigator.xr && navigator.xr.isSessionSupported ? navigator.xr.isSessionSupported("immersive-ar").catch(function (e) { console.warn("BLACKDOT AR: comprobación WebXR", e); return false; }) : Promise.resolve(false);
    return xrp.then(function (ar) {
      rows.push(["WebXR AR (immersive-ar)", ar ? "Compatible: puedes colocar el producto en tu espacio" : "No compatible: usa «Usar la cámara» o «Explorar en 3D»", ar]);
      ui.support.innerHTML = rows.map(function (r) { return '<li class="' + (r[2] ? "ok" : "no") + '"><span>' + r[0] + "</span><b>" + r[1] + "</b></li>"; }).join("");
      ui.btnAR.disabled = !(ar && secure);
      ui.btnAR.title = ar ? "Abrir la experiencia en realidad aumentada (WebXR)" : "Tu dispositivo no admite WebXR AR";
      ui.btnCam.disabled = !(cam && secure);
      if (ar && secure) (window.requestIdleCallback || setTimeout)(function () { start("3d"); }, 1200);
      return { ar: ar, cam: cam, secure: secure };
    });
  }

  /* ---------- Carga diferida de A-Frame y de la escena ---------- */
  function loadAFrame() {
    if (window.AFRAME) return Promise.resolve();
    if (state.loading) return state.loading;
    state.loading = new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = AFRAME_URL; s.async = true;
      s.onload = function () { res(); };
      s.onerror = function () { state.loading = null; rej(new Error("No se pudo descargar A-Frame desde " + AFRAME_URL)); };
      document.head.appendChild(s);
    });
    return state.loading;
  }

  function registerComponents() {
    var AF = window.AFRAME, THREE = AF.THREE;
    if (AF.components["bd-product"]) return;

    /* Ajusta materiales, sombras y escala del producto; expone sus piezas por nombre */
    AF.registerComponent("bd-product", {
      init: function () {
        var el = this.el;
        el.addEventListener("model-loaded", function () {
          var obj = el.getObject3D("mesh"); el.emissives = [];
          obj.traverse(function (o) {
            if (!o.isMesh) return;
            o.castShadow = true;
            var m = o.material;
            if (m && m.emissive && (m.emissive.r + m.emissive.g + m.emissive.b) > 0) { el.emissives.push({ m: m, base: m.emissiveIntensity }); m.emissiveIntensity = m.emissiveIntensity * 0.25; }
          });
          el.emit("bd-ready");
        });
        el.addEventListener("model-error", function (e) { console.error("BLACKDOT AR: error al cargar el modelo", e.detail); status("No se pudo cargar el modelo 3D de la linterna. Revisa tu conexión y recarga la página.", true); });
      }
    });

    /* Punto interactivo anclado a una pieza del modelo */
    AF.registerComponent("bd-hotspot", {
      schema: { part: { type: "string" } },
      init: function () {
        var el = this.el, data = this.data, product = document.getElementById("bd-product");
        var place = function () {
          var mesh = null, info = PARTS[data.part];
          product.getObject3D("mesh").traverse(function (o) { if (!mesh && o.name === info.mesh) mesh = o; });
          if (!mesh) { console.warn("BLACKDOT AR: no se encontró la pieza", info.mesh); return; }
          el.object3D.parent.updateMatrixWorld(true); /* matrices al día antes de medir la pieza */
          var box = new THREE.Box3().setFromObject(mesh), c = box.getCenter(new THREE.Vector3());
          el.object3D.parent.worldToLocal(c);
          var dir = new THREE.Vector3(c.x, 0, c.z); if (dir.lengthSq() < 1e-6) dir.set(0, 0, 1); dir.normalize();
          el.object3D.position.copy(c).addScaledVector(dir, 0.014);
          el.setAttribute("visible", true);
        };
        product.addEventListener("bd-ready", place);
        el.addEventListener("mouseenter", function () { el.setAttribute("scale", "1.5 1.5 1.5"); });
        el.addEventListener("mouseleave", function () { el.setAttribute("scale", "1 1 1"); });
        el.addEventListener("click", function () { showPart(data.part); });
      }
    });

    /* Botón 3D de la escena */
    AF.registerComponent("bd-button", {
      schema: { action: { type: "string" } },
      init: function () {
        var el = this.el, action = this.data.action;
        el.addEventListener("mouseenter", function () { el.setAttribute("material", "color", "#0E6BA8"); });
        el.addEventListener("mouseleave", function () { el.setAttribute("material", "color", "#0B1626"); });
        el.addEventListener("click", function () { doAction(action); });
      }
    });
  }

  function sceneMarkup() {
    var tpl = document.getElementById("ar-scene-tpl");
    ui.stage.insertAdjacentHTML("beforeend", tpl.innerHTML);
    return ui.stage.querySelector("a-scene");
  }

  function start(mode) {
    status("Cargando A-Frame y el showroom…");
    ui.overlay.classList.add("is-loading");
    return loadAFrame().then(function () {
      registerComponents();
      if (!state.loaded) {
        var scene = sceneMarkup();
        state.scene = scene;
        return new Promise(function (res) {
          var ready = function () {
            state.loaded = true;
            scene.addEventListener("enter-vr", onEnterXR);
            scene.addEventListener("exit-vr", onExitXR);
            res();
          };
          if (scene.hasLoaded) ready(); else scene.addEventListener("loaded", ready, { once: true });
          scene.addEventListener("wheel", function (e) {
            var cam = document.getElementById("bd-camera").object3D, dir = new window.AFRAME.THREE.Vector3();
            cam.getWorldDirection(dir);
            var next = cam.position.clone().addScaledVector(dir, e.deltaY > 0 ? 0.25 : -0.25);
            if (next.length() < 7 && next.distanceTo(new window.AFRAME.THREE.Vector3(0, 1.2, 0)) > 0.45) cam.position.copy(next);
            e.preventDefault();
          }, { passive: false });
          applyTheme();
        });
      }
    }).then(function () {
      ui.overlay.classList.remove("is-loading");
      ui.overlay.hidden = true;
      ui.shell.classList.add("is-live");
      setMode(mode);
    }).catch(function (err) {
      console.error("BLACKDOT AR:", err);
      ui.overlay.classList.remove("is-loading");
      status("No se pudo iniciar la experiencia: " + err.message + ". Revisa tu conexión e inténtalo de nuevo.", true);
    });
  }

  /* ---------- Modos ---------- */
  function setMode(mode) {
    stopCamera();
    state.mode = mode;
    var scene = state.scene, env = document.getElementById("bd-environment"), gaze = document.getElementById("bd-gaze");
    ui.shell.classList.toggle("is-camera", mode === "camera");
    env.setAttribute("visible", mode !== "camera");
    scene.setAttribute("cursor", "rayOrigin: " + (mode === "camera" ? "entity" : "mouse") + "; fuse: false");
    gaze.setAttribute("cursor", "fuse: " + (mode === "camera") + "; fuseTimeout: 1300");
    gaze.setAttribute("raycaster", "objects: .bd-click; far: 30; enabled: " + (mode === "camera"));
    document.getElementById("bd-product-root").setAttribute("scale", "1 1 1");
    track("ar-session", { mode: mode });
    if (mode === "3d") status("Modo 3D: arrastra para mirar alrededor, usa la rueda o pellizca para acercarte y haz clic en los puntos azules o en los botones de la escena.");
    if (mode === "camera") startCamera();
    syncButtons();
  }

  function startCamera() {
    if (!window.isSecureContext) { status("La cámara necesita HTTPS. Abre el sitio publicado en https://…", true); return; }
    status("Solicitando permiso para usar la cámara…");
    var askMotion = state.motionPerm || Promise.resolve("granted");
    state.motionPerm = null;
    askMotion.then(function (motion) {
      return navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false }).then(function (stream) {
        state.stream = stream;
        ui.video.srcObject = stream; ui.video.hidden = false;
        var p = ui.video.play(); if (p && p.catch) p.catch(function (e) { console.warn("BLACKDOT AR: video de cámara", e); });
        status("Cámara activa: mueve el teléfono para mirar alrededor y mantén el anillo central sobre un punto o botón para seleccionarlo." + (motion === "denied" ? " (Sin permiso de movimiento: arrastra para girar.)" : ""));
      });
    }).catch(function (err) {
      console.error("BLACKDOT AR: cámara", err);
      var msg = err && err.name === "NotAllowedError" ? "Permiso de cámara denegado. Actívalo en la configuración del navegador o usa «Explorar en 3D»." :
        err && err.name === "NotFoundError" ? "No se encontró ninguna cámara en este dispositivo." : "No se pudo abrir la cámara (" + (err && err.message) + ").";
      status(msg, true);
      setMode("3d");
    });
  }
  function stopCamera() {
    if (state.stream) { state.stream.getTracks().forEach(function (t) { t.stop(); }); state.stream = null; }
    if (ui.video) { ui.video.srcObject = null; ui.video.hidden = true; }
  }

  function enterAR() {
    if (!state.loaded) {
      start("3d").then(function () { if (state.loaded) status("Showroom listo. Pulsa otra vez «Ver en AR» para abrir la realidad aumentada."); });
      return;
    }
    Promise.resolve().then(function () {
      var scene = state.scene;
      if (!scene || !scene.enterAR) { status("Este navegador no permite iniciar WebXR AR.", true); return; }
      status("Abriendo la realidad aumentada… Apunta al suelo o a una mesa y toca la pantalla para colocar la linterna.");
      var r = scene.enterAR(); if (r && r.catch) r.catch(function (err) { console.error("BLACKDOT AR: WebXR", err); status("No se pudo iniciar la sesión WebXR AR: " + err.message, true); });
    });
  }
  function onEnterXR() {
    if (!state.scene.is("ar-mode")) return;
    state.mode = "webxr"; track("ar-session", { mode: "webxr" });
    var root = document.getElementById("bd-product-root");
    root.setAttribute("scale", (MODEL_SCALE_AR / MODEL_SCALE_3D) + " " + (MODEL_SCALE_AR / MODEL_SCALE_3D) + " " + (MODEL_SCALE_AR / MODEL_SCALE_3D));
    state.scene.setAttribute("cursor", "rayOrigin: xrselect; fuse: false");
    ui.shell.classList.add("is-xr");
  }
  function onExitXR() {
    ui.shell.classList.remove("is-xr");
    if (state.mode === "webxr") setMode("3d");
  }

  function applyTheme() {
    var light = document.documentElement.getAttribute("data-theme") === "light";
    var sky = document.getElementById("bd-sky"), floor = document.getElementById("bd-floor"), label = document.getElementById("bd-label");
    if (sky) sky.setAttribute("color", light ? "#DCE6EE" : "#050B14");
    if (floor) floor.setAttribute("material", "color", light ? "#C9D5E0" : "#0A1320");
    if (label) label.setAttribute("color", light ? "#06121F" : "#FFFFFF");
  }
  document.addEventListener("themechange", applyTheme);

  /* ---------- Interacciones ---------- */
  function showPart(key) {
    var p = PARTS[key]; if (!p) return;
    ui.partTitle.textContent = p.title; ui.partText.textContent = p.text;
    ui.part.hidden = false;
    var label = document.getElementById("bd-label");
    label.setAttribute("value", p.title);
    track("ar-interaction", { part: key });
    ui.count.textContent = String(Number(ui.count.textContent || 0) + 1);
  }
  function doAction(action) {
    var product = document.getElementById("bd-product"), spot = document.getElementById("bd-beam-light"), beam = document.getElementById("bd-beam");
    if (action === "light") {
      state.lightOn = !state.lightOn;
      (product.emissives || []).forEach(function (e) { e.m.emissiveIntensity = state.lightOn ? e.base : e.base * 0.25; });
      spot.setAttribute("light", "intensity", state.lightOn ? 3 : 0);
      beam.setAttribute("visible", state.lightOn);
      document.getElementById("bd-btn-light-text").setAttribute("value", state.lightOn ? "APAGAR" : "ENCENDER");
      track("ar-interaction", { part: state.lightOn ? "encender" : "apagar" });
    } else if (action === "spin") {
      state.spinning = !state.spinning;
      product.setAttribute("animation__spin", "enabled", state.spinning);
      document.getElementById("bd-btn-spin-text").setAttribute("value", state.spinning ? "DETENER" : "GIRAR");
      track("ar-interaction", { part: "girar" });
    } else if (action === "reset") {
      var rig = document.getElementById("bd-rig"), cam = document.getElementById("bd-camera");
      rig.setAttribute("position", "0 0 0"); cam.setAttribute("position", "0 1.28 1.75");
      var lc = cam.components["look-controls"]; if (lc) { lc.pitchObject.rotation.x = -0.1; lc.yawObject.rotation.y = 0; }
      ui.part.hidden = true;
      track("ar-interaction", { part: "reiniciar" });
    }
    syncButtons();
  }
  function syncButtons() {
    [["3d", ui.btn3d], ["camera", ui.btnCam]].forEach(function (b) { b[1].setAttribute("aria-pressed", state.mode === b[0] ? "true" : "false"); });
    ui.btnLight.setAttribute("aria-pressed", state.lightOn ? "true" : "false");
    ui.btnLight.textContent = state.lightOn ? "Apagar linterna" : "Encender linterna";
    ui.btnSpin.textContent = state.spinning ? "Detener giro" : "Girar producto";
  }

  function init() {
    ui = {
      shell: $("#ar-shell"), stage: $("#ar-stage"), overlay: $("#ar-overlay"), video: $("#ar-video"), status: $("#ar-status"), support: $("#ar-support"),
      btnStart: $("#ar-start"), btn3d: $("#ar-mode-3d"), btnAR: $("#ar-mode-ar"), btnCam: $("#ar-mode-cam"), btnLight: $("#ar-light"), btnSpin: $("#ar-spin"), btnReset: $("#ar-reset"),
      part: $("#ar-part"), partTitle: $("#ar-part-title"), partText: $("#ar-part-text"), count: $("#ar-count"), full: $("#ar-full")
    };
    if (!ui.shell) return;
    checkSupport();
    ui.btnStart.addEventListener("click", function () { start("3d"); });
    ui.btn3d.addEventListener("click", function () { start("3d"); });
    ui.btnCam.addEventListener("click", function () {
      /* iOS solo concede el permiso de movimiento dentro del gesto del usuario */
      state.motionPerm = (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === "function")
        ? DeviceOrientationEvent.requestPermission().catch(function (e) { console.warn("BLACKDOT AR: permiso de movimiento", e); return "denied"; })
        : Promise.resolve("granted");
      start("camera");
    });
    ui.btnAR.addEventListener("click", enterAR);
    ui.btnLight.addEventListener("click", function () { if (state.loaded) doAction("light"); });
    ui.btnSpin.addEventListener("click", function () { if (state.loaded) doAction("spin"); });
    ui.btnReset.addEventListener("click", function () { if (state.loaded) doAction("reset"); });
    ui.full.addEventListener("click", function () {
      if (document.fullscreenElement) { document.exitFullscreen(); return; }
      var r = ui.shell.requestFullscreen ? ui.shell.requestFullscreen() : null;
      if (r && r.catch) r.catch(function (e) { console.warn("BLACKDOT AR: pantalla completa", e); status("Tu navegador no permitió la pantalla completa.", true); });
      else if (!r) ui.shell.classList.toggle("is-pseudo-full");
    });
    document.querySelectorAll("[data-part]").forEach(function (b) { b.addEventListener("click", function () { if (state.loaded) showPart(b.getAttribute("data-part")); else start("3d").then(function () { showPart(b.getAttribute("data-part")); }); }); });
    addEventListener("pagehide", stopCamera);
    document.addEventListener("visibilitychange", function () { if (document.hidden && state.mode === "camera") { stopCamera(); setMode("3d"); status("La cámara se apagó al salir de la pestaña. Pulsa «Usar la cámara» para volver a activarla."); } });
    window.BLACKDOT_AR = { start: start, setMode: setMode, doAction: doAction, showPart: showPart, state: state, PARTS: PARTS };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
