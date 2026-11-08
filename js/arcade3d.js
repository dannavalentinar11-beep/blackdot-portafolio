/* ==========================================================================
   BLACKDOT ARCADE — sala 3D (Three.js r160, módulo ES)
   Se carga bajo demanda desde js/arcade.js solo cuando la persona entra.
   Geometría 100 % procedural (sin modelos externos): rotonda en arco con seis
   máquinas personalizadas, pantallas con capturas reales, suelo reflectante,
   haces de luz, señalización digital, partículas y una pantalla gigante.
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
  let tier = opts.tier || "high";
  const N = games.length;

  /* ---------------- Renderer ---------------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: tier !== "low", powerPreference: "high-performance", alpha: false, stencil: false });
  let pixelRatio = Math.min(devicePixelRatio || 1, tier === "high" ? 1.75 : tier === "medium" ? 1.5 : 1.25);
  renderer.setPixelRatio(pixelRatio);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x02050a, 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x02050a);
  scene.fog = new THREE.FogExp2(0x02050a, 0.028);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 140);

  /* ---------------- Utilidades de texturas ---------------- */
  function canvasTex(w, h, draw, srgb = true) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const x = c.getContext("2d"); draw(x, w, h);
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
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
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.35, "rgba(255,255,255,.45)"); g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g; x.fillRect(0, 0, w, w);
  });
  const beamTex = canvasTex(8, 256, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.55, "rgba(255,255,255,.25)"); g.addColorStop(1, "rgba(255,255,255,1)");
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  });

  /* ---------------- Entorno para reflejos metálicos (azul/cian BLACKDOT) ---------------- */
  const pmrem = new THREE.PMREMGenerator(renderer);
  {
    const envScene = new THREE.Scene();
    const envTex = canvasTex(512, 256, (x, w, h) => {
      const g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#0a2a48"); g.addColorStop(0.35, "#04101e"); g.addColorStop(0.5, "#02060c"); g.addColorStop(1, "#010306");
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.fillStyle = "rgba(101,195,204,.95)"; x.fillRect(0, h * 0.18, w, 5);
      x.fillStyle = "rgba(14,107,168,.9)"; x.fillRect(0, h * 0.26, w, 3);
      for (let i = 0; i < 6; i++) { x.fillStyle = "rgba(170,230,240,.8)"; x.fillRect(i * (w / 6) + 30, h * 0.06, 24, h * 0.32); }
    });
    const sph = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.MeshBasicMaterial({ map: envTex, side: THREE.BackSide }));
    envScene.add(sph);
    scene.environment = pmrem.fromScene(envScene, 0.02).texture;
    sph.geometry.dispose(); sph.material.dispose(); envTex.dispose();
  }

  /* ---------------- Luces ---------------- */
  const hemi = new THREE.HemisphereLight(0x5f93c8, 0x020408, 0.9);
  const key = new THREE.DirectionalLight(0xa9dcff, 0.9);
  key.position.set(0, 12, 10);
  scene.add(hemi, key);

  /* ---------------- Suelo ---------------- */
  const gridTex = canvasTex(256, 256, (x, w) => {
    x.fillStyle = "rgba(3,7,13,0.80)"; x.fillRect(0, 0, w, w);
    x.strokeStyle = "rgba(101,195,204,0.42)"; x.lineWidth = 2; x.strokeRect(0, 0, w, w);
    x.strokeStyle = "rgba(101,195,204,0.12)"; x.lineWidth = 1;
    x.beginPath(); x.moveTo(w / 2, 0); x.lineTo(w / 2, w); x.moveTo(0, w / 2); x.lineTo(w, w / 2); x.stroke();
  });
  gridTex.wrapS = gridTex.wrapT = THREE.RepeatWrapping; gridTex.repeat.set(36, 36);
  let reflector = null;
  if (tier !== "low") {
    reflector = new Reflector(new THREE.CircleGeometry(42, 64), {
      clipBias: 0.003, color: 0x8aa4bd,
      textureWidth: Math.round(innerWidth * pixelRatio * 0.5), textureHeight: Math.round(innerHeight * pixelRatio * 0.5)
    });
    reflector.rotation.x = -Math.PI / 2;
    scene.add(reflector);
  }
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x0a1320, map: gridTex, roughness: 0.42, metalness: 0.55, transparent: !!reflector, opacity: 1, envMapIntensity: 0.6 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(84, 84), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.004;
  scene.add(floor);

  /* Emblema central en el suelo */
  const emblemTex = canvasTex(1024, 1024, (x, w) => {
    const c = w / 2;
    x.translate(c, c);
    x.strokeStyle = "rgba(101,195,204,.85)"; x.lineWidth = 6; x.beginPath(); x.arc(0, 0, 470, 0, 6.2832); x.stroke();
    x.strokeStyle = "rgba(101,195,204,.35)"; x.lineWidth = 2; x.beginPath(); x.arc(0, 0, 440, 0, 6.2832); x.stroke();
    x.beginPath(); x.arc(0, 0, 300, 0, 6.2832); x.stroke();
    for (let i = 0; i < 120; i++) { x.save(); x.rotate((i / 120) * 6.2832); x.fillStyle = i % 10 === 0 ? "rgba(101,195,204,.9)" : "rgba(101,195,204,.35)"; x.fillRect(452, -1.5, i % 10 === 0 ? 22 : 10, 3); x.restore(); }
    const txt = "BLACKDOT ARCADE · ENTER THE GAME UNIVERSE · ";
    x.font = `600 34px ${FONT}`; x.fillStyle = "rgba(170,230,240,.9)"; x.textAlign = "center"; x.textBaseline = "middle";
    const chars = (txt + txt).split("");
    chars.forEach((ch, i) => { x.save(); x.rotate((i / chars.length) * 6.2832); x.fillText(ch, 0, -375); x.restore(); });
    x.fillStyle = "rgba(101,195,204,1)"; x.beginPath(); x.arc(0, 0, 26, 0, 6.2832); x.fill();
    x.strokeStyle = "rgba(14,107,168,.9)"; x.lineWidth = 3; x.beginPath(); x.arc(0, 0, 60, 0, 6.2832); x.stroke();
  });
  const emblem = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), new THREE.MeshBasicMaterial({ map: emblemTex, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  emblem.rotation.x = -Math.PI / 2; emblem.position.set(0, 0.012, -1.2);
  scene.add(emblem);

  /* ---------------- Arquitectura ---------------- */
  const wallTex = canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = "#000"; x.fillRect(0, 0, w, h);
    x.fillStyle = "rgba(101,195,204,.22)"; x.fillRect(0, 0, 2, h);
    x.fillStyle = "rgba(14,107,168,.55)"; x.fillRect(0, h * 0.72, w, 3);
    x.fillStyle = "rgba(101,195,204,.65)"; x.fillRect(0, h * 0.2, w, 2);
    x.fillStyle = "rgba(101,195,204,.08)";
    for (let i = 0; i < 4; i++) x.fillRect(40, 40 + i * 26, w - 80, 10);
    x.fillStyle = "rgba(101,195,204,.12)"; x.fillRect(w * 0.25, h * 0.32, w * 0.5, h * 0.3);
  });
  wallTex.wrapS = THREE.RepeatWrapping; wallTex.repeat.set(16, 1);
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(16.5, 16.5, 10, 120, 1, true, THREE.MathUtils.degToRad(68), THREE.MathUtils.degToRad(224)),
    new THREE.MeshStandardMaterial({ color: 0x060c16, roughness: 0.75, metalness: 0.35, side: THREE.BackSide, emissive: 0xffffff, emissiveMap: wallTex, emissiveIntensity: 0.9 })
  );
  wall.position.y = 5;
  scene.add(wall);

  const metal = new THREE.MeshStandardMaterial({ color: 0x0b121d, roughness: 0.32, metalness: 0.75, envMapIntensity: 0.9 });
  const cyanStrip = new THREE.MeshBasicMaterial({ color: new THREE.Color(CYAN).multiplyScalar(1.6), toneMapped: false });
  const blueStrip = new THREE.MeshBasicMaterial({ color: new THREE.Color(BLUE).multiplyScalar(2.2), toneMapped: false });
  const archMats = [cyanStrip, blueStrip];
  for (let k = 0; k <= N; k++) {
    if (k === N / 2) continue; /* deja libre el eje central para la pantalla gigante */
    const a = (k - N / 2) * STEP;
    const col = new THREE.Group();
    col.position.set(13.6 * Math.sin(a), 0, -13.6 * Math.cos(a)); col.rotation.y = -a;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.36, 8.6, 0.36), metal); body.position.y = 4.3;
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 8.2, 0.05), archMats[k % 2]); strip.position.set(0, 4.3, 0.2);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.7), metal); foot.position.y = 0.06;
    col.add(body, strip, foot);
    scene.add(col);
  }
  const rings = new THREE.Group();
  [[13.6, 8.0, cyanStrip], [11.2, 8.7, blueStrip], [8.4, 9.3, cyanStrip]].forEach(([r, y, m]) => {
    const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.05, 6, 180), m);
    t.rotation.x = Math.PI / 2; t.position.y = y; rings.add(t);
  });
  scene.add(rings);

  /* Pantalla gigante y señalización */
  const bigTex = canvasTex(1344, 504, () => {});
  const bigMat = new THREE.MeshBasicMaterial({ map: bigTex, toneMapped: false, color: new THREE.Color(0.0, 0.0, 0.0) });
  const bigGroup = new THREE.Group();
  bigGroup.position.set(0, 5.75, -15.3); bigGroup.rotation.x = 0.07;
  const bigFrame = new THREE.Mesh(new THREE.BoxGeometry(8.8, 3.55, 0.22), metal);
  const big = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 3.15), bigMat); big.position.z = 0.12;
  const bigTrim = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.04, 0.05), cyanStrip); bigTrim.position.set(0, -1.8, 0.12);
  const bigTrim2 = bigTrim.clone(); bigTrim2.position.y = 1.8;
  bigGroup.add(bigFrame, big, bigTrim, bigTrim2);
  scene.add(bigGroup);
  function signTex(l1, l2) {
    return canvasTex(640, 256, (x, w, h) => {
      x.fillStyle = "#02060c"; x.fillRect(0, 0, w, h);
      x.strokeStyle = "rgba(101,195,204,.7)"; x.lineWidth = 4; x.strokeRect(6, 6, w - 12, h - 12);
      x.fillStyle = "rgba(101,195,204,.08)"; for (let y = 0; y < h; y += 6) x.fillRect(0, y, w, 2);
      x.textAlign = "center"; x.textBaseline = "middle";
      x.fillStyle = "#fff"; x.shadowColor = "#65C3CC"; x.shadowBlur = 20; fitFont(x, l1, w - 70, 64); x.fillText(l1, w / 2, h * 0.42);
      x.shadowBlur = 0; x.fillStyle = "#65C3CC"; fitFont(x, l2, w - 90, 26, "600"); x.fillText(l2, w / 2, h * 0.74);
    });
  }
  const signs = [];
  [[-1, "06 JUEGOS", "3D + 2D · JUGABLES EN EL NAVEGADOR"], [1, "CHOOSE YOUR GAME", "ENTER THE EXPERIENCE"]].forEach(([s, a, b]) => {
    const ang = s * THREE.MathUtils.degToRad(37.5);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.44), new THREE.MeshBasicMaterial({ map: signTex(a, b), toneMapped: false, color: new THREE.Color(0, 0, 0) }));
    m.position.set(15.2 * Math.sin(ang), 5.9, -15.2 * Math.cos(ang)); m.rotation.y = -ang;
    scene.add(m); signs.push(m);
  });

  /* Partículas */
  const PCOUNT = tier === "high" ? 650 : tier === "medium" ? 380 : 170;
  const pPos = new Float32Array(PCOUNT * 3), pSpd = new Float32Array(PCOUNT);
  for (let i = 0; i < PCOUNT; i++) {
    pPos[i * 3] = (Math.random() - 0.5) * 34; pPos[i * 3 + 1] = Math.random() * 9; pPos[i * 3 + 2] = -17 + Math.random() * 26;
    pSpd[i] = 0.08 + Math.random() * 0.3;
  }
  const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.075, map: radialTex, color: CYAN, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  scene.add(particles);

  /* ---------------- Estaciones ---------------- */
  const loader = new THREE.TextureLoader();
  const shotTex = [];
  const stations = [];
  const hitboxes = [];
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0a111c, roughness: 0.36, metalness: 0.6, envMapIntensity: 1 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x020408, roughness: 0.6, metalness: 0.2 });

  /* Silueta de la máquina arcade (perfil lateral extruido) */
  const prof = new THREE.Shape();
  [[-0.55, 0], [0.55, 0], [0.55, 0.92], [0.76, 1.02], [0.63, 1.12], [0.3, 1.18], [0.12, 2.05], [0.38, 2.15], [0.38, 2.55], [-0.55, 2.55]].forEach((p, i) => (i ? prof.lineTo(p[0], p[1]) : prof.moveTo(p[0], p[1])));
  const cabGeo = new THREE.ExtrudeGeometry(prof, { depth: 1.5, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1 });
  cabGeo.rotateY(-Math.PI / 2); cabGeo.translate(0.75, 0, 0);
  const SCREEN_TILT = -Math.atan2(0.18, 0.87);

  function marqueeTex(g, i) {
    return canvasTex(512, 128, (x, w, h) => {
      x.fillStyle = "#03070d"; x.fillRect(0, 0, w, h);
      const gr = x.createLinearGradient(0, 0, w, 0);
      gr.addColorStop(0, "rgba(3,7,13,1)"); gr.addColorStop(0.5, rgba(g.color, 0.45)); gr.addColorStop(1, "rgba(3,7,13,1)");
      x.fillStyle = gr; x.fillRect(0, 0, w, h);
      x.strokeStyle = g.color; x.lineWidth = 5; x.strokeRect(5, 5, w - 10, h - 10);
      x.textAlign = "center"; x.textBaseline = "middle";
      x.fillStyle = rgba("#ffffff", 0.75); x.font = `600 17px ${FONT}`; x.fillText(`BLACKDOT ARCADE · ${pad(i + 1)}`, w / 2, 28);
      x.fillStyle = "#fff"; x.shadowColor = g.color; x.shadowBlur = 22;
      const name = g.name.toUpperCase(); fitFont(x, name, w - 50, 48); x.fillText(name, w / 2, 76);
    });
  }
  function sideTex(g, i) {
    return canvasTex(256, 420, (x, w, h) => {
      x.clearRect(0, 0, w, h);
      for (let k = 0; k < 3; k++) {
        x.fillStyle = rgba(g.color, 0.75 - k * 0.2);
        x.beginPath(); x.moveTo(-40 + k * 70, h); x.lineTo(20 + k * 70, h); x.lineTo(w + 40, 120 + k * 70); x.lineTo(w + 40, 60 + k * 70); x.closePath(); x.fill();
      }
      x.fillStyle = "rgba(255,255,255,.9)"; x.font = `700 92px ${FONT}`; x.textBaseline = "top"; x.fillText(pad(i + 1), 18, 16);
      x.font = `600 18px ${FONT}`; x.fillStyle = rgba(g.color, 1); x.fillText("BLACKDOT", 22, 118);
    });
  }
  function holoTex(g, i) {
    return canvasTex(256, 128, (x, w, h) => {
      x.textAlign = "center"; x.textBaseline = "middle";
      x.fillStyle = g.color; x.shadowColor = g.color; x.shadowBlur = 24; x.font = `700 74px ${FONT}`; x.fillText(pad(i + 1), w / 2, 52);
      x.shadowBlur = 0; x.fillStyle = "rgba(255,255,255,.85)"; fitFont(x, g.station.toUpperCase(), w - 20, 20, "600"); x.fillText(g.station.toUpperCase(), w / 2, 108);
    });
  }
  function glowMat(color, k = 1.6) { return new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), toneMapped: false }); }
  function std(color, extra = {}) { return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.45, metalness: 0.4 }, extra)); }

  /* Escenografía temática de cada juego */
  const PROPS = {
    cucuta(g, add) {
      const winTex = canvasTex(128, 256, (x, w, h) => {
        x.fillStyle = "#000"; x.fillRect(0, 0, w, h);
        for (let yy = 8; yy < h - 8; yy += 16) for (let xx = 8; xx < w - 8; xx += 18) {
          const r = Math.random();
          if (r > 0.42) { x.fillStyle = r > 0.85 ? "rgba(101,195,204,.9)" : "rgba(255,196,0,.9)"; x.fillRect(xx, yy, 9, 8); }
        }
      });
      const bMat = new THREE.MeshStandardMaterial({ color: 0x0b111b, roughness: 0.7, metalness: 0.3, emissive: 0xffffff, emissiveMap: winTex, emissiveIntensity: 0.85 });
      [[-1.65, 0.62, 2.7, -1.6], [-0.95, 0.52, 3.6, -1.95], [0.05, 0.75, 3.1, -2.2], [0.95, 0.56, 4.0, -1.85], [1.7, 0.62, 2.9, -1.55]].forEach(([px, w, h, pz]) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.55), bMat); m.position.set(px, h / 2, pz); add(m);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.03, 0.05), glowMat(g.color, 1.4)); roof.position.set(px, h + 0.02, pz + 0.28); add(roof);
      });
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 2.7, 8), metal); pole.position.set(1.45, 1.35, 0.55);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.04), metal); arm.position.set(1.27, 2.68, 0.55);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), glowMat(0xffe7a8, 2.2)); lamp.position.set(1.08, 2.62, 0.55);
      add(pole, arm, lamp);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 2.6, 8), std(0x5a4632, { metalness: 0 })); trunk.position.set(-1.45, 1.3, 0.35); trunk.rotation.z = 0.08;
      add(trunk);
      const leafMat = std(0x2f8a57, { metalness: 0, roughness: 0.8, side: THREE.DoubleSide });
      for (let k = 0; k < 7; k++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.11, 1.05, 4), leafMat);
        const a = (k / 7) * Math.PI * 2;
        leaf.position.set(-1.55 + Math.cos(a) * 0.35, 2.62, 0.35 + Math.sin(a) * 0.35);
        leaf.rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2);
        add(leaf);
      }
      const road = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.08), glowMat(g.color, 1.3));
      for (let k = -2; k <= 2; k++) { const d = road.clone(); d.rotation.x = -Math.PI / 2; d.position.set(k * 0.85, 0.015, 1.75); add(d); }
      return null;
    },
    dynasty(g, add) {
      const pitchTex = canvasTex(512, 300, (x, w, h) => {
        for (let k = 0; k < 10; k++) { x.fillStyle = k % 2 ? "#1d5a35" : "#174a2c"; x.fillRect((k * w) / 10, 0, w / 10 + 1, h); }
        x.strokeStyle = "rgba(255,255,255,.85)"; x.lineWidth = 4; x.strokeRect(14, 14, w - 28, h - 28);
        x.beginPath(); x.moveTo(w / 2, 14); x.lineTo(w / 2, h - 14); x.stroke();
        x.beginPath(); x.arc(w / 2, h / 2, 46, 0, 6.2832); x.stroke();
        x.strokeRect(14, h / 2 - 70, 70, 140); x.strokeRect(w - 84, h / 2 - 70, 70, 140);
      });
      const pitch = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 1.7), new THREE.MeshStandardMaterial({ map: pitchTex, emissive: 0xffffff, emissiveMap: pitchTex, emissiveIntensity: 0.45, roughness: 0.8 }));
      pitch.position.set(0, 2.85, -1.45); pitch.rotation.x = -0.22; add(pitch);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.8, 0.05), metal); frame.position.set(0, 2.85, -1.49); frame.rotation.x = -0.22; add(frame);
      const lampTex = canvasTex(128, 64, (x, w, h) => { x.fillStyle = "#111"; x.fillRect(0, 0, w, h); x.fillStyle = "#fff"; for (let yy = 8; yy < h; yy += 18) for (let xx = 8; xx < w; xx += 20) { x.beginPath(); x.arc(xx + 4, yy + 4, 6, 0, 6.2832); x.fill(); } });
      [-1.75, 1.75].forEach((px) => {
        const pole = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.1, 0.08), metal); pole.position.set(px, 2.05, -1.1);
        const head = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.32), new THREE.MeshBasicMaterial({ map: lampTex, toneMapped: false, color: new THREE.Color(2, 2, 2) }));
        head.position.set(px, 4.15, -1.04); head.rotation.set(-0.35, -px * 0.12, 0);
        add(pole, head);
      });
      const crown = new THREE.Group();
      const cMat = new THREE.MeshStandardMaterial({ color: g.color, emissive: g.color, emissiveIntensity: 1.3, metalness: 0.8, roughness: 0.25 });
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.14, 28, 1, true), cMat); crown.add(band);
      for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; const sp = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 6), cMat); sp.position.set(Math.cos(a) * 0.3, 0.17, Math.sin(a) * 0.3); crown.add(sp); }
      crown.position.set(0, 4.15, -1.2); add(crown);
      return (t) => { crown.rotation.y = t * 0.8; crown.position.y = 4.15 + Math.sin(t * 1.6) * 0.07; };
    },
    skybound(g, add) {
      const ribMat = new THREE.MeshStandardMaterial({ color: 0x8fa3b8, metalness: 0.85, roughness: 0.3 });
      for (let k = 0; k < 5; k++) {
        const rib = new THREE.Mesh(new THREE.TorusGeometry(2.55, 0.045, 6, 48, Math.PI), k === 0 ? glowMat(g.color, 1.4) : ribMat);
        rib.position.set(0, 0, -0.55 - k * 0.42); add(rib);
      }
      const plane = new THREE.Group();
      const white = std(0xe9eef7, { metalness: 0.3, roughness: 0.35 }), teal = std(0x2ec4b6, { emissive: 0x2ec4b6, emissiveIntensity: 0.4 }), navy = std(0x16285a);
      const fus = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.06, 0.95, 12), white); fus.rotation.z = Math.PI / 2;
      const nose = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.2, 12), navy); nose.rotation.z = -Math.PI / 2; nose.position.x = 0.57;
      const wing = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.02, 1.15), white); wing.position.set(0.08, -0.02, 0);
      const tip1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.025, 0.05), teal); tip1.position.set(0.08, -0.02, 0.58);
      const tip2 = tip1.clone(); tip2.position.z = -0.58;
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.02), navy); fin.position.set(-0.42, 0.12, 0);
      const stab = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.4), white); stab.position.set(-0.42, 0.02, 0);
      const prop = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.34, 0.03), navy); prop.position.x = 0.68;
      plane.add(fus, nose, wing, tip1, tip2, fin, stab, prop);
      plane.scale.setScalar(1.25); add(plane);
      const ringMat = new THREE.MeshStandardMaterial({ color: g.color, emissive: g.color, emissiveIntensity: 1.2, metalness: 0.9, roughness: 0.2 });
      const r1 = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.03, 8, 40), ringMat); r1.position.set(-1.3, 3.1, -0.7);
      const r2 = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.025, 8, 40), ringMat); r2.position.set(1.35, 3.6, -0.95);
      add(r1, r2);
      return (t) => {
        const a = t * 0.55;
        plane.position.set(Math.cos(a) * 0.95, 3.35 + Math.sin(t * 1.3) * 0.12, -0.9 + Math.sin(a) * 0.55);
        plane.rotation.set(Math.sin(a) * 0.5, -a - Math.PI / 2, 0);
        prop.rotation.x = t * 40;
        r1.rotation.y = t * 0.7; r2.rotation.y = -t * 0.9;
      };
    },
    rally(g, add) {
      const arc = new THREE.Mesh(new THREE.TorusGeometry(2.45, 0.04, 6, 60, Math.PI), glowMat(0x24c8ff, 1.5)); arc.position.set(0, 0, -1.75); add(arc);
      const tbl = new THREE.Group();
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.05, 0.95), new THREE.MeshStandardMaterial({ color: 0x2f80ff, emissive: 0x1a4fd0, emissiveIntensity: 0.5, roughness: 0.35, metalness: 0.2 }));
      const edge = glowMat(0xffffff, 1.2);
      const l1 = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.012, 0.02), edge); l1.position.set(0, 0.03, 0.465);
      const l2 = l1.clone(); l2.position.z = -0.465;
      const net = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, 0.98), edge); net.position.y = 0.08;
      const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 0.2), glowMat(0x24c8ff, 1.5)); p1.position.set(-0.95, 0.12, 0);
      const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 0.2), glowMat(0x8a3dff, 1.6)); p2.position.set(0.95, 0.12, 0);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), glowMat(0xffffff, 1.6));
      tbl.add(top, l1, l2, net, p1, p2, ball);
      tbl.position.set(0, 3.2, -1.0); tbl.rotation.x = 0.38; add(tbl);
      return (t) => {
        const s = Math.sin(t * 2.2);
        ball.position.set(s * 0.85, 0.08 + Math.abs(Math.sin(t * 4.4)) * 0.2, Math.sin(t * 1.3) * 0.25);
        p1.position.z = Math.sin(t * 1.3) * 0.22; p2.position.z = Math.sin(t * 1.3 + 0.4) * 0.22;
        tbl.position.y = 3.2 + Math.sin(t * 0.9) * 0.06;
      };
    },
    pixelpong(g, add) {
      const wallT = canvasTex(512, 360, (x, w, h) => {
        x.fillStyle = "#070b16"; x.fillRect(0, 0, w, h);
        x.strokeStyle = "rgba(82,229,255,.12)"; x.lineWidth = 1;
        for (let xx = 0; xx < w; xx += 32) { x.beginPath(); x.moveTo(xx, 0); x.lineTo(xx, h); x.stroke(); }
        for (let yy = 0; yy < h; yy += 32) { x.beginPath(); x.moveTo(0, yy); x.lineTo(w, yy); x.stroke(); }
        x.strokeStyle = "rgba(82,229,255,.6)"; x.lineWidth = 4; x.strokeRect(10, 10, w - 20, h - 20);
        x.setLineDash([14, 12]); x.strokeStyle = "rgba(255,255,255,.5)"; x.beginPath(); x.moveTo(w / 2, 14); x.lineTo(w / 2, h - 14); x.stroke(); x.setLineDash([]);
        x.beginPath(); x.arc(w / 2, h / 2, 44, 0, 6.2832); x.strokeStyle = "rgba(255,255,255,.25)"; x.stroke();
        x.font = `700 80px ${FONT}`; x.textAlign = "center"; x.fillStyle = "rgba(82,229,255,.85)"; x.fillText("0", w / 2 - 90, 100); x.fillStyle = "rgba(255,79,154,.85)"; x.fillText("1", w / 2 + 90, 100);
      });
      const board = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 2.04), new THREE.MeshBasicMaterial({ map: wallT, toneMapped: false })); board.position.set(0, 3.0, -1.55); add(board);
      const pa = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), glowMat(0x52e5ff, 1.7)); pa.position.set(-1.15, 3.0, -1.3);
      const pb = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), glowMat(0xff4f9a, 1.7)); pb.position.set(1.15, 3.0, -1.3);
      const ball = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.11), glowMat(0xffffff, 1.8));
      add(pa, pb, ball);
      return (t) => {
        const bx = Math.asin(Math.sin(t * 1.7)) / (Math.PI / 2) * 1.02;
        const by = 3.0 + Math.asin(Math.sin(t * 2.3)) / (Math.PI / 2) * 0.72;
        ball.position.set(bx, by, -1.3); ball.rotation.set(t, t * 1.3, 0);
        pa.position.y += (by - pa.position.y) * 0.08; pb.position.y += (by - pb.position.y) * 0.08;
      };
    },
    atarifootball(g, add) {
      const fieldT = canvasTex(512, 350, (x, w, h) => {
        const gr = x.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.6); gr.addColorStop(0, "#20382b"); gr.addColorStop(1, "#06100d");
        x.fillStyle = gr; x.fillRect(0, 0, w, h);
        x.strokeStyle = "rgba(217,255,86,.85)"; x.lineWidth = 4; x.strokeRect(24, 20, w - 48, h - 40);
        x.beginPath(); x.moveTo(w / 2, 20); x.lineTo(w / 2, h - 20); x.stroke();
        x.beginPath(); x.arc(w / 2, h / 2, 48, 0, 6.2832); x.stroke();
        x.strokeRect(24, h / 2 - 70, 64, 140); x.strokeRect(w - 88, h / 2 - 70, 64, 140);
        x.fillStyle = "rgba(217,255,86,.9)"; x.fillRect(14, h / 2 - 34, 10, 68); x.fillRect(w - 24, h / 2 - 34, 10, 68);
      });
      const board = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 1.98), new THREE.MeshBasicMaterial({ map: fieldT, toneMapped: false })); board.position.set(0, 3.0, -1.55); board.rotation.x = -0.08; add(board);
      const mk = (c) => { const gq = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 20), glowMat(c, 1.3)); b.rotation.x = Math.PI / 2; const r = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.012, 6, 24), glowMat(0xffffff, 1.4)); gq.add(b, r); return gq; };
      const blue = mk(0x4aa8ff), red = mk(0xff5b55);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), glowMat(0xffffff, 1.6));
      add(blue, red, ball);
      return (t) => {
        blue.position.set(-0.55 + Math.sin(t * 1.1) * 0.25, 3.0 + Math.cos(t * 1.4) * 0.3, -1.4);
        red.position.set(0.6 + Math.sin(t * 1.3 + 1) * 0.25, 3.0 + Math.cos(t * 1.1 + 2) * 0.3, -1.4);
        const k = (Math.sin(t * 1.2) + 1) / 2;
        ball.position.lerpVectors(blue.position, red.position, k); ball.position.z = -1.32;
      };
    }
  };

  games.forEach((g, i) => {
    const a = (i - (N - 1) / 2) * STEP;
    const grp = new THREE.Group();
    grp.position.set(RADIUS * Math.sin(a), 0, -RADIUS * Math.cos(a));
    grp.rotation.y = -a;
    const color = new THREE.Color(g.color);
    const add = (...o) => grp.add(...o);

    /* Pedestal con anillo de luz */
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.4, 0.1, 48), metal); ped.position.y = 0.05;
    const ringMat = new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(1.6), toneMapped: false });
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.36, 1.44, 64), ringMat); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.103;
    const discMat = new THREE.MeshBasicMaterial({ color, map: radialTex, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.34, 48), discMat); disc.rotation.x = -Math.PI / 2; disc.position.y = 0.106;
    add(ped, ring, disc);

    /* Máquina */
    const cab = new THREE.Group(); cab.position.y = 0.1;
    cab.add(new THREE.Mesh(cabGeo, bodyMat));
    const sMat = new THREE.MeshBasicMaterial({ map: sideTex(g, i), transparent: true, toneMapped: false, color: new THREE.Color(0.9, 0.9, 0.9) });
    const sideR = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.55), sMat); sideR.position.set(0.772, 1.0, -0.12); sideR.rotation.y = Math.PI / 2;
    const sideL = sideR.clone(); sideL.position.x = -0.772; sideL.rotation.y = -Math.PI / 2;
    cab.add(sideR, sideL);
    const scr = new THREE.Group(); scr.position.set(0, 1.615, 0.215); scr.rotation.x = SCREEN_TILT;
    const bezel = new THREE.Mesh(new THREE.PlaneGeometry(1.38, 0.82), darkMat); bezel.position.z = 0.006;
    const screenMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0, 0, 0), toneMapped: false });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.28, 0.72), screenMat); screen.position.z = 0.014;
    scr.add(bezel, screen); cab.add(scr);
    const mqMat = new THREE.MeshBasicMaterial({ map: marqueeTex(g, i), toneMapped: false, color: new THREE.Color(0, 0, 0) });
    const mq = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.375), mqMat); mq.position.set(0, 2.35, 0.388); cab.add(mq);
    const trimMat = new THREE.MeshBasicMaterial({ color: color.clone(), toneMapped: false });
    [[0.77, 0.485, 0.565, 0.03, 0.87, 0.03], [-0.77, 0.485, 0.565, 0.03, 0.87, 0.03], [0, 2.15, 0.392, 1.52, 0.025, 0.03], [0, 2.56, 0.385, 1.52, 0.025, 0.03], [0, 1.02, 0.77, 1.52, 0.025, 0.03], [0.77, 1.78, 0.25, 0.03, 0.75, 0.03], [-0.77, 1.78, 0.25, 0.03, 0.75, 0.03]].forEach(([x, y, z, w, h, d]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), trimMat); m.position.set(x, y, z); cab.add(m);
    });
    const ctrlMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9, roughness: 0.3, metalness: 0.2 });
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 8), metal); stick.position.set(-0.35, 1.22, 0.47);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 10), ctrlMat); knob.position.set(-0.35, 1.3, 0.47);
    cab.add(stick, knob);
    [0.02, 0.18, 0.34].forEach((bx, k) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.03, 16), k === 1 ? glowMat(0xffffff, 1.2) : ctrlMat); b.position.set(bx, 1.165, 0.5 - k * 0.02); cab.add(b); });
    const coin = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.16), glowMat(0xff8a3d, 1.3)); coin.position.set(-0.16, 0.62, 0.557);
    const coin2 = coin.clone(); coin2.position.x = 0.16;
    cab.add(coin, coin2);
    add(cab);

    /* Holograma con el número de estación */
    const holoMat = new THREE.MeshBasicMaterial({ map: holoTex(g, i), transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const holo = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.475), holoMat); holo.position.set(0, 3.05, 0.35);
    add(holo);

    /* Haz de luz volumétrico */
    const beamMat = new THREE.MeshBasicMaterial({ color, map: beamTex, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 1.4, 7, 32, 1, true), beamMat); beam.position.y = 3.5;
    add(beam);

    /* Luz propia */
    let light = null;
    if (tier !== "low") { light = new THREE.PointLight(color, 0, 9, 1.6); light.position.set(0, 2.9, 1.7); add(light); }

    /* Escenografía temática */
    const propUpdate = (PROPS[g.id] || (() => null))(g, add);

    /* Zona de interacción */
    const hit = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.6, 2.6), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(0, 1.8, 0); hit.userData.index = i; add(hit); hitboxes.push(hit);

    scene.add(grp);
    stations.push({ g, i, a, grp, cab, color, ring, discMat, trimMat, screenMat, mqMat, sMat, holo, holoMat, beamMat, light, propUpdate, glow: 0, power: 0, powerAt: 0 });
  });

  /* ---------------- Pantalla gigante (canvas compuesto) ---------------- */
  function drawBig(sel) {
    const x = bigTex.userData.ctx, w = 1344, h = 504;
    x.save();
    x.fillStyle = "#02060c"; x.fillRect(0, 0, w, h);
    x.fillStyle = "rgba(14,107,168,.35)"; x.fillRect(0, 0, w, 54);
    x.fillStyle = "#65C3CC"; x.font = `700 26px ${FONT}`; x.textBaseline = "middle"; x.textAlign = "left"; x.fillText("BLACKDOT ARCADE", 24, 28);
    x.textAlign = "right"; x.fillStyle = "rgba(255,255,255,.8)"; x.font = `600 20px ${FONT}`;
    if (sel < 0) {
      x.fillText("CHOOSE YOUR GAME", w - 24, 28);
      const cw = 420, chh = 210, gx = (w - cw * 3 - 24) / 2;
      for (let k = 0; k < N; k++) {
        const cx = gx + (k % 3) * (cw + 12), cy = 66 + Math.floor(k / 3) * (chh + 12);
        const img = shotTex[k] && shotTex[k].image;
        if (img) x.drawImage(img, 0, 0, img.width, img.height, cx, cy, cw, chh);
        x.strokeStyle = games[k].color; x.lineWidth = 3; x.strokeRect(cx + 1.5, cy + 1.5, cw - 3, chh - 3);
        x.fillStyle = "rgba(2,6,12,.75)"; x.fillRect(cx, cy + chh - 36, cw, 36);
        x.fillStyle = "#fff"; x.textAlign = "left"; x.font = `700 20px ${FONT}`; x.fillText(`${pad(k + 1)}  ${games[k].name.toUpperCase()}`, cx + 12, cy + chh - 18);
      }
    } else {
      const g = games[sel];
      x.fillText(`NOW SELECTING · ESTACIÓN ${pad(sel + 1)} / ${pad(N)}`, w - 24, 28);
      const img = shotTex[sel] && shotTex[sel].image;
      if (img) x.drawImage(img, 0, 0, img.width, img.height, 20, 70, 768, 414);
      x.strokeStyle = g.color; x.lineWidth = 4; x.strokeRect(20, 70, 768, 414);
      x.textAlign = "left";
      x.fillStyle = g.color; x.font = `700 92px ${FONT}`; x.fillText(pad(sel + 1), 820, 140);
      x.fillStyle = "#fff"; const nm = g.name.toUpperCase(); fitFont(x, nm, 500, 52); x.fillText(nm, 820, 236);
      x.fillStyle = g.color; fitFont(x, g.genre.toUpperCase(), 500, 24, "600"); x.fillText(g.genre.toUpperCase(), 820, 290);
      x.fillStyle = "rgba(255,255,255,.7)"; fitFont(x, g.station.toUpperCase() + " · " + g.dim, 500, 22, "600"); x.fillText(g.station.toUpperCase() + " · " + g.dim, 820, 330);
      x.fillStyle = g.color; x.beginPath(); x.roundRect ? x.roundRect(820, 390, 230, 64, 32) : x.rect(820, 390, 230, 64); x.fill();
      x.fillStyle = "#03101c"; x.font = `700 24px ${FONT}`; x.fillText("PLAY NOW ▶", 852, 423);
    }
    x.fillStyle = "rgba(0,0,0,.18)"; for (let y = 0; y < h; y += 4) x.fillRect(0, y, w, 1);
    x.restore();
    bigTex.needsUpdate = true;
  }

  /* ---------------- Post-procesado ---------------- */
  let composer = null, bloom = null;
  function buildComposer() {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.5, 0.86);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }
  if (tier === "high") buildComposer();

  /* ---------------- Cámara: vista general, enfoque y recorrido ---------------- */
  const camPos = new THREE.Vector3(0, 8, 26), camLook = new THREE.Vector3(0, 3, -8);
  let tween = null, selected = -1, hovered = -1, focusedMode = false;
  function overviewTarget() {
    const asp = camera.aspect;
    if (asp < 0.9) return { fov: 64, p: new THREE.Vector3(0, 5.6, 15.5), l: new THREE.Vector3(0, 2.6, -6) };
    if (asp < 1.35) return { fov: 56, p: new THREE.Vector3(0, 5, 13), l: new THREE.Vector3(0, 2.5, -6) };
    return { fov: 50, p: new THREE.Vector3(0, 4.4, 10.8), l: new THREE.Vector3(0, 2.5, -6.5) };
  }
  function focusTarget(i) {
    const s = stations[i], a = s.a;
    const lay = (opts.getLayout && opts.getLayout()) || { panel: "left", frac: 0.33 };
    const asp = camera.aspect, portrait = asp < 0.9;
    const fov = portrait ? 62 : asp < 1.35 ? 56 : 50;
    const dist = portrait ? 8.6 : asp < 1.35 ? 7.4 : 6.5;
    const S = s.grp.position;
    const d = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
    const right = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const p = S.clone().addScaledVector(d, dist); p.y = 2.4;
    const l = S.clone(); l.y = 1.9;
    const tanV = Math.tan(THREE.MathUtils.degToRad(fov / 2));
    if (lay.panel === "left") {
      const ndc = lay.frac; /* desplaza la máquina a la derecha del panel */
      l.addScaledVector(right, -ndc * dist * tanV * asp);
    } else {
      l.y -= 0.3 * dist * tanV; /* la máquina queda por encima del panel inferior */
    }
    return { fov, p, l };
  }
  function goTo(t, dur) {
    camera.fov = t.fov; camera.updateProjectionMatrix();
    if (reduced || dur === 0) { camPos.copy(t.p); camLook.copy(t.l); tween = null; return; }
    tween = { p0: camPos.clone(), l0: camLook.clone(), p1: t.p, l1: t.l, t: 0, dur, lift: camPos.distanceTo(t.p) > 3 ? 0.9 : 0.3 };
  }

  /* ---------------- Interacción ---------------- */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2(9, 9);
  let pointerMoved = false, lastClient = { x: 0, y: 0 }, down = null, dragX = 0, dragSmooth = 0;
  const par = { x: 0, y: 0, sx: 0, sy: 0 };
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
    setNdc(e); pointerMoved = true;
    par.x = ndc.x; par.y = ndc.y;
    if (down && e.pointerType !== "mouse") dragX = e.clientX - down.x;
    else if (down && (e.buttons & 1)) dragX = e.clientX - down.x;
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
  let raf = 0, active = false, started = false, introT = -1, elapsed = 0, fpsAcc = 0, fpsN = 0, degrade = 0, bigSel = -2;
  const tmpC = new THREE.Color();
  function frame() {
    raf = active ? requestAnimationFrame(frame) : 0;
    const dt = Math.min(0.05, clock.getDelta());
    if (!started || (opts.shouldRender && !opts.shouldRender())) return;
    elapsed += dt;
    const t = elapsed;

    /* Encendido progresivo */
    let powerAll = 1;
    if (introT >= 0) { introT += dt; powerAll = Math.min(1, introT / 1.6); }
    hemi.intensity = 0.9 * powerAll; key.intensity = 0.9 * powerAll;
    wall.material.emissiveIntensity = 0.9 * powerAll;
    cyanStrip.color.setHex(CYAN).multiplyScalar(1.6 * powerAll);
    blueStrip.color.setHex(BLUE).multiplyScalar(2.2 * powerAll);
    bigMat.color.setScalar(powerAll > 0.6 ? 0.95 : 0);
    signs.forEach((s) => s.material.color.setScalar(powerAll > 0.75 ? 0.9 : 0));

    /* Cámara */
    if (tween) {
      tween.t += dt / tween.dur;
      const e = ease(Math.min(1, tween.t));
      camPos.lerpVectors(tween.p0, tween.p1, e); camPos.y += Math.sin(e * Math.PI) * tween.lift;
      camLook.lerpVectors(tween.l0, tween.l1, e);
      if (tween.t >= 1) tween = null;
    }
    if (!reduced) { par.sx += (par.x - par.sx) * 0.04; par.sy += (par.y - par.sy) * 0.04; }
    dragSmooth += (dragX - dragSmooth) * 0.15;
    camera.position.copy(camPos);
    const right = new THREE.Vector3().subVectors(camLook, camPos).cross(camera.up).normalize();
    camera.position.addScaledVector(right, par.sx * 0.28 - dragSmooth * 0.004);
    camera.position.y += par.sy * 0.16;
    camera.lookAt(camLook);

    /* Hover por raycast */
    if (pointerMoved && !tween) {
      pointerMoved = false;
      const i = coarseOnly ? -1 : pick();
      if (i !== hovered) hovered = i;
      opts.onHover && opts.onHover(hovered, lastClient.x, lastClient.y);
    }

    /* Estaciones */
    for (const s of stations) {
      if (introT >= 0) s.power = Math.max(0, Math.min(1, (introT - 0.5 - s.i * 0.14) / 0.35));
      else s.power = 1;
      const flicker = s.power > 0 && s.power < 1 ? (Math.random() > 0.5 ? 1 : 0.35) : 1;
      const p = s.power * flicker;
      const target = s.i === selected ? 1 : s.i === hovered ? 0.72 : (focusedMode ? 0.12 : 0.3);
      s.glow += (target - s.glow) * Math.min(1, dt * 5);
      const gl = s.glow;
      s.trimMat.color.copy(s.color).multiplyScalar((0.6 + gl * 1.0) * p);
      s.screenMat.color.setScalar((0.55 + gl * 0.37) * p);
      s.mqMat.color.setScalar((0.55 + gl * 0.4) * p);
      s.discMat.opacity = (0.1 + gl * 0.28) * p;
      s.beamMat.opacity = (0.03 + gl * 0.1) * p;
      s.holoMat.opacity = (0.3 + gl * 0.6) * p;
      s.holo.position.y = 3.05 + Math.sin(t * 1.4 + s.i) * 0.05;
      s.ring.material.color.copy(s.color).multiplyScalar((0.9 + gl * 0.9 + (s.i === selected ? Math.sin(t * 4) * 0.3 : 0)) * p);
      if (s.light) s.light.intensity = (1.2 + gl * 4) * p * powerAll;
      s.cab.position.y = 0.1 + gl * 0.03;
      if (s.propUpdate && !reduced) s.propUpdate(t, dt);
    }
    emblem.rotation.z = reduced ? 0 : t * 0.05;
    rings.rotation.y = reduced ? 0 : t * 0.02;

    /* Partículas */
    if (!reduced) {
      const arr = pGeo.attributes.position.array;
      for (let i = 0; i < PCOUNT; i++) { arr[i * 3 + 1] += pSpd[i] * dt; if (arr[i * 3 + 1] > 9) arr[i * 3 + 1] = 0; }
      pGeo.attributes.position.needsUpdate = true;
    }

    /* Pantalla gigante */
    const want = focusedMode ? selected : -1;
    if (want !== bigSel) { bigSel = want; drawBig(want); }

    if (composer) composer.render(dt); else renderer.render(scene, camera);

    /* Control de FPS: degrada calidad si el equipo no alcanza ~35 fps */
    fpsAcc += dt; fpsN++;
    if (fpsAcc > 2.5) {
      const avg = fpsAcc / fpsN; fpsAcc = 0; fpsN = 0;
      if (avg > 0.029 && started && introT > 2.5) {
        degrade++;
        if (composer) { composer.dispose(); composer = null; bloom = null; }
        else if (pixelRatio > 0.8) { pixelRatio = Math.max(0.75, pixelRatio * 0.75); renderer.setPixelRatio(pixelRatio); resize(); }
        else if (reflector) { scene.remove(reflector); reflector.dispose(); reflector = null; floorMat.transparent = false; floorMat.needsUpdate = true; }
      }
    }
  }
  const coarseOnly = window.matchMedia("(hover: none)").matches;

  /* ---------------- Carga de capturas reales ---------------- */
  let loaded = 0;
  const total = N;
  const fontsReady = (document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]) : Promise.resolve());
  const texPromises = games.map((g, i) => new Promise((res) => {
    loader.load(imgBase + g.shots[0] + "-640.webp", (tx) => {
      tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      shotTex[i] = tx; stations[i].screenMat.map = tx; stations[i].screenMat.needsUpdate = true;
      loaded++; opts.onProgress && opts.onProgress(loaded / total); res();
    }, undefined, () => { loaded++; res(); });
  }));
  const ready = Promise.all([fontsReady, ...texPromises]).then(() => {
    /* Redibuja las texturas de texto con la tipografía ya cargada */
    stations.forEach((s) => {
      const fresh = marqueeTex(s.g, s.i); s.mqMat.map.dispose(); s.mqMat.map = fresh;
      const sd = sideTex(s.g, s.i); s.sMat.map.dispose(); s.sMat.map = sd;
      const hl = holoTex(s.g, s.i); s.holoMat.map.dispose(); s.holoMat.map = hl;
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
      camPos.set(0, 7.5, 25); camLook.set(0, 3.2, -8);
      goTo(overviewTarget(), reduced ? 0 : 2.6);
      selected = -1; focusedMode = false;
    },
    focus(i) { selected = i; focusedMode = true; if (started) goTo(focusTarget(i), 1.05); },
    overview() { focusedMode = false; selected = -1; goTo(overviewTarget(), 1.3); },
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
      pmrem.dispose(); radialTex.dispose(); beamTex.dispose(); gridTex.dispose(); bigTex.dispose(); cabGeo.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    }
  };
}
