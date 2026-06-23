/* =====================================================================
   ARCHI_BUILDERS — Espace Client (Supabase)
   ===================================================================== */
(async function () {
  "use strict";

  const session = await SHELL.initSession("client");
  if (!session) return;
  SHELL.initMobile();
  SHELL.initModal();
  const nav = SHELL.initNav(onViewChange);
  const $ = (id) => document.getElementById(id);

  let percentage = 60;
  const fileObjs = { terrain: null, building: null };
  let myReqs = [];

  /* ==========  ESTIMATION EN DIRECT  ========== */
  const currentFormule = () => AB.FORMULES[$("formule").value] || AB.FORMULES.complet;
  function recalc() {
    const terrain = $("terrain").value;
    const levels = +$("levels").value || 1;
    const f = currentFormule();
    const q = AB.computeQuote(terrain, percentage, f.rate, levels);
    $("sTerrain").textContent = terrain ? AB.formatNumber(terrain) + " m²" : "— m²";
    $("sPct").textContent = percentage + " %";
    $("sFootprint").textContent = q.footprint ? AB.formatNumber(q.footprint) + " m²" : "— m²";
    $("sLevels").textContent = levels;
    $("sBuilt").textContent = q.builtSurface ? AB.formatNumber(q.builtSurface) + " m²" : "— m²";
    $("sFormule").textContent = f.label;
    $("sRate").textContent = AB.formatMoney(f.rate);
    $("sAmount").textContent = AB.formatMoney(q.amount);
  }
  $("pctGrid").addEventListener("click", (e) => {
    const b = e.target.closest(".pct");
    if (!b) return;
    percentage = +b.dataset.v;
    $("pctGrid").querySelectorAll(".pct").forEach((p) => p.classList.toggle("active", p === b));
    recalc();
  });
  $("terrain").addEventListener("input", recalc);
  $("formule").addEventListener("change", recalc);
  $("levels").addEventListener("change", recalc);
  $("suivi").addEventListener("change", () => {
    const on = $("suivi").checked;
    $("suiviNote").style.display = on ? "block" : "none";
    $("sSuiviNote").style.display = on ? "block" : "none";
  });

  /* ==========  CHAMPS « AUTRE » CONDITIONNELS  ========== */
  document.querySelectorAll("select[data-other]").forEach((sel) => {
    const other = $(sel.dataset.other);
    const sync = () => other.classList.toggle("hidden", sel.value !== "Autre");
    sel.addEventListener("change", sync);
    sync();
  });
  function resolve(selId, otherId) {
    const sel = $(selId);
    if (sel.value === "Autre") return $(otherId).value.trim() || "Autre";
    return sel.value;
  }

  /* ==========  CHOIX DES FICHIERS (envoi à la validation)  ========== */
  function handleFile(input, slot, labelEl) {
    const f = input.files[0];
    if (!f) { fileObjs[slot] = null; labelEl.textContent = "Aucun fichier"; return; }
    fileObjs[slot] = f;
    labelEl.textContent = f.name + " (" + Math.round(f.size / 1024) + " Ko)";
  }
  $("filePlanTerrain").addEventListener("change", (e) => handleFile(e.target, "terrain", $("nameTerrain")));
  $("filePlanBuilding").addEventListener("change", (e) => handleFile(e.target, "building", $("nameBuilding")));

  /* ==========  ENVOI DE LA DEMANDE  ========== */
  $("conceptForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const ok = $("formOk"), err = $("formErr");
    ok.classList.remove("show"); err.classList.remove("show");
    const fail = (m) => { err.textContent = m; err.classList.add("show"); err.scrollIntoView({ behavior: "smooth", block: "center" }); };

    const terrain = +$("terrain").value;
    if (!terrain || terrain <= 0) return fail("Veuillez indiquer la surface de votre terrain (partie 2).");
    if (!fileObjs.terrain) return fail("Veuillez joindre le plan parcellaire du terrain (partie 4).");

    const btn = $("conceptForm").querySelector("button[type=submit]");
    btn.disabled = true; const oldLabel = btn.textContent; btn.textContent = "⏳ Envoi en cours…";

    const levels = +$("levels").value || 1;
    const f = currentFormule();
    const q = AB.computeQuote(terrain, percentage, f.rate, levels);

    // On consigne la formule + le suivi dans les précisions (visibles par l'architecte)
    let notesFull = "📋 Formule : " + f.label + " (" + AB.formatMoney(f.rate) + "/m²/niveau)";
    if ($("suivi").checked) notesFull += "\n🏗️ Suivi des travaux : SOUHAITÉ — à chiffrer (5 à 10 % du budget des travaux).";
    const userNotes = $("notes").value.trim();
    if (userNotes) notesFull += "\n\n" + userNotes;

    let attached = [];
    try {
      if (fileObjs.terrain) attached.push(await DB.uploadPlan(fileObjs.terrain, "Plan parcellaire du terrain"));
      if (fileObjs.building) attached.push(await DB.uploadPlan(fileObjs.building, "Plan / esquisse"));
    } catch (e2) {
      btn.disabled = false; btn.textContent = oldLabel;
      return fail("Échec de l'envoi des plans. Vérifiez votre connexion et réessayez.");
    }

    const res = await DB.addRequest({
      clientName: session.name, clientEmail: session.email, phone: session.phone || "",
      nature: resolve("nature", "natureOther"), usage: $("usage").value,
      buildingType: resolve("btype", "btypeOther"), style: resolve("style", "styleOther"),
      levels: levels, rooms: +$("rooms").value || 0, bathrooms: +$("bathrooms").value || 0,
      livings: +$("livings").value || 0, diningrooms: +$("diningrooms").value || 0, kitchens: +$("kitchens").value || 0,
      offices: +$("offices").value || 0, dressings: +$("dressings").value || 0, parking: +$("parking").value || 0,
      storerooms: +$("storerooms").value || 0,
      extras: [...document.querySelectorAll("#extras input:checked")].map((c) => c.value),
      otherRooms: $("otherRooms").value.trim(), location: $("location").value.trim(),
      topography: $("topography").value, orientation: $("orientation").value,
      budget: $("budget").value, deadline: $("deadline").value,
      terrainSurface: terrain, percentage, builtSurface: q.builtSurface, amount: q.amount,
      notes: notesFull, files: attached,
    });

    btn.disabled = false; btn.textContent = oldLabel;
    if (!res.ok) return fail(res.error || "Une erreur est survenue. Réessayez.");

    ok.innerHTML = "✅ Demande envoyée ! Estimation : <b>" + AB.formatMoney(q.amount) +
      "</b>. Nos architectes vous recontactent rapidement.";
    ok.classList.add("show");
    $("conceptForm").reset();
    fileObjs.terrain = fileObjs.building = null;
    $("nameTerrain").textContent = $("nameBuilding").textContent = "Aucun fichier";
    percentage = 60;
    $("pctGrid").querySelectorAll(".pct").forEach((p) => p.classList.toggle("active", +p.dataset.v === 60));
    document.querySelectorAll("select[data-other]").forEach((sel) => $(sel.dataset.other).classList.add("hidden"));
    $("suiviNote").style.display = "none"; $("sSuiviNote").style.display = "none";
    recalc();
    await refreshAll();
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => nav.show("requests"), 1600);
  });

  /* ==========  KPIs + LISTES  ========== */
  async function loadMine() { myReqs = await DB.getRequests(); return myReqs; }

  function refreshKpis() {
    const r = myReqs;
    $("kTotal").textContent = r.length;
    $("kProgress").textContent = r.filter((x) => x.status === "progress" || x.status === "new").length;
    $("kDone").textContent = r.filter((x) => x.status === "done").length;
    $("kAmount").textContent = AB.formatMoney(r.reduce((s, x) => s + (x.amount || 0), 0));
  }
  function renderRecent() {
    const r = myReqs.slice(0, 4);
    $("dashRecent").innerHTML = r.length ? tableHtml(r)
      : emptyBlock("Vous n'avez pas encore de demande.", "new", "Créer ma première conception");
  }
  function renderRequests() {
    $("reqTableWrap").innerHTML = myReqs.length ? tableHtml(myReqs)
      : emptyBlock("Aucune demande pour le moment.", "new", "Lancer une conception");
  }
  function tableHtml(list) {
    return '<div class="table-wrap"><table class="tbl"><thead><tr>' +
      "<th>Projet</th><th>Surface</th><th>Montant</th><th>Statut</th><th>Date</th><th></th>" +
      "</tr></thead><tbody>" +
      list.map((r) =>
        "<tr>" +
        '<td><span class="strong">' + AB.escapeHtml(r.buildingType) + "</span><br><span class='muted'>" + AB.escapeHtml(r.style) + " · " + (r.rooms || 0) + " ch.</span></td>" +
        "<td>" + AB.formatNumber(r.builtSurface) + " m²<br><span class='muted'>" + r.percentage + "% de " + AB.formatNumber(r.terrainSurface) + " m²</span></td>" +
        '<td class="strong">' + AB.formatMoney(r.amount) + "</td>" +
        "<td>" + SHELL.badge(r.status) + "</td>" +
        '<td class="muted">' + AB.formatDate(r.createdAt) + "</td>" +
        '<td><button class="btn btn--outline btn--sm" data-detail="' + r.id + '">Détail</button></td>' +
        "</tr>").join("") +
      "</tbody></table></div>";
  }
  function emptyBlock(msg, goto, cta) {
    return '<div class="empty"><div class="ic">📭</div><p>' + msg + "</p>" +
      '<button class="btn btn--gold" data-goto="' + goto + '" style="margin-top:12px">' + cta + "</button></div>";
  }

  /* ==========  DÉTAIL  ========== */
  document.addEventListener("click", (e) => {
    const pr = e.target.closest("[data-printreq]");
    if (pr) { const r = myReqs.find((x) => x.id === pr.dataset.printreq); if (r) SHELL.printRequest(r); return; }
    const b = e.target.closest("[data-detail]");
    if (!b) return;
    const r = myReqs.find((x) => x.id === b.dataset.detail);
    if (r) showDetail(r);
  });
  function showDetail(r) {
    SHELL.openModal("Demande — " + (r.buildingType || "Projet"),
      SHELL.row("Statut", SHELL.badge(r.status)) +
      SHELL.briefRows(r) +
      SHELL.row("Architecte assigné", r.assignedTo ? AB.escapeHtml(r.assignedTo) : "<span class='muted'>En attente d'affectation</span>") +
      SHELL.row("Date de la demande", AB.formatDate(r.createdAt)) +
      SHELL.amountBlock(r.amount) +
      "<div style='margin-top:14px;text-align:center'><button class='btn btn--outline btn--sm' data-printreq='" + r.id + "'>📄 Télécharger le détail (PDF)</button></div>");
  }

  /* ==========  CONTACT  ========== */
  async function renderContacts() {
    const emps = await DB.getEmployees();
    $("contactCards").innerHTML = emps.length ? emps.map((e) =>
      '<div class="cc"><div class="av">' + AB.escapeHtml((e.name || "?").charAt(0)) + "</div>" +
      "<div><b>" + AB.escapeHtml(e.name || "—") + "</b>" +
      "<span class='muted' style='font-size:.82rem'>" + AB.escapeHtml(e.title || "Concepteur") + "</span><br>" +
      "<a href='tel:" + AB.escapeHtml((e.phone || "").replace(/\s/g, "")) + "'>📞 " + AB.escapeHtml(e.phone || "—") + "</a></div></div>"
    ).join("") : "<p class='muted'>Aucun concepteur disponible pour le moment.</p>";
  }

  /* ==========  PROJETS RÉALISÉS (galerie)  ========== */
  const PROJETS = [
    { img: "assets/images/render-villa.jpg", t: "Villa contemporaine", c: "Villas & Duplex" },
    { img: "assets/images/ext-villa-dusk.jpg", t: "Villa d'architecte", c: "Villas & Duplex" },
    { img: "assets/images/ext-villa-pool.jpg", t: "Villa avec piscine", c: "Villas & Duplex" },
    { img: "assets/images/ext-villa-terrace.jpg", t: "Duplex moderne", c: "Villas & Duplex" },
    { img: "assets/images/ext-villa-white.jpg", t: "Villa minimaliste", c: "Villas & Duplex" },
    { img: "assets/images/render-house.jpg", t: "Maison familiale moderne", c: "Villas & Duplex" },
    { img: "assets/images/render-tower.jpg", t: "Immeuble R+6 mixte", c: "Immeubles" },
    { img: "assets/images/render-interior.jpg", t: "Hall & réception", c: "Intérieurs" },
    { img: "assets/images/int-living-garden.jpg", t: "Séjour ouvert sur jardin", c: "Intérieurs" },
    { img: "assets/images/int-living-stair.jpg", t: "Séjour & mezzanine", c: "Intérieurs" },
    { img: "assets/images/int-living-warm.jpg", t: "Salon design chaleureux", c: "Intérieurs" },
    { img: "assets/images/int-living-glass.jpg", t: "Salon baie vitrée", c: "Intérieurs" },
  ];
  function renderProjets() {
    const grid = $("clientProjGrid");
    if (!grid || grid.dataset.done) return;
    grid.innerHTML = PROJETS.map((p) =>
      '<article class="pcard" data-img="' + p.img + '">' +
        '<div class="pcard__img"><img src="' + p.img + '" alt="' + AB.escapeHtml(p.t) + '" loading="lazy" /><span class="pcard__zoom">＋</span></div>' +
        '<div class="pcard__body"><span class="pcard__cat">' + p.c + '</span><h3>' + AB.escapeHtml(p.t) + '</h3><p>📍 Lomé, Togo</p></div>' +
      "</article>").join("");
    grid.dataset.done = "1";
  }
  (function () {
    const lb = $("lightbox"), lbImg = $("lbImg");
    if (!lb) return;
    document.addEventListener("click", (e) => {
      const card = e.target.closest("#clientProjGrid .pcard");
      if (card) { lbImg.src = card.dataset.img; lb.classList.add("open"); }
    });
    $("lbClose").addEventListener("click", () => lb.classList.remove("open"));
    lb.addEventListener("click", (e) => { if (e.target === lb) lb.classList.remove("open"); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") lb.classList.remove("open"); });
  })();

  /* ==========  ORCHESTRATION  ========== */
  async function refreshAll() { await loadMine(); refreshKpis(); renderRecent(); renderRequests(); }
  async function onViewChange(view) {
    if (view === "requests") { await loadMine(); renderRequests(); }
    if (view === "dash") { await loadMine(); refreshKpis(); renderRecent(); }
    if (view === "projets") renderProjets();
    if (view === "contact") renderContacts();
    if (view === "new") recalc();
  }

  recalc();
  await refreshAll();
  renderContacts();
})();
