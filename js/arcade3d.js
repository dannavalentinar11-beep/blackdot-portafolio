/* ==========================================================================
   BLACKDOT ARCADE — sala 3D (Three.js r160, módulo ES)
   Se carga bajo demanda desde js/arcade.js solo cuando la persona entra.

   Composición (v2.1): un salón circular con seis alcobas iguales —paredes laterales,
   panel de fondo, cabecera con señalización y plataforma en el suelo— en las que se
   instala cada máquina con su escenografía. Iluminación ambiental azul/cian, luz
   cenital suave sobre la estación seleccionada y efectos contenidos.
   Geometría 100 % procedural (sin modelos externos).
   ========================================================================== */
import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const FONT = '"Space Grotesk", "Helvetica Neue", Arial, sans-serif';
const RADIUS = 11.5;
const STEP = THREE.MathUtils.degToRad(25);
const CYAN = 0x65c3cc, BLUE = 0x0e6ba8;
const pad = (n) => (n < 10 ? "0" + n : String(n));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }

export function createArcade(opts) {
  const { canvas, container, games, imgBase, reduced } = opts;
  const tier = opts.tier || "high";
  const N = games.length;
  const FEATURED = ["cucuta", "skybound"];

  /* ---------------- Renderer ---------------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: tier !== "low", powerPreference: "high-performance", alpha: false, stencil: false });
  let pixelRatio = Math.min(devicePixelRatio || 1, tier === "high" ? 1.75 : tier === "medium" ? 1.5 : 1.25);
  renderer.setPixelRatio(pixelRatio);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x02050a, 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x02050a);
  scene.fog = new THREE.FogExp2(0x02050a, 0.026);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 140);

  /* ---------------- Texturas de canvas ---------------- */
  function canvasTex(w, h, draw) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const x = c.getContext("2d"); draw(x, w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    t.userData.ctx = x;
    return t;
  }
  function fitFont(x, text, maxW, size, weight = "700") {
    let s = size;
    do { x.font = `${weight} ${s}px ${FONT}`; s -= 2; } while (x.measureText(text).width > maxW && s > 10);
  }
  const radialTex = canvasTex(128, 128, (x, w) => {
    const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.4, "rgba(255,255,255,.35)"); g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g; x.fillRect(0, 0, w, w);
  });

  /* ---------------- Entorno para reflejos (azul/cian BLACKDOT) ---------------- */
  const pmrem = new THREE.PMREMGenerator(renderer);
  {
    const envScene = new THREE.Scene();
    const envTex = canvasTex(512, 256, (x, w, h) => {
      const g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#0a2440"); g.addColorStop(0.4, "#04101e"); g.addColorStop(0.55, "#02060c"); g.addColorStop(1, "#010306");
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.fillStyle = "rgba(101,195,204,.6)"; x.fillRect(0, h * 0.2, w, 3);
      for (let i = 0; i < 6; i++) { x.fillStyle = "rgba(170,220,235,.45)"; x.fillRect(i * (w / 6) + 30, h * 0.08, 30, h * 0.24); }
    });
    const sph = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.MeshBasicMaterial({ map: envTex, side: THREE.BackSide }));
    envScene.add(sph);
    scene.environment = pmrem.fromScene(envScene, 0.02).texture;
    sph.geometry.dispose(); sph.material.dispose(); envTex.dispose();
  }

  /* ---------------- Luz ambiental ---------------- */
  const hemi = new THREE.HemisphereLight(0x7aa6d6, 0x05080e, 1.5);
  const key = new THREE.DirectionalLight(0xc4e2ff, 1.1);
  key.position.set(0, 14, 10);
  scene.add(hemi, key);

  /* ---------------- Materiales base ---------------- */
  const metal = new THREE.MeshStandardMaterial({ color: 0x18222f, roughness: 0.42, metalness: 0.6, envMapIntensity: 1 });
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x0f1a28, roughness: 0.66, metalness: 0.3, envMapIntensity: 0.6 });
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x141e2c, roughness: 0.4, metalness: 0.5, envMapIntensity: 1 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x020408, roughness: 0.6, metalness: 0.2 });
  const glowMat = (color, k = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), toneMapped: false });
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.45, metalness: 0.35 }, extra));

  /* ---------------- Suelo ---------------- */
  const gridTex = canvasTex(256, 256, (x, w) => {
    x.fillStyle = "rgba(3,7,13,0.86)"; x.fillRect(0, 0, w, w);
    x.strokeStyle = "rgba(101,195,204,0.16)"; x.lineWidth = 2; x.strokeRect(0, 0, w, w);
  });
  gridTex.wrapS = gridTex.wrapT = THREE.RepeatWrapping; gridTex.repeat.set(30, 30);
  let reflector = null;
  if (tier !== "low") {
    reflector = new Reflector(new THREE.CircleGeometry(42, 64), {
      clipBias: 0.003, color: 0x6f869c,
      textureWidth: Math.round(innerWidth * pixelRatio * 0.5), textureHeight: Math.round(innerHeight * pixelRatio * 0.5)
    });
    reflector.rotation.x = -Math.PI / 2;
    scene.add(reflector);
  }
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x0a1320, map: gridTex, roughness: 0.5, metalness: 0.5, transparent: !!reflector, envMapIntensity: 0.5 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(84, 84), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.004;
  scene.add(floor);
  /* Anillo de circulación frente a las alcobas */
  const aisle = new THREE.Mesh(new THREE.RingGeometry(9.15, 9.2, 160, 1, Math.PI * 0.5 - STEP * 3.2, STEP * 6.4), glowMat(CYAN, 0.55));
  aisle.rotation.x = -Math.PI / 2; aisle.position.y = 0.01;
  scene.add(aisle);
  const emblemTex = canvasTex(1024, 1024, (x, w) => {
    x.translate(w / 2, w / 2);
    x.strokeStyle = "rgba(101,195,204,.5)"; x.lineWidth = 3; x.beginPath(); x.arc(0, 0, 470, 0, 6.2832); x.stroke();
    x.strokeStyle = "rgba(101,195,204,.2)"; x.lineWidth = 2; x.beginPath(); x.arc(0, 0, 300, 0, 6.2832); x.stroke();
    const txt = "BLACKDOT ARCADE · ENTRA AL UNIVERSO DEL JUEGO · ";
    x.font = `600 30px ${FONT}`; x.fillStyle = "rgba(170,225,235,.55)"; x.textAlign = "center"; x.textBaseline = "middle";
    const chars = (txt + txt).split("");
    chars.forEach((ch, i) => { x.save(); x.rotate((i / chars.length) * 6.2832); x.fillText(ch, 0, -390); x.restore(); });
    x.fillStyle = "rgba(101,195,204,.8)"; x.beginPath(); x.arc(0, 0, 18, 0, 6.2832); x.fill();
  });
  const emblem = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 6.4), new THREE.MeshBasicMaterial({ map: emblemTex, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  emblem.rotation.x = -Math.PI / 2; emblem.position.set(0, 0.012, -0.8);
  scene.add(emblem);

  /* ---------------- Arquitectura ---------------- */
  const wallTex = canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = "#000"; x.fillRect(0, 0, w, h);
    x.fillStyle = "rgba(101,195,204,.10)"; x.fillRect(0, 0, 2, h);
    x.fillStyle = "rgba(14,107,168,.45)"; x.fillRect(0, h * 0.78, w, 2);
    x.fillStyle = "rgba(101,195,204,.05)"; x.fillRect(24, 24, w - 48, h * 0.5);
  });
  wallTex.wrapS = THREE.RepeatWrapping; wallTex.repeat.set(18, 1);
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(16.5, 16.5, 11, 120, 1, true, THREE.MathUtils.degToRad(64), THREE.MathUtils.degToRad(232)),
    new THREE.MeshStandardMaterial({ color: 0x060c16, roughness: 0.8, metalness: 0.3, side: THREE.BackSide, emissive: 0xffffff, emissiveMap: wallTex, emissiveIntensity: 0.6 })
  );
  wall.position.y = 5.5;
  scene.add(wall);

  /* Techo: anillo oscuro con líneas de luz empotradas */
  const ceilTex = canvasTex(1024, 1024, (x, w) => {
    x.fillStyle = "#000"; x.fillRect(0, 0, w, w);
    x.translate(w / 2, w / 2);
    [380, 300].forEach((r, k) => { x.strokeStyle = k ? "rgba(14,107,168,.6)" : "rgba(101,195,204,.55)"; x.lineWidth = 3; x.beginPath(); x.arc(0, 0, r, 0, 6.2832); x.stroke(); });
    for (let i = 0; i < 24; i++) { x.save(); x.rotate((i / 24) * 6.2832); x.fillStyle = "rgba(101,195,204,.18)"; x.fillRect(310, -1, 60, 2); x.restore(); }
  });
  const ceiling = new THREE.Mesh(new THREE.CircleGeometry(17, 96), new THREE.MeshStandardMaterial({ color: 0x03070d, roughness: 0.9, metalness: 0.1, emissive: 0xffffff, emissiveMap: ceilTex, emissiveIntensity: 0.7, side: THREE.DoubleSide }));
  ceiling.rotation.x = Math.PI / 2; ceiling.position.y = 9.4;
  scene.add(ceiling);

  /* Pantalla principal sobre las alcobas centrales */
  const bigTex = canvasTex(1344, 504, () => {});
  const bigMat = new THREE.MeshBasicMaterial({ map: bigTex, toneMapped: false, color: new THREE.Color(0, 0, 0) });
  const bigGroup = new THREE.Group();
  bigGroup.position.set(0, 7.3, -15.4); bigGroup.rotation.x = 0.1;
  const bigFrame = new THREE.Mesh(new THREE.BoxGeometry(7.9, 3.1, 0.2), metal);
  const big = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 2.81), bigMat); big.position.z = 0.11;
  bigGroup.add(bigFrame, big);
  scene.add(bigGroup);

  /* Partículas: polvo ambiental muy sutil */
  const PCOUNT = tier === "high" ? 140 : tier === "medium" ? 90 : 0;
  const pPos = new Float32Array(Math.max(1, PCOUNT) * 3), pSpd = new Float32Array(Math.max(1, PCOUNT));
  for (let i = 0; i < PCOUNT; i++) { pPos[i * 3] = (Math.random() - 0.5) * 30; pPos[i * 3 + 1] = Math.random() * 8; pPos[i * 3 + 2] = -15 + Math.random() * 22; pSpd[i] = 0.05 + Math.random() * 0.12; }
  const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.05, map: radialTex, color: CYAN, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  particles.visible = PCOUNT > 0;
  scene.add(particles);

  /* ---------------- Máquina arcade (perfil lateral extruido) ---------------- */
  const prof = new THREE.Shape();
  [[-0.55, 0], [0.55, 0], [0.55, 0.92], [0.76, 1.02], [0.63, 1.12], [0.3, 1.18], [0.12, 2.05], [0.38, 2.15], [0.38, 2.55], [-0.55, 2.55]].forEach((p, i) => (i ? prof.lineTo(p[0], p[1]) : prof.moveTo(p[0], p[1])));
  const cabGeo = new THREE.ExtrudeGeometry(prof, { depth: 1.5, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1 });
  cabGeo.rotateY(-Math.PI / 2); cabGeo.translate(0.75, 0, 0);
  const SCREEN_TILT = -Math.atan2(0.18, 0.87);

  function marqueeTex(g) {
    return canvasTex(512, 128, (x, w, h) => {
      const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#0b1624"); gr.addColorStop(1, "#04080f");
      x.fillStyle = gr; x.fillRect(0, 0, w, h);
      x.fillStyle = g.color; x.fillRect(0, h - 6, w, 6);
      x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = "#fff";
      const name = g.name.toUpperCase(); fitFont(x, name, w - 60, 46); x.fillText(name, w / 2, h / 2 - 2);
    });
  }
  function signTex(g, i) {
    return canvasTex(1024, 128, (x, w, h) => {
      x.fillStyle = "#060c15"; x.fillRect(0, 0, w, h);
      x.fillStyle = g.color; x.fillRect(36, h / 2 - 18, 6, 36);
      x.textBaseline = "middle"; x.textAlign = "left";
      x.fillStyle = "rgba(255,255,255,.55)"; x.font = `600 40px ${FONT}`; x.fillText(pad(i + 1), 64, h / 2 + 1);
      x.fillStyle = "#fff"; const nm = g.name.toUpperCase(); fitFont(x, nm, w - 360, 50); x.fillText(nm, 140, h / 2 + 1);
      x.textAlign = "right"; x.fillStyle = "rgba(255,255,255,.5)"; fitFont(x, g.station.toUpperCase(), 240, 26, "600"); x.fillText(g.station.toUpperCase(), w - 36, h / 2 + 1);
    });
  }
  function sideTex(g, i) {
    return canvasTex(256, 420, (x, w, h) => {
      x.clearRect(0, 0, w, h);
      x.fillStyle = rgba(g.color, 0.55); x.beginPath(); x.moveTo(0, h); x.lineTo(70, h); x.lineTo(w, 160); x.lineTo(w, 100); x.closePath(); x.fill();
      x.fillStyle = "rgba(255,255,255,.75)"; x.font = `700 84px ${FONT}`; x.textBaseline = "top"; x.fillText(pad(i + 1), 18, 18);
    });
  }

  /* ---------------- Escenografía temática (contenida) ---------------- */
  const PROPS = {
    cucuta(g, add) {
      const winTex = canvasTex(128, 256, (x, w, h) => {
        x.fillStyle = "#000"; x.fillRect(0, 0, w, h);
        for (let yy = 8; yy < h - 8; yy += 16) for (let xx = 8; xx < w - 8; xx += 18) { const r = Math.random(); if (r > 0.5) { x.fillStyle = r > 0.9 ? "rgba(101,195,204,.8)" : "rgba(255,196,0,.75)"; x.fillRect(xx, yy, 9, 8); } }
      });
      const bMat = new THREE.MeshStandardMaterial({ color: 0x0b111b, roughness: 0.7, metalness: 0.3, emissive: 0xffffff, emissiveMap: winTex, emissiveIntensity: 0.45 });
      [[-1.05, 0.5, 2.9, -1.6], [-0.45, 0.42, 3.7, -1.75], [0.25, 0.55, 3.2, -1.7], [0.95, 0.45, 3.9, -1.6]].forEach(([px, w, h, pz]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.5), bMat); m.position.set(px, h / 2, pz); add(m); });
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 2.6, 8), metal); pole.position.set(1.25, 1.3, 0.6);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), glowMat(0xffe7a8, 1.2)); lamp.position.set(1.1, 2.58, 0.6);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.03), metal); arm.position.set(1.17, 2.64, 0.6);
      add(pole, lamp, arm);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 2.5, 8), std(0x5a4632, { metalness: 0 })); trunk.position.set(-1.2, 1.25, 0.35); trunk.rotation.z = 0.07; add(trunk);
      const leafMat = std(0x2f8a57, { metalness: 0, roughness: 0.8, side: THREE.DoubleSide });
      for (let k = 0; k < 6; k++) { const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.95, 4), leafMat); const a = (k / 6) * Math.PI * 2; leaf.position.set(-1.29 + Math.cos(a) * 0.3, 2.5, 0.35 + Math.sin(a) * 0.3); leaf.rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2); add(leaf); }
      return null;
    },
    dynasty(g, add) {
      const pitchTex = canvasTex(512, 300, (x, w, h) => {
        for (let k = 0; k < 10; k++) { x.fillStyle = k % 2 ? "#1b5232" : "#16452a"; x.fillRect((k * w) / 10, 0, w / 10 + 1, h); }
        x.strokeStyle = "rgba(255,255,255,.8)"; x.lineWidth = 4; x.strokeRect(14, 14, w - 28, h - 28);
        x.beginPath(); x.moveTo(w / 2, 14); x.lineTo(w / 2, h - 14); x.stroke(); x.beginPath(); x.arc(w / 2, h / 2, 46, 0, 6.2832); x.stroke();
        x.strokeRect(14, h / 2 - 70, 70, 140); x.strokeRect(w - 84, h / 2 - 70, 70, 140);
      });
      const pitch = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 1.6), new THREE.MeshStandardMaterial({ map: pitchTex, emissive: 0xffffff, emissiveMap: pitchTex, emissiveIntensity: 0.3, roughness: 0.8 }));
      pitch.position.set(0, 3.15, -1.72); add(pitch);
      const lampTex = canvasTex(128, 64, (x, w, h) => { x.fillStyle = "#111"; x.fillRect(0, 0, w, h); x.fillStyle = "#fff"; for (let yy = 8; yy < h; yy += 18) for (let xx = 8; xx < w; xx += 20) { x.beginPath(); x.arc(xx + 4, yy + 4, 5, 0, 6.2832); x.fill(); } });
      [-1.15, 1.15].forEach((px) => { const head = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.26), new THREE.MeshBasicMaterial({ map: lampTex, toneMapped: false, color: new THREE.Color(1.1, 1.1, 1.1) })); head.position.set(px, 4.15, -1.7); add(head); });
      const crown = new THREE.Group();
      const cMat = new THREE.MeshStandardMaterial({ color: g.color, emissive: g.color, emissiveIntensity: 0.6, metalness: 0.8, roughness: 0.25 });
      crown.add(new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.12, 28, 1, true), cMat));
      for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; const sp = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.18, 6), cMat); sp.position.set(Math.cos(a) * 0.24, 0.14, Math.sin(a) * 0.24); crown.add(sp); }
      crown.position.set(0, 2.95, -0.9); add(crown);
      return (t) => { crown.rotation.y = t * 0.5; };
    },
    skybound(g, add) {
      const ribMat = new THREE.MeshStandardMaterial({ color: 0x8396ab, metalness: 0.85, roughness: 0.32 });
      for (let k = 0; k < 4; k++) { const rib = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.035, 6, 48, Math.PI), ribMat); rib.position.set(0, 0.05, -0.75 - k * 0.32); add(rib); }
      const plane = new THREE.Group();
      const white = std(0xe9eef7, { metalness: 0.3, roughness: 0.35 }), teal = std(0x2ec4b6), navy = std(0x16285a);
      const fus = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.06, 0.95, 12), white); fus.rotation.z = Math.PI / 2;
      const nose = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.2, 12), navy); nose.rotation.z = -Math.PI / 2; nose.position.x = 0.57;
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.02, 1.15), white); wing.position.set(0.08, -0.02, 0);
      const tip1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.025, 0.05), teal); tip1.position.set(0.08, -0.02, 0.58); const tip2 = tip1.clone(); tip2.position.z = -0.58;
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.02), navy); fin.position.set(-0.42, 0.12, 0);
      const stab = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.4), white); stab.position.set(-0.42, 0.02, 0);
      const prop = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.34, 0.03), navy); prop.position.x = 0.68;
      plane.add(fus, nose, wing, tip1, tip2, fin, stab, prop); plane.scale.setScalar(1.1); add(plane);
      const ringMat = new THREE.MeshStandardMaterial({ color: g.color, emissive: g.color, emissiveIntensity: 0.5, metalness: 0.9, roughness: 0.2 });
      const r1 = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 8, 40), ringMat); r1.position.set(-1.0, 3.3, -1.2); add(r1);
      return (t) => {
        plane.position.set(Math.sin(t * 0.45) * 0.55, 3.45 + Math.sin(t * 0.9) * 0.08, -1.2);
        plane.rotation.set(Math.sin(t * 0.45) * 0.25, Math.PI / 2 + Math.cos(t * 0.45) * 0.3, 0);
        prop.rotation.x = t * 30; r1.rotation.y = t * 0.5;
      };
    },
    rally(g, add) {
      const tbl = new THREE.Group();
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.045, 0.85), new THREE.MeshStandardMaterial({ color: 0x2f80ff, emissive: 0x1a4fd0, emissiveIntensity: 0.25, roughness: 0.35, metalness: 0.2 }));
      const edge = glowMat(0xffffff, 0.9);
      const l1 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.01, 0.02), edge); l1.position.set(0, 0.026, 0.415); const l2 = l1.clone(); l2.position.z = -0.415;
      const net = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.88), edge); net.position.y = 0.07;
      const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.24, 0.18), glowMat(0x24c8ff, 1)); p1.position.set(-0.85, 0.1, 0);
      const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.24, 0.18), glowMat(0x8a3dff, 1)); p2.position.set(0.85, 0.1, 0);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), glowMat(0xffffff, 1.1));
      tbl.add(top, l1, l2, net, p1, p2, ball);
      tbl.position.set(0, 3.25, -1.2); tbl.rotation.x = 0.45; add(tbl);
      return (t) => { ball.position.set(Math.sin(t * 1.8) * 0.75, 0.07 + Math.abs(Math.sin(t * 3.6)) * 0.16, 0); };
    },
    pixelpong(g, add) {
      const wallT = canvasTex(512, 360, (x, w, h) => {
        x.fillStyle = "#070b16"; x.fillRect(0, 0, w, h);
        x.strokeStyle = "rgba(82,229,255,.35)"; x.lineWidth = 3; x.strokeRect(10, 10, w - 20, h - 20);
        x.setLineDash([14, 12]); x.strokeStyle = "rgba(255,255,255,.35)"; x.beginPath(); x.moveTo(w / 2, 14); x.lineTo(w / 2, h - 14); x.stroke(); x.setLineDash([]);
        x.font = `700 70px ${FONT}`; x.textAlign = "center"; x.fillStyle = "rgba(82,229,255,.6)"; x.fillText("0", w / 2 - 80, 96); x.fillStyle = "rgba(255,79,154,.6)"; x.fillText("1", w / 2 + 80, 96);
      });
      const board = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.83), new THREE.MeshBasicMaterial({ map: wallT, toneMapped: false, color: new THREE.Color(0.8, 0.8, 0.8) })); board.position.set(0, 3.2, -1.72); add(board);
      const pa = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.06), glowMat(0x52e5ff, 1)); pa.position.set(-1.05, 3.2, -1.6);
      const pb = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.06), glowMat(0xff4f9a, 1)); pb.position.set(1.05, 3.2, -1.6);
      const ball = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.09), glowMat(0xffffff, 1.1)); add(pa, pb, ball);
      return (t) => {
        const bx = Math.asin(Math.sin(t * 1.4)) / (Math.PI / 2) * 0.92, by = 3.2 + Math.asin(Math.sin(t * 1.9)) / (Math.PI / 2) * 0.62;
        ball.position.set(bx, by, -1.6); pa.position.y += (by - pa.position.y) * 0.06; pb.position.y += (by - pb.position.y) * 0.06;
      };
    },
    atarifootball(g, add) {
      const fieldT = canvasTex(512, 350, (x, w, h) => {
        const gr = x.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.6); gr.addColorStop(0, "#1d3428"); gr.addColorStop(1, "#06100d");
        x.fillStyle = gr; x.fillRect(0, 0, w, h);
        x.strokeStyle = "rgba(217,255,86,.65)"; x.lineWidth = 4; x.strokeRect(24, 20, w - 48, h - 40);
        x.beginPath(); x.moveTo(w / 2, 20); x.lineTo(w / 2, h - 20); x.stroke(); x.beginPath(); x.arc(w / 2, h / 2, 46, 0, 6.2832); x.stroke();
        x.strokeRect(24, h / 2 - 70, 64, 140); x.strokeRect(w - 88, h / 2 - 70, 64, 140);
      });
      const board = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.78), new THREE.MeshBasicMaterial({ map: fieldT, toneMapped: false, color: new THREE.Color(0.85, 0.85, 0.85) })); board.position.set(0, 3.2, -1.72); add(board);
      const mk = (c) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 20), glowMat(c, 0.9)); m.rotation.x = Math.PI / 2; return m; };
      const blue = mk(0x4aa8ff), red = mk(0xff5b55), ball = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), glowMat(0xffffff, 1));
      add(blue, red, ball);
      return (t) => {
        blue.position.set(-0.5 + Math.sin(t * 0.9) * 0.2, 3.2 + Math.cos(t * 1.1) * 0.25, -1.62);
        red.position.set(0.55 + Math.sin(t * 1.0 + 1) * 0.2, 3.2 + Math.cos(t * 0.9 + 2) * 0.25, -1.62);
        ball.position.lerpVectors(blue.position, red.position, (Math.sin(t) + 1) / 2); ball.position.z = -1.58;
      };
    }
  };

  /* ---------------- Alcobas y estaciones ---------------- */
  const loader = new THREE.TextureLoader();
  const shotTex = [];
  const stations = [];
  const hitboxes = [];
  const finGeo = new THREE.BoxGeometry(0.14, 4.7, 2.7);
  const finEdgeGeo = new THREE.BoxGeometry(0.02, 4.4, 0.02);
  const plateGeo = new THREE.BoxGeometry(3.1, 0.06, 2.9);
  const plateEdgeGeo = new THREE.BoxGeometry(3.1, 0.02, 0.03);

  games.forEach((g, i) => {
    const a = (i - (N - 1) / 2) * STEP;
    const grp = new THREE.Group();
    grp.position.set(RADIUS * Math.sin(a), 0, -RADIUS * Math.cos(a));
    grp.rotation.y = -a;
    const color = new THREE.Color(g.color);
    const add = (...o) => grp.add(...o);

    /* Alcoba: panel de fondo, paredes laterales, cabecera con señal y plataforma */
    const back = new THREE.Mesh(new THREE.PlaneGeometry(3.24, 4.7), panelMat); back.position.set(0, 2.35, -1.95); add(back);
    const backLine = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.02, 0.02), glowMat(CYAN, 0.5)); backLine.position.set(0, 4.45, -1.93); add(backLine);
    const finEdgeMat = glowMat(CYAN, 0.35);
    [-1.62, 1.62].forEach((x) => {
      const fin = new THREE.Mesh(finGeo, metal); fin.position.set(x, 2.35, -0.6); add(fin);
      const edge = new THREE.Mesh(finEdgeGeo, finEdgeMat); edge.position.set(x * 0.955, 2.35, 0.76); add(edge);
    });
    const header = new THREE.Mesh(new THREE.BoxGeometry(3.38, 0.56, 0.36), metal); header.position.set(0, 4.82, 0.55); add(header);
    const signMat = new THREE.MeshBasicMaterial({ map: signTex(g, i), toneMapped: false, color: new THREE.Color(0, 0, 0) });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.4), signMat); sign.position.set(0, 4.82, 0.735); add(sign);
    const plate = new THREE.Mesh(plateGeo, metal); plate.position.set(0, 0.03, -0.45); add(plate);
    const plateEdgeMat = new THREE.MeshBasicMaterial({ color: color.clone(), toneMapped: false });
    const plateEdge = new THREE.Mesh(plateEdgeGeo, plateEdgeMat); plateEdge.position.set(0, 0.065, 1.0); add(plateEdge);
    const poolMat = new THREE.MeshBasicMaterial({ color, map: radialTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const pool = new THREE.Mesh(new THREE.CircleGeometry(1.25, 40), poolMat); pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.066, 0.05); add(pool);

    /* Máquina */
    const cab = new THREE.Group(); cab.position.set(0, 0.06, 0);
    if (FEATURED.includes(g.id)) cab.scale.setScalar(1.06);
    cab.add(new THREE.Mesh(cabGeo, bodyMat));
    const sMat = new THREE.MeshBasicMaterial({ map: sideTex(g, i), transparent: true, toneMapped: false, color: new THREE.Color(0.8, 0.8, 0.8) });
    const sideR = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.55), sMat); sideR.position.set(0.772, 1.0, -0.12); sideR.rotation.y = Math.PI / 2;
    const sideL = sideR.clone(); sideL.position.x = -0.772; sideL.rotation.y = -Math.PI / 2;
    cab.add(sideR, sideL);
    const scr = new THREE.Group(); scr.position.set(0, 1.615, 0.215); scr.rotation.x = SCREEN_TILT;
    const bezel = new THREE.Mesh(new THREE.PlaneGeometry(1.38, 0.82), darkMat); bezel.position.z = 0.006;
    const screenMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0, 0, 0), toneMapped: false });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.28, 0.72), screenMat); screen.position.z = 0.014;
    scr.add(bezel, screen); cab.add(scr);
    const mqMat = new THREE.MeshBasicMaterial({ map: marqueeTex(g), toneMapped: false, color: new THREE.Color(0, 0, 0) });
    const mq = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.375), mqMat); mq.position.set(0, 2.35, 0.388); cab.add(mq);
    const ctrlMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5, roughness: 0.3, metalness: 0.2 });
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 8), metal); stick.position.set(-0.35, 1.22, 0.47);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 10), ctrlMat); knob.position.set(-0.35, 1.3, 0.47);
    cab.add(stick, knob);
    [0.02, 0.18, 0.34].forEach((bx, k) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.03, 16), k === 1 ? std(0xdfe8f0) : ctrlMat); b.position.set(bx, 1.165, 0.5 - k * 0.02); cab.add(b); });
    add(cab);

    /* Luz cenital de la alcoba (se intensifica al seleccionar) */
    let spot = null;
    if (tier !== "low") {
      spot = new THREE.SpotLight(0xd8f0ff, 0, 11, 0.7, 0.6, 1.1);
      spot.position.set(0, 4.5, 1.4);
      spot.target.position.set(0, 1.2, -0.2);
      add(spot, spot.target);
    }

    const propUpdate = (PROPS[g.id] || (() => null))(g, add);

    const hit = new THREE.Mesh(new THREE.BoxGeometry(3.0, 4.6, 2.8), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(0, 2.3, -0.4); hit.userData.index = i; add(hit); hitboxes.push(hit);

    scene.add(grp);
    stations.push({ g, i, a, grp, cab, color, screenMat, mqMat, sMat, signMat, plateEdgeMat, poolMat, finEdgeMat, spot, propUpdate, glow: 0, power: 0 });
  });

  /* ---------------- Pantalla principal (canvas compuesto) ---------------- */
  function drawBig(sel) {
    const x = bigTex.userData.ctx, w = 1344, h = 504;
    x.save();
    x.fillStyle = "#02060c"; x.fillRect(0, 0, w, h);
    x.fillStyle = "rgba(255,255,255,.04)"; x.fillRect(0, 0, w, 56);
    x.fillStyle = "#65C3CC"; x.font = `700 26px ${FONT}`; x.textBaseline = "middle"; x.textAlign = "left"; x.fillText("BLACKDOT ARCADE", 26, 29);
    x.textAlign = "right"; x.fillStyle = "rgba(255,255,255,.7)"; x.font = `600 22px ${FONT}`;
    if (sel < 0) {
      x.fillText("ELIGE TU JUEGO", w - 26, 29);
      const cw = 420, chh = 200, gx = (w - cw * 3 - 24) / 2;
      for (let k = 0; k < N; k++) {
        const cx = gx + (k % 3) * (cw + 12), cy = 74 + Math.floor(k / 3) * (chh + 12);
        const img = shotTex[k] && shotTex[k].image;
        if (img) x.drawImage(img, 0, 0, img.width, img.height, cx, cy, cw, chh);
        x.fillStyle = games[k].color; x.fillRect(cx, cy + chh - 4, cw, 4);
        x.fillStyle = "rgba(2,6,12,.78)"; x.fillRect(cx, cy + chh - 40, cw, 36);
        x.fillStyle = "#fff"; x.textAlign = "left"; x.font = `700 21px ${FONT}`; x.fillText(`${pad(k + 1)}  ${games[k].name.toUpperCase()}`, cx + 14, cy + chh - 22);
      }
    } else {
      const g = games[sel];
      x.fillText(`ESTACIÓN ${pad(sel + 1)} / ${pad(N)}`, w - 26, 29);
      const img = shotTex[sel] && shotTex[sel].image;
      if (img) x.drawImage(img, 0, 0, img.width, img.height, 26, 76, 760, 404);
      x.fillStyle = g.color; x.fillRect(26, 476, 760, 4);
      x.textAlign = "left";
      x.fillStyle = "rgba(255,255,255,.5)"; x.font = `700 60px ${FONT}`; x.fillText(pad(sel + 1), 822, 132);
      x.fillStyle = "#fff"; const nm = g.name.toUpperCase(); fitFont(x, nm, 490, 50); x.fillText(nm, 822, 220);
      x.fillStyle = "rgba(255,255,255,.7)"; fitFont(x, g.genre.toUpperCase(), 490, 24, "600"); x.fillText(g.genre.toUpperCase(), 822, 274);
      x.fillStyle = g.color; x.fillRect(822, 318, 60, 4);
    }
    x.restore();
    bigTex.needsUpdate = true;
  }

  /* ---------------- Post-procesado (solo equipos potentes, muy contenido) ---------------- */
  let composer = null;
  if (tier === "high") {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.32, 0.4, 0.9));
    composer.addPass(new OutputPass());
  }

  /* ---------------- Cámara ---------------- */
  const camPos = new THREE.Vector3(0, 8, 26), camLook = new THREE.Vector3(0, 3, -8);
  let tween = null, selected = -1, hovered = -1, focusedMode = false;
  function overviewTarget() {
    const asp = camera.aspect;
    if (asp < 0.9) return { fov: 64, p: new THREE.Vector3(0, 5.6, 15.5), l: new THREE.Vector3(0, 2.8, -6) };
    if (asp < 1.35) return { fov: 56, p: new THREE.Vector3(0, 5, 13), l: new THREE.Vector3(0, 2.8, -6) };
    return { fov: 50, p: new THREE.Vector3(0, 4.6, 11), l: new THREE.Vector3(0, 2.7, -6.5) };
  }
  function focusTarget(i) {
    const s = stations[i], a = s.a;
    const lay = (opts.getLayout && opts.getLayout()) || { panel: "left", frac: 0.33 };
    const asp = camera.aspect, portrait = asp < 0.9;
    const fov = portrait ? 62 : asp < 1.35 ? 56 : 50;
    const dist = portrait ? 10.5 : asp < 1.35 ? 9.4 : 8.7;
    const S = s.grp.position;
    const d = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
    const right = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const p = S.clone().addScaledVector(d, dist); p.y = 2.9;
    const l = S.clone(); l.y = 2.55;
    const tanV = Math.tan(THREE.MathUtils.degToRad(fov / 2));
    if (lay.panel === "left") l.addScaledVector(right, -lay.frac * dist * tanV * asp);
    else l.y -= 0.3 * dist * tanV;
    return { fov, p, l };
  }
  function goTo(t, dur) {
    camera.fov = t.fov; camera.updateProjectionMatrix();
    if (reduced || dur === 0) { camPos.copy(t.p); camLook.copy(t.l); tween = null; return; }
    tween = { p0: camPos.clone(), l0: camLook.clone(), p1: t.p, l1: t.l, t: 0, dur, lift: camPos.distanceTo(t.p) > 3 ? 0.6 : 0.2 };
  }

  /* ---------------- Interacción ---------------- */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2(9, 9);
  let pointerMoved = false, lastClient = { x: 0, y: 0 }, down = null, dragX = 0, dragSmooth = 0;
  const par = { x: 0, y: 0, sx: 0, sy: 0 };
  const coarseOnly = window.matchMedia("(hover: none)").matches;
  function setNdc(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    lastClient = { x: e.clientX, y: e.clientY };
  }
  function pick() {
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(hitboxes, false)[0];
    return hit ? hit.object.userData.index : -1;
  }
  function onMove(e) {
    setNdc(e); pointerMoved = true; par.x = ndc.x; par.y = ndc.y;
    if (down && (e.pointerType !== "mouse" || (e.buttons & 1))) dragX = e.clientX - down.x;
  }
  function onDown(e) { down = { x: e.clientX, y: e.clientY, t: performance.now() }; dragX = 0; setNdc(e); }
  function onUp(e) {
    if (!down) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y, dt = performance.now() - down.t;
    down = null; dragX = 0;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) { opts.onSwipe && opts.onSwipe(dx < 0 ? 1 : -1); return; }
    if (Math.hypot(dx, dy) < 9 && dt < 700) { setNdc(e); const i = pick(); if (i >= 0) opts.onPick && opts.onPick(i); }
  }
  function onLeave() { ndc.set(9, 9); pointerMoved = true; par.x = par.y = 0; down = null; dragX = 0; }
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointerleave", onLeave);
  canvas.addEventListener("pointercancel", onLeave);
  function onLost(e) { e.preventDefault(); opts.onLost && opts.onLost(); }
  canvas.addEventListener("webglcontextlost", onLost);

  /* ---------------- Tamaño ---------------- */
  let started = false;
  function resize() {
    const w = container.clientWidth || innerWidth, h = container.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    if (composer) { composer.setSize(w, h); composer.setPixelRatio(pixelRatio); }
    if (reflector) reflector.getRenderTarget().setSize(Math.round(w * pixelRatio * 0.5), Math.round(h * pixelRatio * 0.5));
    if (started) goTo(selected >= 0 && focusedMode ? focusTarget(selected) : overviewTarget(), 0);
  }
  const ro = new ResizeObserver(() => resize());
  ro.observe(container);

  /* ---------------- Bucle con control de FPS ---------------- */
  const clock = new THREE.Clock();
  const right = new THREE.Vector3();
  let bigDim = 0.9, raf = 0, active = false, introT = -1, elapsed = 0, fpsAcc = 0, fpsN = 0, bigSel = -2;
  function frame() {
    raf = active ? requestAnimationFrame(frame) : 0;
    const dt = Math.min(0.05, clock.getDelta());
    if (!started || (opts.shouldRender && !opts.shouldRender())) return;
    elapsed += dt;
    const t = elapsed;

    /* Encendido progresivo de la sala */
    let powerAll = 1;
    if (introT >= 0) { introT += dt; powerAll = Math.min(1, introT / 1.4); }
    hemi.intensity = 1.5 * powerAll; key.intensity = 1.1 * powerAll;
    wall.material.emissiveIntensity = 0.6 * powerAll;
    ceiling.material.emissiveIntensity = 0.7 * powerAll;
    bigDim += ((focusedMode ? 0.22 : 0.9) - bigDim) * Math.min(1, dt * 3);
    bigMat.color.setScalar(powerAll > 0.5 ? bigDim : 0);

    if (tween) {
      tween.t += dt / tween.dur;
      const e = ease(Math.min(1, tween.t));
      camPos.lerpVectors(tween.p0, tween.p1, e); camPos.y += Math.sin(e * Math.PI) * tween.lift;
      camLook.lerpVectors(tween.l0, tween.l1, e);
      if (tween.t >= 1) tween = null;
    }
    if (!reduced) { par.sx += (par.x - par.sx) * 0.035; par.sy += (par.y - par.sy) * 0.035; }
    dragSmooth += (dragX - dragSmooth) * 0.15;
    camera.position.copy(camPos);
    right.subVectors(camLook, camPos).cross(camera.up).normalize();
    camera.position.addScaledVector(right, par.sx * 0.2 - dragSmooth * 0.004);
    camera.position.y += par.sy * 0.1;
    camera.lookAt(camLook);

    if (pointerMoved && !tween) {
      pointerMoved = false;
      hovered = coarseOnly ? -1 : pick();
      opts.onHover && opts.onHover(hovered, lastClient.x, lastClient.y);
    }

    for (const s of stations) {
      s.power = introT >= 0 ? Math.max(0, Math.min(1, (introT - 0.4 - s.i * 0.12) / 0.4)) : 1;
      const p = s.power;
      const target = s.i === selected ? 1 : s.i === hovered ? 0.6 : (focusedMode ? 0.15 : 0.3);
      s.glow += (target - s.glow) * Math.min(1, dt * 4);
      const gl = s.glow;
      s.screenMat.color.setScalar((0.6 + gl * 0.3) * p);
      s.mqMat.color.setScalar((0.6 + gl * 0.3) * p);
      s.signMat.color.setScalar((0.55 + gl * 0.4) * p);
      s.plateEdgeMat.color.copy(s.color).multiplyScalar((0.35 + gl * 0.85) * p);
      s.poolMat.opacity = gl * 0.22 * p;
      s.finEdgeMat.color.setHex(CYAN).multiplyScalar((0.2 + gl * 0.3) * p);
      if (s.spot) s.spot.intensity = (22 + gl * 55) * p * powerAll;
      if (s.propUpdate && !reduced) s.propUpdate(t, dt);
    }
    emblem.rotation.z = reduced ? 0 : t * 0.02;

    if (PCOUNT && !reduced) {
      const arr = pGeo.attributes.position.array;
      for (let i = 0; i < PCOUNT; i++) { arr[i * 3 + 1] += pSpd[i] * dt; if (arr[i * 3 + 1] > 8) arr[i * 3 + 1] = 0; }
      pGeo.attributes.position.needsUpdate = true;
    }

    const want = focusedMode ? selected : -1;
    if (want !== bigSel) { bigSel = want; drawBig(want); }

    if (composer) composer.render(dt); else renderer.render(scene, camera);

    /* Control de FPS: degrada calidad si el equipo no alcanza ~35 fps */
    fpsAcc += dt; fpsN++;
    if (fpsAcc > 2.5) {
      const avg = fpsAcc / fpsN; fpsAcc = 0; fpsN = 0;
      if (avg > 0.029 && introT > 2.5) {
        if (composer) { composer.dispose(); composer = null; }
        else if (pixelRatio > 0.8) { pixelRatio = Math.max(0.75, pixelRatio * 0.75); renderer.setPixelRatio(pixelRatio); resize(); }
        else if (reflector) { scene.remove(reflector); reflector.dispose(); reflector = null; floorMat.transparent = false; floorMat.needsUpdate = true; }
      }
    }
  }

  /* ---------------- Carga de capturas reales ---------------- */
  let loaded = 0;
  const fontsReady = (document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]) : Promise.resolve());
  const texPromises = games.map((g, i) => new Promise((res) => {
    loader.load(imgBase + g.shots[0] + "-640.webp", (tx) => {
      tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      shotTex[i] = tx; stations[i].screenMat.map = tx; stations[i].screenMat.needsUpdate = true;
      loaded++; opts.onProgress && opts.onProgress(loaded / N); res();
    }, undefined, () => { loaded++; res(); });
  }));
  const ready = Promise.all([fontsReady, ...texPromises]).then(() => {
    /* Redibuja las texturas de texto con la tipografía ya cargada */
    stations.forEach((s) => {
      const mq = marqueeTex(s.g); s.mqMat.map.dispose(); s.mqMat.map = mq;
      const sg = signTex(s.g, s.i); s.signMat.map.dispose(); s.signMat.map = sg;
      const sd = sideTex(s.g, s.i); s.sMat.map.dispose(); s.sMat.map = sd;
    });
    drawBig(-1); bigSel = -1;
    resize();
    renderer.compile(scene, camera);
  });

  /* ---------------- API ---------------- */
  return {
    ready,
    intro() {
      started = true;
      introT = reduced ? 99 : 0;
      camPos.set(0, 7, 24); camLook.set(0, 3.2, -8);
      goTo(overviewTarget(), reduced ? 0 : 2.2);
      selected = -1; focusedMode = false;
    },
    focus(i) { selected = i; focusedMode = true; if (started) goTo(focusTarget(i), 1.0); },
    overview() { focusedMode = false; selected = -1; goTo(overviewTarget(), 1.2); },
    setActive(on) {
      if (on === active) return;
      active = on;
      if (on) { clock.getDelta(); raf = requestAnimationFrame(frame); }
      else if (raf) { cancelAnimationFrame(raf); raf = 0; }
    },
    dispose() {
      this.setActive(false);
      ro.disconnect();
      canvas.removeEventListener("pointermove", onMove); canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp); canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointercancel", onLeave); canvas.removeEventListener("webglcontextlost", onLost);
      opts.onHover && opts.onHover(-1, 0, 0);
      const seen = new Set();
      scene.traverse((o) => {
        if (o.geometry && !seen.has(o.geometry)) { seen.add(o.geometry); o.geometry.dispose(); }
        const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        mats.forEach((m) => { if (seen.has(m)) return; seen.add(m); ["map", "emissiveMap"].forEach((k) => m[k] && m[k].dispose()); m.dispose(); });
      });
      if (reflector) reflector.dispose();
      if (composer) composer.dispose();
      if (scene.environment) scene.environment.dispose();
      pmrem.dispose(); radialTex.dispose(); gridTex.dispose(); bigTex.dispose(); cabGeo.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    }
  };
}
