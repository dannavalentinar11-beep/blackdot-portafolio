# BLACKDOT — Despliegue, CI/CD e instrucciones para publicar

## Destino
- URL de producción: https://dannavalentinar11-beep.github.io/blackdot-portafolio/
- Repositorio: `dannavalentinar11-beep/blackdot-portafolio`, rama `main`, carpeta raíz.
- Vistas: `index.html`, `arcade.html`, `ar-experience.html`, `blog.html`, `contacto.html`.

## Publicar una actualización
1. Copia el contenido de la carpeta del proyecto en la raíz del repositorio (conserva `.nojekyll`).
2. En una terminal dentro del repositorio:

```powershell
git add -A
```

```powershell
git commit -m "BLACKDOT: tercer previo (vistas, WebAR, arcade académico)"
```

```powershell
git push origin main
```

3. GitHub ejecuta automáticamente el flujo `pages-build-deployment` (pestaña **Actions**). En 30–60 segundos la nueva versión queda publicada con HTTPS.
4. Comprueba: abre las 5 vistas, prueba la cámara en `ar-experience.html` desde el teléfono y recarga con Ctrl+F5 si ves la versión anterior.

Configuración de Pages (una sola vez): *Settings → Pages → Build and deployment → Deploy from a branch → main / (root)*.

## CI/CD
| Flujo | Disparador | Qué hace |
|---|---|---|
| `pages-build-deployment` (GitHub) | cada push a `main` | publica el sitio en GitHub Pages |
| `.github/workflows/actualizar-divinevanity.yml` | lunes 7:00 a. m. (Colombia) o manual | captura divinevanity.co, valida la imagen y la publica solo si cambió |

## Validación antes de publicar (local)
```powershell
node docs/pipeline/servidor_local.js .. 8765
```
Sirve la carpeta padre para probar bajo una subruta (http://localhost:8765/<carpeta>/), con gzip como GitHub Pages.

- W3C: enviar cada HTML a https://validator.w3.org/nu/ (resultados en `docs/evidencias/w3c/`).
- Lighthouse móvil: `npx lighthouse@12.2.1 <url> --form-factor=mobile` (informes en `docs/evidencias/lighthouse/`).
- Pruebas funcionales: `node docs/pipeline/cdp_test.js <url> <prueba.js>`.

## Mantener las vistas sincronizadas
La cabecera, el menú, el footer y los componentes comunes salen de `index.html`; la sala del arcade, el Salón de la fama y sus modales están en `docs/pipeline/parciales/`. Después de cambiarlos:
```powershell
python docs/pipeline/construir_paginas.py
```

## Requisitos de la experiencia WebAR
- HTTPS obligatorio (la cámara y WebXR solo funcionan en contextos seguros).
- WebXR AR: Chrome en Android con Google Play Services for AR (ARCore).
- iPhone / navegadores sin WebXR AR: modo «Usar la cámara» (superposición guiada por el giroscopio, sin anclaje).
- Cualquier navegador con WebGL: modo «Explorar en 3D».
