# BLACKDOT 2.0 — Informe de pruebas

Entorno: Windows 11 · navegador Chromium integrado en Claude (WebGL activo) · servidor estático local con soporte de rangos sirviendo el sitio bajo una **subruta** (`/blackdot-2.0/`, equivalente a `/blackdot-portafolio/` de GitHub Pages), no mediante `file://`. Viewports probados: 1440×900, ~800 px (tablet) y 375×812 (móvil emulado).

Leyenda: ✅ aprobada · ⚠️ aprobada con observación · ⏳ no ejecutada (se explica por qué).

## A. Integridad
| Prueba | Resultado |
|---|---|
| 69 recursos locales referenciados por la página y cargados en la sesión responden 200 (sin 404) | ✅ |
| Sintaxis de los 7 archivos JS (`node --check`, módulos incluidos) | ✅ |
| Rutas relativas, sin rutas absolutas del equipo | ✅ |
| Los 4 juegos (`juegos/*.html`) no se modificaron | ✅ (mismos archivos del original) |

## B. Arcade
| Prueba | Resultado |
|---|---|
| Solo 4 juegos en datos, estaciones, sala 3D, salón de récords, abanico de proyectos y footer | ✅ |
| Orden idéntico en todas las interfaces (Cúcuta, Dynasty, Sky Bound, Rally) y contador «01 / 04» | ✅ |
| Los 4 juegos abren en el reproductor y cargan su página (título del iframe verificado) | ✅ |
| Sin referencias a Pixel Pong 2D / Atari Football 2D en HTML, CSS y JS del sitio | ✅ |
| Sala 3D en tema claro y oscuro | ✅ |
| Récords: un guardado simulado de Rally Rush aparece como récord; contadores 4/1/3; la clave `blackdot-football` del juego retirado queda intacta | ✅ (datos de prueba eliminados después) |
| Jugabilidad completa de cada juego (partidas enteras) | ⏳ Solo se verificó la carga; la lógica interna no se tocó |

## C. Temas
| Prueba | Resultado |
|---|---|
| El botón cambia **todo** el sitio (hero, arcade, récords, proyectos, 3D Lab, cinemática, herramientas, blog, manuales, contacto, footer, modales) | ✅ |
| Persistencia al recargar (`blackdot-theme`) | ✅ |
| Contraste en claro: 22 tipos de texto medidos, todos ≥ 5,7:1 (AA) | ✅ |
| Visor 3D y sala del arcade cambian de tema en vivo | ✅ |
| Seguimiento del tema del sistema cuando no hay elección guardada | ⚠️ Implementado; no se pudo cambiar el tema del sistema operativo durante la prueba |

## D. Proyectos
| Prueba | Resultado |
|---|---|
| Imágenes sin recorte ni deformación (tamaños renderizados proporcionales: p. ej. ilustración vertical 137×265 ≈ 0,52 = 800×1488) | ✅ |
| Video vertical mostrado vertical; detalle del proyecto con imágenes completas | ✅ |
| Tarjetas alineadas por filas en escritorio, 2 columnas en tablet, 1 en móvil | ✅ |
| Contenido original conservado (7 proyectos, textos y enlaces) | ✅ (solo se actualizó el texto del proyecto 07 a 4 juegos) |

## E. Herramientas
| Prueba | Resultado |
|---|---|
| 5 categorías, tarjetas uniformes, iconos correctos, modal por herramienta | ✅ |
| Distribución en tablet | ⚠️ Se corrigió un hueco (categoría ancha reordenada al final) |

## F. BLACKDOT 3D LAB
| Prueba | Resultado |
|---|---|
| Nada 3D se descarga al entrar al sitio (Three.js y GLB solo al pulsar «Ver en 3D») | ✅ |
| BLACKDOT, KAIRO y NOX cargan con texturas y materiales | ✅ |
| Rotación, zoom, centrado y cambio de personaje | ✅ |
| Animaciones avanzan (tiempo medido) y el selector cambia de tramo | ✅ |
| Tramos verificados visualmente: ollie (tabla en el aire), KAIRO sostiene la katana en «Toma» y «Ataque», NOX en «Caminata» | ✅ |
| Fallo detectado y corregido: al cambiar de tramo en pausa se veía el anterior (fundido detenido) → cambio instantáneo en pausa | ✅ corregido |
| Fallo detectado y corregido: KAIRO se veía gris (sheen exportado sin su peso) → color de sheen × peso real | ✅ corregido |
| Visor en móvil 375 px (carga, animación, controles) | ✅ (emulado) |
| Sin errores de WebGL ni de consola | ✅ |
| Gestos táctiles reales y rendimiento en un teléfono físico | ⏳ No hay dispositivo físico en este entorno |

## G. Video
| Prueba | Resultado |
|---|---|
| Carga 1920×1080, 40,0 s, controles nativos, sin autoplay, `preload="metadata"` | ✅ |
| Reproduce, salta a 30 s, pausa; el botón grande reaparece al pausar | ✅ |
| Pista de audio AAC presente en el archivo | ✅ (verificado en el contenedor) |
| Proporción 16:9 conservada | ✅ |
| Pantalla completa | ⚠️ Implementada (API nativa y `webkitEnterFullscreen` para iPhone); el navegador de prueba no permite pantalla completa desde scripts |
| Reproducción en Safari/iOS | ⏳ No disponible en este entorno |

## H. Consola y red
| Prueba | Resultado |
|---|---|
| Errores JavaScript al cargar, al abrir los 4 juegos y al usar el 3D Lab | ✅ ninguno |
| Recursos 404 | ✅ ninguno |
| Sin `catch` vacíos en el código nuevo: los fallos se registran con `console.error` y se muestran al usuario | ✅ |

## No ejecutadas (limitaciones)
- Publicación real en GitHub Pages (no se publicó nada, por indicación expresa).
- Navegadores Firefox y Safari, y dispositivos físicos iOS/Android.
- Auditoría Lighthouse.
