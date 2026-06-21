/* =====================================================================
   ARCHI_BUILDERS — Espace Client
   ===================================================================== */
(function () {
  "use strict";

  const session = SHELL.initSession("client");
  if (!session) return;
  SHELL.initMobile();
  SHELL.initModal();
  const nav = SHELL.initNav(onViewChange);

  /* ----------  État du formulaire de conception  ---------- */
  let percentage = 60;
  const files = { terrain: null, building: null };

  const $ = (id) => document.getElementById(id);

  /* ==========  ESTIMATION EN DIRECT  ========== */
  function recalc() {
    const terrain = $("terrain").value;
    const q = AB.computeQuote(terrain, percentage);
    $("sTerrain").textContent = terrain ? AB.formatNumber(terrain) + " m²" : "— m²";
    $("sPct").textContent = percentage + " %";
    $("sBuilt").textContent = q.builtSurface ? AB.formatNumber(q.builtSurface) + " m²" : "— m²";
    $("sRate").textContent = AB.formatMoney(AB.PRICE_PER_SQM);
    $("sAmount").textContent = AB.formatMoney(q.amount);
  }

  // Grille des pourcentages
  $("pctGrid").addEventListener("click", (e) => {
    const b = e.target.closest(".pct");
    if (!b) return;
    percentage = +b.dataset.v;
    $("pctGrid").querySelectorAll(".pct").forEach((p) => p.classList.toggle("active", p === b));
    recalc();
  });
  $("terrain").addEventListener("input", recalc);

  /* ==========  DÉPÔT DE FICHIERS  ========== */
  const MAX_STORED = 1_300_000; // ~1.3 Mo max conservé dans le navigateur

  function handleFile(input, slot, labelEl) {
    const f = input.files[0];
    if (!f) { files[slot] = null; labelEl.textContent = "Aucun fichier"; return; }
    labelEl.textContent = f.name + " (" + Math.round(f.size / 1024) + " Ko)";
    if (f.size <= MAX_STORED) {
      const reader = new FileReader();
      reader.onload = () => { files[slot] = { name: f.name, size: f.size, type: f.type, data: reader.result }; };
      reader.readAsDataURL(f);
    } else {
      // Trop volumineux pour être stocké localement : on garde seulement le nom
      files[slot] = { name: f.name, size: f.size, type: f.type, data: null };
      labelEl.textContent = f.name + " — trop lourd pour l'aperçu, nom conservé";
    }
  }
  $("filePlanTerrain").addEventListener("change", (e) => handleFile(e.target, "terrain", $("nameTerrain")));
  $("filePlanBuilding").addEventListener("change", (e) => handleFile(e.target, "building", $("nameBuilding")));

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

  /* ==========  ENVOI DE LA DEMANDE  ========== */
  $("conceptForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const ok = $("formOk"), err = $("formErr");
    ok.classList.remove("show"); err.classList.remove("show");

    const terrain = +$("terrain").value;
    if (!terrain || terrain <= 0) { err.textContent = "Veuillez indiquer la surface de votre terrain (partie 2)."; err.classList.add("show"); return; }
    if (!files.terrain) { err.textContent = "Veuillez joindre le plan parcellaire du terrain (partie 4)."; err.classList.add("show"); return; }

    const q = AB.computeQuote(terrain, percentage);
    const attached = [];
    if (files.terrain) attached.push({ ...files.terrain, role: "Plan parcellaire du terrain" });
    if (files.building) attached.push({ ...files.building, role: "Plan / esquisse" });

    const extras = [...document.querySelectorAll("#extras input:checked")].map((c) => c.value);

    const res = AB.addRequest({
      clientName: session.name,
      clientEmail: session.email,
      phone: (AB.findUserByEmail(session.email) || {}).phone || "",
      nature: resolve("nature", "natureOther"),
      usage: $("usage").value,
      buildingType: resolve("btype", "btypeOther"),
      style: resolve("style", "styleOther"),
      levels: +$("levels").value || 1,
      rooms: +$("rooms").value || 0,
      bathrooms: +$("bathrooms").value || 0,
      livings: +$("livings").value || 0,
      diningrooms: +$("diningrooms").value || 0,
      kitchens: +$("kitchens").value || 0,
      offices: +$("offices").value || 0,
      dressings: +$("dressings").value || 0,
      parking: +$("parking").value || 0,
      storerooms: +$("storerooms").value || 0,
      extras,
      otherRooms: $("otherRooms").value.trim(),
      location: $("location").value.trim(),
      topography: $("topography").value,
      orientation: $("orientation").value,
      budget: $("budget").value,
      deadline: $("deadline").value,
      terrainSurface: terrain,
      percentage,
      builtSurface: q.builtSurface,
      amount: q.amount,
      notes: $("notes").value.trim(),
      files: attached,
    });

    if (!res.ok) { err.textContent = res.error || "Une erreur est survenue."; err.classList.add("show"); return; }

    ok.innerHTML = "✅ Demande envoyée ! Estimation : <b>" + AB.formatMoney(q.amount) +
      "</b>. Nos architectes vous recontactent rapidement.";
    ok.classList.add("show");
    $("conceptForm").reset();
    files.terrain = files.building = null;
    $("nameTerrain").textContent = $("nameBuilding").textContent = "Aucun fichier";
    percentage = 60;
    $("pctGrid").querySelectorAll(".pct").forEach((p) => p.classList.toggle("active", +p.dataset.v === 60));
    document.querySelectorAll("select[data-other]").forEach((sel) => $(sel.dataset.other).classList.add("hidden"));
    recalc();
    refreshAll();
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => nav.show("requests"), 1600);
  });

  /* ==========  KPIs + RÉCENTES  ========== */
  function myRequests() { return AB.getRequestsByEmail(session.email); }

  function refreshKpis() {
    const r = myRequests();
    $("kTotal").textContent = r.length;
    $("kProgress").textContent = r.filter((x) => x.status === "progress" || x.status === "new").length;
    $("kDone").textContent = r.filter((x) => x.status === "done").length;
    $("kAmount").textContent = AB.formatMoney(r.reduce((s, x) => s + (x.amount || 0), 0));
  }

  function renderRecent() {
    const r = myRequests().slice(0, 4);
    const wrap = $("dashRecent");
    if (!r.length) { wrap.innerHTML = emptyBlock("Vous n'avez pas encore de demande.", "new", "Créer ma première conception"); return; }
    wrap.innerHTML = tableHtml(r);
  }

  function renderRequests() {
    const r = myRequests();
    const wrap = $("reqTableWrap");
    if (!r.length) { wrap.innerHTML = emptyBlock("Aucune demande pour le moment.", "new", "Lancer une conception"); return; }
    wrap.innerHTML = tableHtml(r);
  }

  function tableHtml(list) {
    return '<div class="table-wrap"><table class="tbl"><thead><tr>' +
      "<th>Projet</th><th>Surface</th><th>Montant</th><th>Statut</th><th>Date</th><th></th>" +
      "</tr></thead><tbody>" +
      list.map((r) =>
        "<tr>" +
        '<td><span class="strong">' + AB.escapeHtml(r.buildingType) + "</span><br><span class='muted'>" + AB.escapeHtml(r.style) + " · " + r.rooms + " ch.</span></td>" +
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

  /* ==========  DÉTAIL (modale)  ========== */
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-detail]");
    if (!b) return;
    const r = AB.getRequests().find((x) => x.id === b.dataset.detail);
    if (r) showDetail(r);
  });

  function showDetail(r) {
    SHELL.openModal("Demande — " + (r.buildingType || "Projet"),
      SHELL.row("Statut", SHELL.badge(r.status)) +
      SHELL.briefRows(r) +
      SHELL.row("Architecte assigné", r.assignedTo ? AB.escapeHtml(r.assignedTo) : "<span class='muted'>En attente d'affectation</span>") +
      SHELL.row("Date de la demande", AB.formatDate(r.createdAt)) +
      SHELL.amountBlock(r.amount));
  }

  /* ==========  CONTACT  ========== */
  function renderContacts() {
    const emps = AB.getEmployees();
    $("contactCards").innerHTML = emps.map((e) =>
      '<div class="cc"><div class="av">' + (e.name || "?").charAt(0) + "</div>" +
      "<div><b>" + AB.escapeHtml(e.name) + "</b>" +
      "<span class='muted' style='font-size:.82rem'>" + AB.escapeHtml(e.title || "Concepteur") + "</span><br>" +
      "<a href='tel:" + AB.escapeHtml((e.phone || "").replace(/\s/g, "")) + "'>📞 " + AB.escapeHtml(e.phone || "—") + "</a></div></div>"
    ).join("");
  }

  /* ==========  ORCHESTRATION  ========== */
  function refreshAll() { refreshKpis(); renderRecent(); renderRequests(); }
  function onViewChange(view) {
    if (view === "requests") renderRequests();
    if (view === "dash") { refreshKpis(); renderRecent(); }
    if (view === "contact") renderContacts();
    if (view === "new") recalc();
  }

  refreshAll();
  renderContacts();
  recalc();
})();
