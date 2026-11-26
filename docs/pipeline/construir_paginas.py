"""BLACKDOT — generador de vistas compartidas.

Uso (desde la carpeta raíz del proyecto):
    python docs/pipeline/construir_paginas.py

index.html es la fuente única de la cabecera, el menú, el footer y los componentes comunes;
la sala del arcade, el Salón de la fama y sus modales están en docs/pipeline/parciales/.
Este script:
  1. Escribe la navegación unificada (5 vistas) en index.html.
  2. Genera arcade.html, blog.html y contacto.html copiando de index.html el <head>,
     la cabecera, el footer, los modales necesarios y las secciones de cada vista.
ar-experience.html se mantiene a mano (usa A-Frame) pero comparte la misma cabecera:
el script también actualiza su bloque de navegación entre los marcadores BD:NAV.
Vuelve a ejecutarlo cada vez que cambies la cabecera o el footer de index.html.
"""
import re, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
SITE = "https://dannavalentinar11-beep.github.io/blackdot-portafolio/"

NAV = [  # (texto, destino desde index, destino desde otras vistas, clave de página)
    ("Inicio", "#inicio", "index.html", "index"),
    ("Sobre mí", "#sobre-mi", "index.html#sobre-mi", None),
    ("Proyectos", "#proyectos", "index.html#proyectos", None),
    ("3D Lab", "#lab", "index.html#lab", None),
    ("Arcade", "arcade.html", "arcade.html", "arcade"),
    ("WebAR", "ar-experience.html", "ar-experience.html", "ar"),
    ("Blog", "blog.html", "blog.html", "blog"),
    ("Manuales", "#manual", "index.html#manual", None),
    ("Contacto", "contacto.html", "contacto.html", "contacto"),
]
MOBILE = [
    ("Inicio", "#inicio", "index.html", "index"),
    ("Sobre mí", "#sobre-mi", "index.html#sobre-mi", None),
    ("Proyectos", "#proyectos", "index.html#proyectos", None),
    ("BLACKDOT 3D Lab", "#lab", "index.html#lab", None),
    ("Arcade", "arcade.html", "arcade.html", "arcade"),
    ("Salón de la fama", "arcade.html#records", "arcade.html#records", None),
    ("BLACKDOT AR Experience", "ar-experience.html", "ar-experience.html", "ar"),
    ("Herramientas", "#herramientas", "index.html#herramientas", None),
    ("Blog", "blog.html", "blog.html", "blog"),
    ("Manuales", "#manual", "index.html#manual", None),
    ("Contacto", "contacto.html", "contacto.html", "contacto"),
]


def nav_html(page):
    def link(t, a, b, key, i=None, mobile=False):
        href = a if page == "index" else b
        cur = ' class="is-active" aria-current="page"' if key == page else ""
        if mobile:
            return f'  <a href="{href}"{cur} style="--i:{i}"><span><small>{i + 1:02d}</small>{t}</span></a>'
        return f'      <a href="{href}"{cur}>{t}</a>'
    desk = "\n".join(link(*x) for x in NAV)
    mob = "\n".join(link(*x, i=i, mobile=True) for i, x in enumerate(MOBILE))
    return desk, mob


def set_nav(html, page):
    desk, mob = nav_html(page)
    html = re.sub(r'(<nav class="nav" id="nav" aria-label="Navegación principal">\s*<span class="nav-pill" id="nav-pill" aria-hidden="true"></span>\n).*?(\n    </nav>)',
                  lambda m: m.group(1) + desk + m.group(2), html, count=1, flags=re.S)
    html = re.sub(r'(<nav class="mobile-menu" id="mobile-menu" aria-label="Menú móvil">\n).*?(\n  <p class="mm-foot">)',
                  lambda m: m.group(1) + mob + m.group(2), html, count=1, flags=re.S)
    talk = "#contacto" if page == "index" else "contacto.html"
    html = re.sub(r'<a class="btn btn-sm" href="[^"]*" data-magnetic>Hablemos', f'<a class="btn btn-sm" href="{talk}" data-magnetic>Hablemos', html, count=1)
    return html


def between(s, start, end, include_end=True):
    a = s.index(start)
    b = s.index(end, a) + (len(end) if include_end else 0)
    return s[a:b]


def section(s, sid):
    m = re.search(r'\n[ \t]*(<!--[^\n]*-->\n[ \t]*)?<section[^>]*\bid="%s"' % sid, s)
    a = m.start() + 1
    depth, i = 0, a
    for t in re.finditer(r'<(/?)section\b', s[a:]):
        depth += -1 if t.group(1) else 1
        if depth == 0:
            close = s.index(">", a + t.start()) + 1
            return s[a:close]
    raise ValueError(sid)


def page_hero(kicker, title, intro):
    return f'''  <section class="page-hero" aria-labelledby="page-title">
    <div class="wrap">
      <p class="kicker">{kicker}</p>
      <h1 class="page-title" id="page-title">{title}</h1>
      <p class="page-intro">{intro}</p>
    </div>
  </section>
'''


def build():
    index = (ROOT / "index.html").read_text(encoding="utf-8")
    index = set_nav(index, "index")
    (ROOT / "index.html").write_text(index, encoding="utf-8")

    head = between(index, "<!DOCTYPE html>", "</head>")
    chrome = between(index, "<body>", '<main id="contenido">', include_end=False)
    footer = between(index, '<footer class="footer footer2">', "</footer>")
    toast = between(index, '<div class="toast"', "</div>")
    PART = ROOT / "docs" / "pipeline" / "parciales"
    sala = (PART / "arcade-sala.html").read_text(encoding="utf-8")          # sala 3D / modo ligero
    records = (PART / "arcade-records.html").read_text(encoding="utf-8")    # Salón de la fama
    arcade_modals = (PART / "arcade-modales.html").read_text(encoding="utf-8")  # ficha de juego + reproductor
    blogmodal = between(index, "<!-- MODAL BLOG -->", '<div class="toast"', include_end=False)
    templates = between(index, "<!-- Portadas SVG animadas -->", '<script src="js/storage.js', include_end=False)
    base_scripts = '''<script src="js/storage.js?v=4.0"></script>
<script src="js/script.js?v=4.1"></script>
<script src="js/motion.js?v=4.0" defer></script>
'''
    pages = {
        "arcade": dict(
            title="Arcade — BLACKDOT | Ping-Pong 2D, Fútbol 2D Atari y Aviones 3D",
            desc="BLACKDOT Arcade: Ping-Pong 2D, Fútbol 2D Atari (contra la IA y 2 jugadores), juego de aviones 3D y la colección de videojuegos web de Danna Rueda.",
            hero=page_hero("Arcade · Ingeniería Web", "BLACKDOT <span class=\"o\">Arcade</span>",
                           "Los juegos de la asignatura —Ping-Pong 2D, Fútbol 2D Atari y el juego de aviones 3D— y la colección BLACKDOT, listos para jugar en el navegador. Tus marcadores y récords se guardan en este dispositivo."),
            body=lambda: sala + "\n\n" + METRICS_SECTION + "\n" + records,
            extra=arcade_modals,
            scripts=base_scripts + '<script src="js/arcade.js?v=4.1" defer></script>\n<script src="js/halloffame.js?v=4.0" defer></script>\n<script src="js/metrics-panel.js?v=4.0" defer></script>\n',
            keep_importmap=True),
        "blog": dict(
            title="Blog — BLACKDOT | Ideas y procesos de Danna Rueda",
            desc="Blog de BLACKDOT: decisiones de diseño, desarrollo web, videojuegos y narrativa audiovisual desde el proceso real de crear.",
            hero=page_hero("Blog", "Ideas &amp; <span class=\"o\">procesos</span>",
                           "Decisiones de diseño, desarrollo y narrativa multimedia desde el proceso real de crear."),
            body=lambda: section(index, "blog"),
            extra=blogmodal, scripts=base_scripts, keep_importmap=False),
        "contacto": dict(
            title="Contacto — BLACKDOT | Danna Rueda",
            desc="Escríbele a Danna Rueda, estudiante de Ingeniería Multimedia: diseño, desarrollo web, videojuegos, edición de video y modelado 3D.",
            hero=page_hero("Contacto", "Hablemos de <span class=\"o\">tu idea</span>",
                           "Cuéntame tu proyecto: el mensaje llega directo a mi correo o, si prefieres, por WhatsApp."),
            body=lambda: section(index, "contacto"),
            extra="", scripts=base_scripts, keep_importmap=False),
    }
    for key, p in pages.items():
        h = head
        h = re.sub(r"<title>.*?</title>", f"<title>{p['title']}</title>", h, flags=re.S)
        h = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{p["desc"]}">', h)
        h = re.sub(r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="{SITE}{key}.html">', h)
        if not p["keep_importmap"]:
            h = re.sub(r'<!-- Three.js solo se descarga.*?</script>\n', "", h, flags=re.S)
        body = p["body"]()
        # La vista dedicada sustituye el título de sección por el h1 de la página
        html = (h + "\n" + set_nav(chrome, key) + '<main id="contenido" class="page-' + key + '">\n' + p["hero"] + "\n" + body +
                "\n</main>\n\n" + footer + "\n\n" + p["extra"] + toast + "\n\n" + templates + p["scripts"] + "\n</body>\n</html>\n")
        html = html.replace('<h2 class="section-title" id="blog-title" data-split>', '<h2 class="section-title sr-only" id="blog-title">')
        html = html.replace('<h2 class="section-title" id="contact-title" data-split>', '<h2 class="section-title sr-only" id="contact-title">')
        (ROOT / f"{key}.html").write_text(html, encoding="utf-8")
        print("escrito", key + ".html", len(html), "bytes")

    ar = ROOT / "ar-experience.html"
    if ar.exists():
        s = ar.read_text(encoding="utf-8")
        new_chrome = set_nav(chrome, "ar")
        s = re.sub(r"<!-- BD:NAV -->.*?<!-- /BD:NAV -->", lambda m: "<!-- BD:NAV -->\n" + new_chrome + "<!-- /BD:NAV -->", s, flags=re.S)
        s = re.sub(r"<!-- BD:FOOTER -->.*?<!-- /BD:FOOTER -->", lambda m: "<!-- BD:FOOTER -->\n" + footer + "\n<!-- /BD:FOOTER -->", s, flags=re.S)
        ar.write_text(s, encoding="utf-8")
        print("navegación actualizada en ar-experience.html")


METRICS_SECTION = '''  <!-- MÉTRICAS DE INTERACCIÓN (localStorage · js/storage.js + js/metrics-panel.js) -->
  <section class="section metrics" id="metricas" aria-labelledby="metrics-title">
    <div class="wrap">
      <div class="section-head">
        <div>
          <p class="kicker">Persistencia local</p>
          <h2 class="section-title" id="metrics-title">Tus <span class="o">métricas</span></h2>
        </div>
        <p class="section-intro">Datos guardados solo en este navegador con la API localStorage: se conservan aunque cierres y vuelvas a abrir el sitio. No se guarda información personal.</p>
      </div>
      <div class="metrics-grid" id="metrics-grid" aria-live="polite"></div>
      <div class="metrics-history">
        <h3 class="metrics-h">Historial de marcadores · juegos de la asignatura</h3>
        <div class="metrics-hist" id="metrics-hist"></div>
      </div>
      <p class="metrics-actions"><button class="btn btn-ghost btn-sm" type="button" id="metrics-reset">Reiniciar métricas de interacción</button> <small>No borra récords ni partidas guardadas de los juegos.</small></p>
    </div>
  </section>
'''

if __name__ == "__main__":
    build()
