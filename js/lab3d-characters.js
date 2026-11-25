/* ==========================================================================
   BLACKDOT 3D LAB — configuración de personajes
   --------------------------------------------------------------------------
   Para añadir un personaje nuevo basta con exportar su GLB a assets/models/
   y agregar un objeto a LAB_CHARACTERS (no hay que tocar js/lab3d.js).

   Campos:
     id, name, role, description  Textos de la ficha.
     color                         Acento del personaje (selector y aro del estudio).
     model                         Ruta relativa del GLB (Draco + texturas WebP).
     fileSize                      Tamaño mostrado antes de descargar.
     cover                         Imagen de portada: render original del proyecto recortado sobre fondo transparente
                                   (los originales con fondo gris siguen en assets/img/modelo-*.webp).
     tools                         Software utilizado [nombre, uso].
     tech                          Datos verificados del GLB exportado (huesos, mallas…).
                                   Vértices y triángulos se calculan al cargar el modelo.
     trackBone                     Hueso que se mantiene centrado en el modo «En el sitio».
     cameraAzimuth                 (opcional) Ángulo inicial de la cámara en grados (24 por defecto).
     clips                         Clips del GLB y el fotograma del .blend en el que empieza
                                   cada uno (para convertir fotogramas → segundos a 30 fps).
     animations                    Tramos legibles: clip + fotogramas originales [from, to].
     defaultAnimation              id del tramo inicial.

   Origen de las animaciones: BLACKDOT_FINAL_PROJECT.blend (30 fps).
     · Acciones de esqueleto: BD_Skate_Keyframes, ACC_Rig_BLACKDOT, ACC_Rig_KAIRO,
       NOX_Keyframes y ACC_Rig_NOX. La katana de KAIRO (restricción «Child Of» a la
       mano) se horneó fotograma a fotograma dentro del clip de KAIRO.
     · Los rangos se verificaron midiendo el movimiento real de los huesos por
       fotograma y con renders de control; los nombres de cada tramo provienen de
       las cámaras de la cinemática (CAM_T03_BD_Inicio, CAM_T06_BD_Ollie_CamLenta,
       CAM_T10_KA_Patada, CAM_T18_NOX_Salto…).
   ========================================================================== */

export const LAB_SETTINGS = {
  fps: 30,
  threeVersion: "0.160.0",
  /* Decodificador Draco de la misma versión de Three.js que usa el sitio */
  dracoPath: "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/gltf/"
};

export const LAB_CHARACTERS = [
  {
    id: "blackdot",
    name: "BLACKDOT",
    role: "Dálmata protagonista",
    color: "#65C3CC",
    description: "El dálmata protagonista del universo BLACKDOT: gorra, gafas, chaqueta azul y una patineta que forma parte de su rig. En su animación principal sube a la tabla, recorre la pasarela, hace un ollie y termina en pose de héroe.",
    model: "assets/models/blackdot.glb",
    fileSize: "3,8 MB",
    cover: "assets/img/modelo-dalmata-recorte.webp",
    tools: [["Blender", "Modelado, materiales, rig y animación"], ["Three.js", "Visor en tiempo real"]],
    tech: { bones: 27, meshes: 10, materials: 3, textures: 6, extra: "Patineta unida al hueso «Tabla» del rig" },
    trackBone: "Pelvis",
    clips: { Coreografia: { start: 151 }, Presentacion_Alterna: { start: 1 } },
    animations: [
      { id: "bd-completa", label: "Secuencia completa en patineta", clip: "Coreografia", from: 151, to: 420 },
      { id: "bd-subida", label: "Sube a la patineta", clip: "Coreografia", from: 151, to: 230 },
      { id: "bd-recorrido", label: "Recorrido en patineta", clip: "Coreografia", from: 231, to: 280 },
      { id: "bd-ollie", label: "Ollie (salto con la tabla)", clip: "Coreografia", from: 281, to: 311 },
      { id: "bd-aterrizaje", label: "Aterrizaje", clip: "Coreografia", from: 312, to: 356 },
      { id: "bd-heroe", label: "Pose de héroe", clip: "Coreografia", from: 357, to: 420 },
      { id: "bd-alterna", label: "Presentación sobre la tabla (versión alterna)", clip: "Presentacion_Alterna", from: 1, to: 840 }
    ],
    defaultAnimation: "bd-completa"
  },
  {
    id: "kairo",
    name: "KAIRO",
    role: "Personaje ninja",
    color: "#8EC9FF",
    description: "El ninja de BLACKDOT, con máscara blanca y una katana que toma en plena coreografía. Su animación encadena una patada, un combo y un giro antes de desenvainar y atacar con la katana.",
    model: "assets/models/kairo.glb",
    fileSize: "1,7 MB",
    cover: "assets/img/modelo-ninja-recorte.webp",
    tools: [["Blender", "Modelado, materiales, rig y animación"], ["Three.js", "Visor en tiempo real"]],
    tech: { bones: 22, meshes: 22, materials: 8, textures: 5, extra: "Incluye la katana (10 piezas) con su movimiento horneado" },
    trackBone: "Pelvis",
    cameraAzimuth: 204, /* el rig de KAIRO mira hacia −Z: la cámara se coloca de frente */
    clips: { Coreografia: { start: 1 } },
    animations: [
      { id: "ka-combate", label: "Secuencia de combate completa", clip: "Coreografia", from: 301, to: 715 },
      { id: "ka-guardia", label: "Guardia (reposo)", clip: "Coreografia", from: 1, to: 300 },
      { id: "ka-patada", label: "Patada", clip: "Coreografia", from: 316, to: 381 },
      { id: "ka-combo", label: "Combo", clip: "Coreografia", from: 382, to: 425 },
      { id: "ka-huracan", label: "Huracán", clip: "Coreografia", from: 426, to: 503 },
      { id: "ka-toma", label: "Toma la katana", clip: "Coreografia", from: 556, to: 626 },
      { id: "ka-ataque", label: "Ataque con katana", clip: "Coreografia", from: 627, to: 681 },
      { id: "ka-pose", label: "Pose final", clip: "Coreografia", from: 682, to: 715 }
    ],
    defaultAnimation: "ka-combate"
  },
  {
    id: "nox",
    name: "NOX",
    role: "Personaje gato",
    color: "#A6E3E8",
    description: "Un gato negro de ojos grandes que acompaña a BLACKDOT con su linterna, decorada con el emblema de una huella felina. Su animación lo muestra presentándose, caminando, saltando y encendiendo su linterna.",
    model: "assets/models/nox.glb",
    fileSize: "2,5 MB",
    cover: "assets/img/modelo-gato-recorte.webp",
    tools: [["Blender", "Modelado, materiales, rig y animación"], ["Three.js", "Visor en tiempo real"]],
    tech: { bones: 20, meshes: 45, materials: 10, textures: 3, extra: "Linterna (32 piezas) unida a la mano derecha" },
    trackBone: "Pelvis",
    clips: { Coreografia: { start: 720 }, Coreografia_Alterna: { start: 1 } },
    animations: [
      { id: "nox-completa", label: "Secuencia completa", clip: "Coreografia", from: 720, to: 905 },
      { id: "nox-presentacion", label: "Presentación", clip: "Coreografia", from: 720, to: 759 },
      { id: "nox-caminata", label: "Caminata", clip: "Coreografia", from: 760, to: 818 },
      { id: "nox-salto", label: "Salto", clip: "Coreografia", from: 819, to: 845 },
      { id: "nox-linterna", label: "Linterna", clip: "Coreografia", from: 846, to: 890 },
      { id: "nox-salto-alt", label: "Salto (versión alterna)", clip: "Coreografia_Alterna", from: 551, to: 680 },
      { id: "nox-alterna", label: "Coreografía alterna completa", clip: "Coreografia_Alterna", from: 1, to: 840 }
    ],
    defaultAnimation: "nox-completa"
  }
];
