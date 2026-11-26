/* ==========================================================================
   BLACKDOT 2.0 — motion design
   - Luz dinámica que sigue al puntero en el hero y en la entrada del arcade.
   - GSAP + ScrollTrigger (si cargan desde el CDN): parallax por capas,
     profundidad en la entrada del arcade
     y cierre del footer. Sin GSAP o con movimiento reducido, el sitio queda
     completo con sus transiciones CSS.
   ========================================================================== */
(function () {
  "use strict";

  function init() {
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    /* Luz dinámica (variables CSS, sin dependencias) */
    function spotlight(el) {
      if (!el || !fine || reduced) return;
      var raf = 0, x = 0, y = 0;
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect(); x = e.clientX - r.left; y = e.clientY - r.top;
        if (!raf) raf = requestAnimationFrame(function () { raf = 0; el.style.setProperty("--lx", x + "px"); el.style.setProperty("--ly", y + "px"); el.classList.add("is-lit"); });
      }, { passive: true });
      el.addEventListener("pointerleave", function () { el.classList.remove("is-lit"); });
    }
    spotlight(document.getElementById("inicio"));
    spotlight(document.getElementById("arcade-gate"));

    if (reduced || !fine || innerWidth < 900) return; /* celular o movimiento reducido: sin GSAP */
    loadScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js").then(function () {
      return loadScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js");
    }).then(runGsap).catch(function (e) { console.warn("BLACKDOT: GSAP no disponible; el sitio sigue con sus transiciones CSS.", e); });
  }
  function loadScript(src) {
    return new Promise(function (res, rej) { var s = document.createElement("script"); s.src = src; s.async = true; s.onload = res; s.onerror = function () { rej(new Error(src)); }; document.head.appendChild(s); });
  }
  function runGsap() {
    var gsap = window.gsap, ST = window.ScrollTrigger;
    if (!gsap || !ST) return;
    gsap.registerPlugin(ST);
    document.documentElement.classList.add("has-gsap");

    /* Hero: capas a distintas velocidades (parallax de profundidad) */
    var hero = document.getElementById("inicio");
    if (hero) {
      var st = { trigger: hero, start: "top top", end: "bottom top", scrub: 0.6 };
      gsap.to(".hero2 .hero-layer--far", { yPercent: 22, ease: "none", scrollTrigger: st });
      gsap.to(".hero2 .hero-floor", { yPercent: 18, opacity: 0.2, ease: "none", scrollTrigger: st });
      /* BLACKDOT 2.0: solo desplazamiento; sin desvanecer el texto (en modo claro se veía opaco) */
      gsap.to(".hero2 .hero-copy", { y: 70, ease: "none", scrollTrigger: st });
      /* .hero-visual usa transform con !important (style.css): se mueve con la propiedad translate */
      gsap.to(".hero2 .hero-visual", { "--py": "-60px", ease: "none", scrollTrigger: st });
    }

    /* Entrada del arcade: la pared de pantallas gana profundidad al acercarse */
    var gate = document.getElementById("arcade-gate");
    if (gate) {
      gsap.set(".gate-screens", { xPercent: -50, yPercent: -50, rotateX: 16 });
      gsap.fromTo(".gate-screens", { scale: 1.22, rotateX: 30, opacity: 0.18 }, { scale: 1, rotateX: 14, opacity: 0.45, ease: "none", scrollTrigger: { trigger: "#juegos", start: "top bottom", end: "top top", scrub: 0.8 } });
      gsap.fromTo(".gate-content .arcade-title", { letterSpacing: "0.04em" }, { letterSpacing: "-0.05em", ease: "none", scrollTrigger: { trigger: "#juegos", start: "top 85%", end: "top 15%", scrub: 0.8 } });
    }

    /* BLACKDOT 2.0: las tarjetas de proyectos ya no tienen parallax (se mantienen alineadas). */

    /* Sobre mí: la tarjeta de perfil flota con un desfase de profundidad */
    if (document.querySelector(".profile-card")) gsap.fromTo(".profile-card", { "--py": "40px" }, { "--py": "-20px", ease: "none", scrollTrigger: { trigger: ".about2", start: "top bottom", end: "bottom top", scrub: 0.8 } });

    /* Herramientas: aparición escalonada de las fichas dentro de cada grupo */
    document.querySelectorAll(".tool-cat").forEach(function (grp) {
      gsap.from(grp.querySelectorAll(".tool"), { y: 26, opacity: 0, duration: 0.8, stagger: 0.08, ease: "power3.out", scrollTrigger: { trigger: grp, start: "top 85%", once: true } });
    });

    /* Footer: la firma BLACKDOT se compacta al llegar al final */
    if (document.querySelector(".footer-word")) gsap.fromTo(".footer-word", { letterSpacing: "0.14em", opacity: 0.25 }, { letterSpacing: "-0.06em", opacity: 1, ease: "none", scrollTrigger: { trigger: ".footer-word", start: "top bottom", end: "bottom 85%", scrub: 0.6 } });

    /* Recalcula cuando cargan imágenes o cambia el diseño */
    addEventListener("load", function () { ST.refresh(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
