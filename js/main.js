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

  /* ----------  Projets : galerie dynamique (base) + filtres + visionneuse  ---------- */
  const projFilters = document.getElementById("projFilters");
  const grid = document.getElementById("projGrid");
  const lb = document.getElementById("lightbox");
  const lbImg = document.getElementById("lbImg");
  const lbClose = document.getElementById("lbClose");

  function applyFilter(f) {
    if (!grid) return;
    grid.querySelectorAll(".pcard").forEach((card) =>
      card.classList.toggle("hide", !(f === "all" || card.dataset.cat === f)));
  }
  if (projFilters) {
    projFilters.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      projFilters.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c === chip));
      applyFilter(chip.dataset.f);
    });
  }
  if (grid) {
    grid.addEventListener("click", (e) => {
      const card = e.target.closest(".pcard");
      if (!card) return;
      if (card.dataset.video) { window.open(card.dataset.video, "_blank"); return; }
      if (card.dataset.img && lb) { lbImg.src = card.dataset.img; lb.classList.add("open"); }
    });
  }
  const closeLb = () => lb && lb.classList.remove("open");
  if (lbClose) lbClose.addEventListener("click", closeLb);
  if (lb) lb.addEventListener("click", (e) => { if (e.target === lb) closeLb(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLb(); });

  // Charge la galerie depuis la base (les médias gérés par la direction / communication)
  async function loadGallery() {
    if (!grid || !window.DB || !DB.getSiteMedia) return;
    let media = [];
    try { media = await DB.getSiteMedia(); } catch (e) { return; }
    if (!media.length) return; // garde les images par défaut présentes dans le HTML
    const esc = AB.escapeHtml;
    const catKey = (c) => { c = (c || "").toLowerCase(); if (c.indexOf("immeuble") >= 0) return "immeubles"; if (c.indexOf("inter") >= 0) return "interieurs"; return "villas"; };
    grid.innerHTML = media.map((m) => {
      const cat = catKey(m.category);
      if (m.kind === "video") {
        return "<article class='pcard' data-cat='" + cat + "' data-video='" + esc(m.url) + "'>" +
          "<div class='pcard__img' style='background:linear-gradient(135deg,#0f3322,#237049);display:grid;place-items:center;color:#e3b53e;font-family:Poppins,sans-serif;font-weight:700;font-size:1.1rem'>▶ Vidéo<span class='pcard__zoom'>▶</span></div>" +
          "<div class='pcard__body'><span class='pcard__cat'>" + esc(m.category || "") + "</span><h3>" + esc(m.title || "") + "</h3><p>📍 Lomé, Togo</p></div></article>";
      }
      return "<article class='pcard' data-cat='" + cat + "' data-img='" + esc(m.url) + "'>" +
        "<div class='pcard__img'><img src='" + esc(m.url) + "' alt='" + esc(m.title || "") + "' loading='lazy' /><span class='pcard__zoom'>＋</span></div>" +
        "<div class='pcard__body'><span class='pcard__cat'>" + esc(m.category || "") + "</span><h3>" + esc(m.title || "") + "</h3><p>📍 Lomé, Togo</p></div></article>";
    }).join("");
  }
  loadGallery();

  /* ----------  Mini-calculateur d'accueil  ---------- */
  const mTerrain = document.getElementById("mTerrain");
  const mPct = document.getElementById("mPct");
  const mFormule = document.getElementById("mFormule");
  const mLevels = document.getElementById("mLevels");
  const mBuilt = document.getElementById("mBuilt");
  const mAmount = document.getElementById("mAmount");
  function recalc() {
    if (!mTerrain || !mPct) return;
    const f = (AB.FORMULES && mFormule) ? (AB.FORMULES[mFormule.value] || {}) : {};
    const rate = f.rate || AB.PRICE_PER_SQM;
    const levels = mLevels ? (+mLevels.value || 1) : 1;
    const q = AB.computeQuote(mTerrain.value, mPct.value, rate, levels);
    mBuilt.textContent = AB.formatNumber(q.builtSurface) + " m²";
    mAmount.textContent = AB.formatMoney(q.amount);
  }
  if (mTerrain && mPct) {
    mTerrain.addEventListener("input", recalc);
    mPct.addEventListener("change", recalc);
    if (mFormule) mFormule.addEventListener("change", recalc);
    if (mLevels) mLevels.addEventListener("change", recalc);
    recalc();
  }
})();
