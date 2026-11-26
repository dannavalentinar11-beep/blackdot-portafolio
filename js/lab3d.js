/* ==========================================================================
   BLACKDOT 3D LAB — visor interactivo de personajes (módulo ES, Three.js r160)
   --------------------------------------------------------------------------
   · Nada pesado se descarga al entrar al sitio: Three.js, sus complementos y el
     GLB del personaje se cargan solo cuando la persona pulsa «Ver en 3D».
   · Un único WebGLRenderer reutilizable; al cambiar de personaje se libera de la
     GPU el modelo anterior (geometrías, materiales y texturas).
   · El renderizado se suspende cuando el visor no está en pantalla o la pestaña
     está oculta.
   · Los personajes y sus animaciones se describen en js/lab3d-characters.js.
   ========================================================================== */
import { LAB_CHARACTERS, LAB_SETTINGS } from "./lab3d-characters.js";

const $ = (s, c = document) => c.querySelector(s);
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarse = window.matchMedia("(pointer: coarse)").matches;
const fmt1 = (n) => n.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtInt = (n) => n.toLocaleString("es-CO");
const getTheme = () => (document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");

/* ---------------- Carga diferida de librerías ---------------- */
let libsPromise = null;
function loadLibs() {
  if (!libsPromise) {
    libsPromise = Promise.all([
      import("three"),
      import("three/addons/loaders/GLTFLoader.js"),
      import("three/addons/loaders/DRACOLoader.js"),
      import("three/addons/controls/OrbitControls.js"),
      import("three/addons/environments/RoomEnvironment.js")
    ]).then(([THREE, g, d, o, r]) => ({ THREE, GLTFLoader: g.GLTFLoader, DRACOLoader: d.DRACOLoader, OrbitControls: o.OrbitControls, RoomEnvironment: r.RoomEnvironment }));
    libsPromise.catch(() => { libsPromise = null; });
  }
  return libsPromise;
}

function hasWebGL() {
  try { const c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl"))); } catch (e) { return false; }
}

/* Tramo de animación con pistas completas: muestrea el valor exacto en el
   inicio y el final de cada pista para que ningún hueso quede sin datos
   (evita poses «congeladas» al cambiar de tramo). */
function makeSegment(THREE, clip, name, t0, t1) {
  const tracks = clip.tracks.map((tr) => {
    const vs = tr.getValueSize(), interp = tr.createInterpolant();
    const times = [], values = [];
    const sample = (t) => { const v = interp.evaluate(t); times.push(t - t0); for (let k = 0; k < vs; k++) values.push(v[k]); };
    sample(t0);
    for (let i = 0; i < tr.times.length; i++) {
      const t = tr.times[i];
      if (t > t0 + 1e-4 && t < t1 - 1e-4) { times.push(t - t0); for (let k = 0; k < vs; k++) values.push(tr.values[i * vs + k]); }
    }
    sample(t1);
    return new tr.constructor(tr.name, times, values);
  });
  return new THREE.AnimationClip(name, t1 - t0, tracks);
}

/* ======================================================================
   Visor
   ====================================================================== */
function createViewer(L, canvas, stage) {
  const { THREE } = L;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  let pixelRatio = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new L.RoomEnvironment(renderer), 0.04);
  scene.environment = envRT.texture;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 200);
  const controls = new L.OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.screenSpacePanning = true;
  controls.minPolarAngle = 0.08; controls.maxPolarAngle = Math.PI * 0.54;
  controls.autoRotateSpeed = 1.4;

  /* Estudio: luz principal (con sombras), relleno frío, contorno cian y cielo suave */
  const hemi = new THREE.HemisphereLight(0xe6f2ff, 0x18222e, 0.55);
  const key = new THREE.DirectionalLight(0xfff3e6, 2.4);
  key.castShadow = true;
  key.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048);
  key.shadow.bias = -0.0005; key.shadow.normalBias = 0.02;
  const fill = new THREE.DirectionalLight(0xbcd6ff, 0.8);
  const rim = new THREE.DirectionalLight(0x65c3cc, 2.6);
  const rim2 = new THREE.DirectionalLight(0x0e6ba8, 1.4);
  scene.add(hemi, key, key.target, fill, rim, rim2);

  /* Suelo: sombra de contacto + halo y aro del color del personaje */
  const stageGroup = new THREE.Group();
  const shadowFloor = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.ShadowMaterial({ opacity: 0.32 }));
  shadowFloor.rotation.x = -Math.PI / 2; shadowFloor.receiveShadow = true;
  const haloTex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d");
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(255,255,255,.55)"); g.addColorStop(0.55, "rgba(255,255,255,.14)"); g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const halo = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, depthWrite: false, opacity: 0.5 }));
  halo.rotation.x = -Math.PI / 2; halo.position.y = 0.002;
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.985, 1, 128), new THREE.MeshBasicMaterial({ color: 0x65c3cc, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.004;
  stageGroup.add(shadowFloor, halo, ring);
  scene.add(stageGroup);

  const clock = new THREE.Clock();
  const tmp = new THREE.Vector3();
  let model = null, mixer = null, segments = [], current = null, fading = [], trackBone = null;
  let inPlace = true, paused = reduced, visible = false, raf = 0, disposed = false, size = 1, home = null;
  let onTick = null, fpsAcc = 0, fpsN = 0, degrade = 0;

  function applyTheme() {
    const light = getTheme() === "light";
    renderer.toneMappingExposure = light ? 1.08 : 1.0;
    hemi.intensity = light ? 0.9 : 0.55;
    shadowFloor.material.opacity = light ? 0.22 : 0.34;
    halo.material.opacity = light ? 0.35 : 0.5;
    halo.material.color.setHex(light ? 0x0e6ba8 : 0x65c3cc);
  }
  applyTheme();

  /* ---------- Tamaño y visibilidad ---------- */
  function resize() {
    const w = stage.clientWidth || 1, h = stage.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(() => { resize(); if (!raf) renderOnce(); });
  ro.observe(stage);
  resize();

  function loop() {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.1);
    if (mixer) {
      mixer.update(paused ? 0 : dt);
      if (inPlace) keepInPlace();
      for (let i = fading.length - 1; i >= 0; i--) if (fading[i].getEffectiveWeight() <= 0.001) { fading[i].stop(); fading.splice(i, 1); }
    }
    controls.update();
    renderer.render(scene, camera);
    if (onTick) onTick();
    /* Control de rendimiento: si el equipo no alcanza ~30 fps, baja la resolución y luego las sombras */
    fpsAcc += dt; fpsN++;
    if (fpsAcc > 3) {
      const avg = fpsAcc / fpsN; fpsAcc = 0; fpsN = 0;
      if (avg > 0.034 && degrade < 2) {
        degrade++;
        if (degrade === 1 && pixelRatio > 1) { pixelRatio = 1; renderer.setPixelRatio(1); resize(); }
        else { key.castShadow = false; shadowFloor.visible = false; renderer.shadowMap.enabled = false; }
      }
    }
  }
  function start() { if (!raf && !disposed && visible && !document.hidden) { clock.getDelta(); raf = requestAnimationFrame(loop); } }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  function renderOnce() { if (!disposed) { controls.update(); renderer.render(scene, camera); } }
  const io = new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) start(); else stop(); }, { threshold: 0.05 });
  io.observe(stage);
  const onVis = () => { if (document.hidden) stop(); else start(); };
  document.addEventListener("visibilitychange", onVis);

  /* ---------- Teclado (accesibilidad) ---------- */
  function orbitBy(dAz, dPol) {
    const off = camera.position.clone().sub(controls.target);
    const sph = new THREE.Spherical().setFromVector3(off);
    sph.theta += dAz; sph.phi = Math.min(controls.maxPolarAngle, Math.max(controls.minPolarAngle, sph.phi + dPol));
    off.setFromSpherical(sph); camera.position.copy(controls.target).add(off); controls.update(); renderOnce();
  }
  function zoomBy(k) {
    const off = camera.position.clone().sub(controls.target).multiplyScalar(k);
    off.setLength(Math.min(controls.maxDistance, Math.max(controls.minDistance, off.length())));
    camera.position.copy(controls.target).add(off); controls.update(); renderOnce();
  }
  function onKey(e) {
    const k = e.key;
    if (k === "ArrowLeft") orbitBy(-0.17, 0); else if (k === "ArrowRight") orbitBy(0.17, 0);
    else if (k === "ArrowUp") orbitBy(0, -0.1); else if (k === "ArrowDown") orbitBy(0, 0.1);
    else if (k === "+" || k === "=") zoomBy(0.88); else if (k === "-" || k === "_") zoomBy(1.14);
    else if (k === "0") resetCamera(); else return;
    e.preventDefault();
  }
  canvas.addEventListener("keydown", onKey);

  /* ---------- Modelo ---------- */
  function keepInPlace() {
    if (!trackBone || !model) return;
    trackBone.getWorldPosition(tmp);
    model.position.x -= tmp.x; model.position.z -= tmp.z;
  }
  function disposeModel() {
    if (!model) return;
    stopAll();
    scene.remove(model);
    const seen = new Set();
    model.traverse((o) => {
      if (o.geometry && !seen.has(o.geometry)) { seen.add(o.geometry); o.geometry.dispose(); }
      const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      mats.forEach((m) => {
        if (seen.has(m)) return; seen.add(m);
        Object.keys(m).forEach((p) => { const v = m[p]; if (v && v.isTexture && !seen.has(v)) { seen.add(v); v.dispose(); } });
        m.dispose();
      });
      if (o.skeleton && o.skeleton.boneTexture) o.skeleton.boneTexture.dispose();
    });
    if (mixer) { mixer.stopAllAction(); mixer.uncacheRoot(model); }
    model = null; mixer = null; segments = []; current = null; fading = []; trackBone = null;
    renderer.renderLists.dispose();
  }
  function stopAll() { if (mixer) mixer.stopAllAction(); current = null; fading = []; }

  function setModel(gltf, cfg) {
    disposeModel();
    model = gltf.scene;
    let verts = 0, tris = 0, meshes = 0, bones = 0;
    const mats = new Set(), texs = new Set();
    model.traverse((o) => {
      if (o.isMesh) {
        meshes++; o.castShadow = true; o.receiveShadow = false;
        o.frustumCulled = false; /* las mallas con esqueleto se deforman fuera de su caja original */
        const g = o.geometry; verts += g.attributes.position.count; tris += g.index ? g.index.count / 3 : g.attributes.position.count / 3;
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
          /* El entorno de estudio es neutro y brillante: en superficies no metálicas (pieles negras
             satinadas de KAIRO y NOX) se atenúa su reflejo para conservar el color de Blender. */
          if ("envMapIntensity" in m) m.envMapIntensity = (m.metalness || 0) > 0.5 ? 0.9 : 0.35;
          mats.add(m); Object.keys(m).forEach((p) => { if (m[p] && m[p].isTexture) texs.add(m[p].source || m[p]); }); });
        if (o.isSkinnedMesh && o.skeleton) bones = Math.max(bones, o.skeleton.bones.length);
      }
    });
    scene.add(model);
    trackBone = cfg.trackBone ? model.getObjectByName(cfg.trackBone) : null;

    /* Animaciones: un tramo por entrada de la configuración */
    mixer = new THREE.AnimationMixer(model);
    const byName = {}; gltf.animations.forEach((c) => { byName[c.name] = c; });
    const fps = LAB_SETTINGS.fps;
    segments = cfg.animations.map((a) => {
      const base = byName[a.clip], meta = cfg.clips[a.clip];
      if (!base || !meta) { console.warn("BLACKDOT 3D LAB: falta el clip", a.clip, "en", cfg.model); return null; }
      const t0 = Math.max(0, (a.from - meta.start + 1) / fps), t1 = Math.min(base.duration, (a.to - meta.start + 1) / fps);
      const clip = makeSegment(THREE, base, a.id, t0, t1);
      return { cfg: a, clip, action: mixer.clipAction(clip) };
    }).filter(Boolean);

    /* Encuadre: se coloca el tramo inicial en su primer fotograma y se mide el personaje */
    const first = segments.find((s) => s.cfg.id === cfg.defaultAnimation) || segments[0];
    if (first) { first.action.reset().play(); mixer.update(0); }
    model.updateMatrixWorld(true);
    if (trackBone) keepInPlace();
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model, true);
    if (!trackBone) { const c = box.getCenter(new THREE.Vector3()); model.position.x -= c.x; model.position.z -= c.z; }
    model.position.y -= box.min.y;
    model.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(model, true), dims = box2.getSize(new THREE.Vector3());
    size = Math.max(dims.y, dims.x * 0.8, dims.z * 0.8, 0.1);
    const h = dims.y;

    /* Estudio proporcional al personaje */
    const r = Math.max(dims.x, dims.z, h * 0.7) * 0.9;
    stageGroup.scale.setScalar(r);
    ring.material.color.set(cfg.color || "#65C3CC");
    key.position.set(h * 1.4, h * 2.6, h * 1.9); key.target.position.set(0, h * 0.45, 0);
    const sc = key.shadow.camera; sc.left = sc.bottom = -r * 1.6; sc.right = sc.top = r * 1.6; sc.near = 0.1; sc.far = h * 8; sc.updateProjectionMatrix();
    fill.position.set(-h * 2.2, h * 1.2, h * 1.6);
    rim.position.set(-h * 0.8, h * 1.9, -h * 2.4);
    rim2.position.set(h * 1.6, h * 0.9, -h * 2);

    /* Cámara: vista 3/4 frontal que encuadra al personaje completo */
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const fitH = (h * 1.34) / (2 * Math.tan(vfov / 2));
    const fitW = (Math.max(dims.x, dims.z) * 1.25) / (2 * Math.tan(vfov / 2) * Math.max(camera.aspect, 0.5));
    const dist = Math.max(fitH, fitW);
    const target = new THREE.Vector3(0, h * 0.47, 0);
    const az = THREE.MathUtils.degToRad(cfg.cameraAzimuth != null ? cfg.cameraAzimuth : 24);
    home = { target, pos: new THREE.Vector3(Math.sin(az) * dist, h * 0.62, Math.cos(az) * dist) };
    controls.minDistance = size * 0.45; controls.maxDistance = dist * 3.2;
    camera.near = Math.max(0.01, size / 200); camera.far = dist * 30; camera.updateProjectionMatrix();
    resetCamera();

    if (first) { stopAll(); play(first.cfg.id, true); }
    renderOnce();
    return { verts, tris: Math.round(tris), meshes, materials: mats.size, textures: texs.size, bones, clips: gltf.animations.length, segments: segments.length };
  }

  function resetCamera() {
    if (!home) return;
    controls.target.copy(home.target); camera.position.copy(home.pos);
    controls.update(); renderOnce();
  }

  function play(id, instant) {
    const seg = segments.find((s) => s.cfg.id === id); if (!seg) return;
    const next = seg.action;
    next.reset(); next.setLoop(THREE.LoopRepeat, Infinity); next.clampWhenFinished = false; next.enabled = true;
    next.setEffectiveTimeScale(1); next.setEffectiveWeight(1); next.play();
    /* En pausa el fundido no avanzaría: el cambio se hace al instante */
    if (current && current !== next && !instant && !reduced && !paused) { current.crossFadeTo(next, 0.35, false); fading.push(current); }
    else if (current && current !== next) current.stop();
    current = next;
    if (mixer) { mixer.update(0); if (inPlace) keepInPlace(); }
    renderOnce();
  }

  return {
    THREE,
    setModel, disposeModel, resetCamera, play, start, stop,
    get duration() { return current ? current.getClip().duration : 0; },
    get time() { return current ? current.time % current.getClip().duration : 0; },
    seek(f) { if (!current) return; current.time = f * current.getClip().duration; mixer.update(0); if (inPlace) keepInPlace(); renderOnce(); },
    setPaused(p) { paused = p; renderOnce(); },
    get paused() { return paused; },
    setInPlace(v) { inPlace = v; if (v) { keepInPlace(); renderOnce(); } },
    setAutoRotate(v) { controls.autoRotate = v; },
    applyTheme() { applyTheme(); renderOnce(); },
    set onTick(fn) { onTick = fn; },
    hasModel() { return !!model; },
    getModel() { return model; },
    dispose() {
      disposed = true; stop(); io.disconnect(); ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("keydown", onKey);
      disposeModel(); controls.dispose(); envRT.dispose(); pmrem.dispose(); haloTex.dispose();
      [shadowFloor, halo, ring].forEach((m) => { m.geometry.dispose(); m.material.dispose(); });
      renderer.dispose();
    }
  };
}

/* ======================================================================
   Interfaz de la sección
   ====================================================================== */
function initLab() {
  const section = $("#lab");
  if (!section || !LAB_CHARACTERS.length) return;
  const picker = $("#lab-picker"), shell = $("#lab-shell"), stage = $("#lab-stage"), canvas = $("#lab-canvas");
  const poster = $("#lab-poster"), cover = $("#lab-cover"), loadBtn = $("#lab-load"), loadTxt = $("#lab-load-txt"), sizeTxt = $("#lab-size");
  const loading = $("#lab-loading"), progTxt = $("#lab-progress-txt"), progBar = $("#lab-progress");
  const errBox = $("#lab-error"), errMsg = $("#lab-error-msg"), retry = $("#lab-retry");
  const btnReset = $("#lab-reset"), btnRotate = $("#lab-rotate"), btnPlace = $("#lab-inplace"), btnFull = $("#lab-full");
  const btnPlay = $("#lab-play"), sel = $("#lab-anim"), range = $("#lab-time"), clockOut = $("#lab-clock");

  let cfg = LAB_CHARACTERS[0], viewer = null, libs = null, token = 0, stats = null, dracoLoader = null, gltfLoader = null, scrubbing = false;

  /* Selector de personajes (galería) */
  picker.innerHTML = LAB_CHARACTERS.map((c, i) =>
    `<button class="lab-pick" type="button" role="tab" id="lab-tab-${c.id}" aria-controls="lab-shell" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-id="${c.id}" style="--cc:${c.color}">` +
      `<span class="lab-pick-img"><img src="${c.cover}" alt="" loading="lazy" decoding="async"></span>` +
      `<span class="lab-pick-txt"><small>${String(i + 1).padStart(2, "0")} · ${c.role}</small><strong>${c.name}</strong></span>` +
    `</button>`).join("");
  const tabs = Array.from(picker.querySelectorAll(".lab-pick"));
  tabs.forEach((t) => t.addEventListener("click", () => choose(t.getAttribute("data-id"), true)));
  picker.addEventListener("keydown", (e) => {
    const i = tabs.indexOf(document.activeElement); if (i < 0) return;
    let j = -1;
    if (e.key === "ArrowRight") j = (i + 1) % tabs.length; else if (e.key === "ArrowLeft") j = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") j = 0; else if (e.key === "End") j = tabs.length - 1;
    if (j >= 0) { e.preventDefault(); tabs[j].focus(); choose(tabs[j].getAttribute("data-id"), true); }
  });

  function fillInfo(c, s) {
    shell.style.setProperty("--cc", c.color);
    $("#lab-role").textContent = c.role;
    $("#lab-name").textContent = c.name;
    $("#lab-desc").textContent = c.description;
    const rows = [
      ["Vértices", s ? fmtInt(s.verts) : "Al cargar"],
      ["Triángulos", s ? fmtInt(s.tris) : "Al cargar"],
      ["Huesos del rig", String(s && s.bones ? s.bones : c.tech.bones)],
      ["Mallas", String(s ? s.meshes : c.tech.meshes)],
      ["Materiales", String(s ? s.materials : c.tech.materials)],
      ["Texturas", String(s ? s.textures : c.tech.textures)],
      ["Animaciones", c.animations.length + " tramos"],
      ["Archivo", "GLB · " + c.fileSize]
    ];
    $("#lab-tech").innerHTML = rows.map((r) => `<div><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join("");
    $("#lab-tools").innerHTML = c.tools.map((t) => `<li><strong>${t[0]}</strong><span>${t[1]}</span></li>`).join("");
    $("#lab-note").textContent = c.tech.extra + ". Formato optimizado para la web: geometría comprimida con Draco y texturas WebP de 2048 px.";
  }

  function setControlsEnabled(on) {
    [btnReset, btnRotate, btnPlace, btnPlay, sel, range].forEach((el) => { el.disabled = !on; });
  }
  function fillSelect(c) {
    sel.innerHTML = c.animations.map((a) => `<option value="${a.id}"${a.id === c.defaultAnimation ? " selected" : ""}>${a.label}</option>`).join("");
  }
  function syncPlay() {
    const p = viewer ? viewer.paused : reduced;
    btnPlay.classList.toggle("is-paused", p);
    btnPlay.setAttribute("aria-label", p ? "Reproducir animación" : "Pausar animación");
    btnPlay.setAttribute("aria-pressed", p ? "false" : "true");
  }
  function showPoster(c) {
    cover.src = c.cover; cover.alt = "Render de " + c.name;
    loadTxt.textContent = "Ver a " + c.name + " en 3D";
    sizeTxt.textContent = "Modelo GLB de " + c.fileSize + ": se descarga solo cuando pulsas el botón.";
    poster.hidden = false; loading.hidden = true; errBox.hidden = true;
    stage.classList.remove("is-live");
  }
  function showError(msg, canRetry) {
    loading.hidden = true; errBox.hidden = false; errMsg.textContent = msg; retry.hidden = !canRetry;
    stage.classList.remove("is-live");
  }
  function setProgress(p, label) {
    progBar.style.width = Math.round(p * 100) + "%";
    progTxt.textContent = label;
  }

  function choose(id, userAction) {
    const c = LAB_CHARACTERS.find((x) => x.id === id); if (!c) return;
    tabs.forEach((t) => { const on = t.getAttribute("data-id") === id; t.setAttribute("aria-selected", on ? "true" : "false"); t.tabIndex = on ? 0 : -1; });
    shell.setAttribute("aria-labelledby", "lab-tab-" + id);
    if (c === cfg && viewer && viewer.hasModel()) return;
    cfg = c; stats = null;
    fillInfo(c, null); fillSelect(c);
    if (viewer && viewer.hasModel()) { load(); return; } /* el visor ya está activo: carga el nuevo personaje */
    showPoster(c);
    setControlsEnabled(false);
    if (userAction) syncClock(true);
  }

  async function ensureViewer() {
    if (viewer) return viewer;
    if (!hasWebGL()) throw Object.assign(new Error("webgl"), { code: "webgl" });
    setProgress(0.04, "Cargando el motor 3D (Three.js)…");
    try { libs = await loadLibs(); } catch (e) { throw Object.assign(e, { code: "libs" }); }
    viewer = createViewer(libs, canvas, stage);
    viewer.onTick = () => syncClock(false);
    dracoLoader = new libs.DRACOLoader(); dracoLoader.setDecoderPath(LAB_SETTINGS.dracoPath);
    gltfLoader = new libs.GLTFLoader(); gltfLoader.setDRACOLoader(dracoLoader);
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      console.error("BLACKDOT 3D LAB: se perdió el contexto WebGL.");
      try { viewer.dispose(); } catch (err) { console.error(err); }
      viewer = null;
      showError("El navegador liberó la memoria gráfica del visor (contexto WebGL perdido). Pulsa «Reintentar» para volver a cargar el personaje.", true);
    }, { once: true });
    return viewer;
  }

  async function load() {
    const my = ++token, c = cfg;
    poster.hidden = true; errBox.hidden = true; loading.hidden = false;
    setControlsEnabled(false);
    setProgress(0.02, "Preparando el visor…");
    try {
      const v = await ensureViewer();
      if (my !== token) return;
      v.disposeModel();
      setProgress(0.08, "Descargando a " + c.name + "…");
      const gltf = await new Promise((resolve, reject) => {
        gltfLoader.load(c.model, resolve, (ev) => {
          if (my !== token) return;
          if (ev.lengthComputable && ev.total) { const p = ev.loaded / ev.total; setProgress(0.08 + p * 0.82, "Descargando a " + c.name + "… " + Math.round(p * 100) + " %"); }
          else setProgress(0.5, "Descargando a " + c.name + "… " + (ev.loaded / 1048576).toFixed(1).replace(".", ",") + " MB");
        }, reject);
      });
      if (my !== token) { disposeGltf(gltf); return; }
      setProgress(0.95, "Preparando materiales y animaciones…");
      stats = v.setModel(gltf, c);
      if (window.BDStore) window.BDStore.track("lab", { id: c.id });
      fillInfo(c, stats);
      loading.hidden = true;
      stage.classList.add("is-live");
      setControlsEnabled(true);
      v.setInPlace(btnPlace.getAttribute("aria-pressed") === "true");
      v.setAutoRotate(btnRotate.getAttribute("aria-pressed") === "true");
      v.start();
      syncPlay(); syncClock(true);
      canvas.focus({ preventScroll: true });
    } catch (err) {
      if (my !== token) return;
      console.error("BLACKDOT 3D LAB:", err);
      if (err && err.code === "webgl") showError("Tu navegador o dispositivo no tiene WebGL disponible, por eso no se puede mostrar el modelo 3D. Prueba con una versión reciente de Chrome, Edge, Firefox o Safari, o activa la aceleración por hardware.", false);
      else if (err && err.code === "libs") showError("No se pudieron descargar las librerías 3D (Three.js) desde cdn.jsdelivr.net. Revisa tu conexión a Internet e inténtalo de nuevo.", true);
      else if (String(err && (err.message || err)).toLowerCase().includes("draco")) showError("No se pudo descomprimir el modelo: el decodificador Draco no respondió. Revisa tu conexión e inténtalo de nuevo.", true);
      else showError("No se pudo cargar el modelo de " + c.name + " (" + c.model + "). Revisa tu conexión e inténtalo de nuevo.", true);
    }
  }
  function disposeGltf(gltf) {
    gltf.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach((x) => { Object.keys(x).forEach((p) => x[p] && x[p].isTexture && x[p].dispose()); x.dispose(); }); });
  }

  /* Reloj y línea de tiempo */
  let lastClock = 0;
  function syncClock(force) {
    const now = performance.now();
    if (!force && now - lastClock < 120) return;
    lastClock = now;
    const d = viewer && viewer.hasModel() ? viewer.duration : 0, t = d ? viewer.time : 0;
    if (!scrubbing) range.value = d ? Math.round((t / d) * 1000) : 0;
    clockOut.textContent = fmt1(t) + " / " + fmt1(d) + " s";
    range.setAttribute("aria-valuetext", fmt1(t) + " de " + fmt1(d) + " segundos");
  }

  /* Eventos */
  loadBtn.addEventListener("click", load);
  retry.addEventListener("click", load);
  btnReset.addEventListener("click", () => viewer && viewer.resetCamera());
  btnRotate.addEventListener("click", () => {
    const on = btnRotate.getAttribute("aria-pressed") !== "true";
    btnRotate.setAttribute("aria-pressed", on ? "true" : "false");
    if (viewer) viewer.setAutoRotate(on);
  });
  btnPlace.addEventListener("click", () => {
    const on = btnPlace.getAttribute("aria-pressed") !== "true";
    btnPlace.setAttribute("aria-pressed", on ? "true" : "false");
    btnPlace.querySelector("span").textContent = on ? "En el sitio" : "Libre";
    if (viewer) viewer.setInPlace(on);
  });
  btnPlay.addEventListener("click", () => { if (!viewer) return; viewer.setPaused(!viewer.paused); syncPlay(); });
  sel.addEventListener("change", () => { if (viewer) { viewer.play(sel.value); syncClock(true); } });
  range.addEventListener("input", () => { if (!viewer) return; scrubbing = true; viewer.seek(range.value / 1000); syncClock(true); });
  range.addEventListener("change", () => { scrubbing = false; });

  /* Pantalla completa (con alternativa CSS si el navegador no la permite, p. ej. iPhone) */
  function isFull() { return document.fullscreenElement === shell || document.webkitFullscreenElement === shell || shell.classList.contains("is-pseudo-full"); }
  function syncFull() {
    const on = isFull();
    btnFull.setAttribute("aria-pressed", on ? "true" : "false");
    btnFull.querySelector("span").textContent = on ? "Salir de pantalla completa" : "Pantalla completa";
  }
  btnFull.addEventListener("click", () => {
    if (isFull()) {
      if (shell.classList.contains("is-pseudo-full")) { shell.classList.remove("is-pseudo-full"); document.body.classList.remove("is-locked"); }
      else (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
      const req = shell.requestFullscreen || shell.webkitRequestFullscreen;
      const fallback = () => { shell.classList.add("is-pseudo-full"); document.body.classList.add("is-locked"); syncFull(); };
      if (req) { try { const r = req.call(shell); if (r && r.catch) r.catch(fallback); } catch (e) { fallback(); } } else fallback();
    }
    setTimeout(syncFull, 60);
  });
  document.addEventListener("fullscreenchange", syncFull);
  document.addEventListener("webkitfullscreenchange", syncFull);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && shell.classList.contains("is-pseudo-full")) { shell.classList.remove("is-pseudo-full"); document.body.classList.remove("is-locked"); syncFull(); } });

  document.addEventListener("themechange", () => { if (viewer) viewer.applyTheme(); });

  /* Precarga por intención: las librerías (no el modelo) al apuntar al botón */
  loadBtn.addEventListener("pointerenter", () => { if (hasWebGL()) loadLibs().catch(() => {}); }, { once: true });

  fillInfo(cfg, null); fillSelect(cfg); showPoster(cfg); setControlsEnabled(false); syncPlay(); syncClock(true);
  window.BLACKDOT_LAB = { choose, load, get viewer() { return viewer; }, characters: LAB_CHARACTERS };
}

/* ======================================================================
   Cinemática final (video nativo, sin reproducción automática)
   ====================================================================== */
function initCinematic() {
  const video = $("#cine-video"), playBtn = $("#cine-play"), fullBtn = $("#cine-full"), frame = $("#cine-frame"), msg = $("#cine-msg");
  if (!video) return;
  const sync = () => frame.classList.toggle("is-playing", !video.paused && !video.ended);
  playBtn.addEventListener("click", () => {
    const p = video.play();
    if (p && p.catch) p.catch((e) => { console.error("BLACKDOT cinemática:", e); msg.textContent = "El navegador no permitió iniciar la reproducción. Usa los controles del reproductor."; });
  });
  ["play", "playing", "pause", "ended"].forEach((ev) => video.addEventListener(ev, sync));
  video.addEventListener("error", () => {
    const err = video.error;
    console.error("BLACKDOT cinemática: error de video", err);
    msg.textContent = "No se pudo cargar el video de la cinemática (assets/video/blackdot-cinematic-final.mp4). Revisa tu conexión e inténtalo de nuevo.";
    frame.classList.add("is-error");
  }, true);
  const src = video.querySelector("source");
  if (src) src.addEventListener("error", () => { msg.textContent = "No se encontró el archivo de video de la cinemática."; frame.classList.add("is-error"); });
  fullBtn.addEventListener("click", () => {
    if (document.fullscreenElement) { document.exitFullscreen(); return; }
    if (video.requestFullscreen) video.requestFullscreen().catch((e) => { console.error(e); msg.textContent = "Tu navegador no permitió la pantalla completa."; });
    else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
    else msg.textContent = "Tu navegador no admite la pantalla completa para este video.";
  });
  /* Pausa el video si la persona se aleja de la sección */
  if ("IntersectionObserver" in window) new IntersectionObserver((en) => { if (!en[0].isIntersecting && !video.paused && !document.fullscreenElement) video.pause(); }, { threshold: 0.15 }).observe(video);
}

function boot() { initLab(); initCinematic(); }
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
