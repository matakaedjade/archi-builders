/* =====================================================================
   ARCHI_BUILDERS — Page d'accueil : interactions & animations
   ===================================================================== */
(function () {
  "use strict";

  /* ----------  Année du footer  ---------- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ----------  Navbar : fond au défilement + bascule du logo  ---------- */
  const nav = document.getElementById("nav");
  const navLogo = document.getElementById("navLogo");
  const onScroll = () => {
    const scrolled = window.scrollY > 60;
    nav.classList.toggle("nav--scrolled", scrolled);
    if (navLogo) navLogo.src = scrolled ? "assets/images/logo-color.png" : "assets/images/logo-white.png";
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ----------  Menu mobile  ---------- */
  const burger = document.getElementById("burger");
  const links = document.getElementById("navLinks");
  if (burger && links) {
    burger.addEventListener("click", () => links.classList.toggle("open"));
    links.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => links.classList.remove("open")));
  }

  /* ----------  Révélation au défilement  ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  /* ----------  Compteurs animés  ---------- */
  const counters = document.querySelectorAll("[data-count]");
  const cio = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = +el.dataset.count;
      const dur = 1400; const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      cio.unobserve(el);
    });
  }, { threshold: 0.6 });
  counters.forEach((c) => cio.observe(c));

  /* ----------  Projets : filtres par catégorie  ---------- */
  const projFilters = document.getElementById("projFilters");
  const projCards = document.querySelectorAll("#projGrid .pcard");
  if (projFilters) {
    projFilters.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      projFilters.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === chip));
      const f = chip.dataset.f;
      projCards.forEach((card) => {
        const show = f === "all" || card.dataset.cat === f;
        card.classList.toggle("hide", !show);
      });
    });
  }

  /* ----------  Projets : lightbox plein écran  ---------- */
  const lb = document.getElementById("lightbox");
  const lbImg = document.getElementById("lbImg");
  const lbClose = document.getElementById("lbClose");
  document.querySelectorAll("[data-img]").forEach((g) => {
    g.addEventListener("click", () => {
      lbImg.src = g.dataset.img;
      lb.classList.add("open");
    });
  });
  const closeLb = () => lb.classList.remove("open");
  if (lbClose) lbClose.addEventListener("click", closeLb);
  if (lb) lb.addEventListener("click", (e) => { if (e.target === lb) closeLb(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLb(); });

  /* ----------  Mini-calculateur d'accueil  ---------- */
  const mTerrain = document.getElementById("mTerrain");
  const mPct = document.getElementById("mPct");
  const mBuilt = document.getElementById("mBuilt");
  const mAmount = document.getElementById("mAmount");
  function recalc() {
    if (!mTerrain || !mPct) return;
    const q = AB.computeQuote(mTerrain.value, mPct.value);
    mBuilt.textContent = AB.formatNumber(q.builtSurface) + " m²";
    mAmount.textContent = AB.formatMoney(q.amount);
  }
  if (mTerrain && mPct) {
    mTerrain.addEventListener("input", recalc);
    mPct.addEventListener("change", recalc);
    recalc();
  }
})();
