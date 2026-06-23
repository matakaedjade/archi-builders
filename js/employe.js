/* =====================================================================
   ARCHI_BUILDERS — Espace Employé (Supabase) — métiers, collègues, rapports
   ===================================================================== */
(async function () {
  "use strict";

  const session = await SHELL.initSession("employe");
  if (!session) return;
  SHELL.initMobile();
  SHELL.initModal();
  const nav = SHELL.initNav(onViewChange);
  const $ = (id) => document.getElementById(id);

  // Affiche le métier dans le bandeau
  const roleEl = $("whoRole");
  if (roleEl) roleEl.textContent = session.department ? AB.deptLabel(session.department) : "Employé";

  let allReqs = [];
  let myReports = [];
  const mine = () => allReqs.filter((r) => r.assignedTo === session.name);
  async function load() { allReqs = await DB.getRequests(); }

  function refreshKpis() {
    $("kTotal").textContent = allReqs.length;
    $("kNew").textContent = allReqs.filter((x) => x.status === "new").length;
    $("kMine").textContent = mine().length;
    $("kDone").textContent = allReqs.filter((x) => x.status === "done").length;
  }

  /* ----------  Tableau des demandes  ---------- */
  function tableHtml(list) {
    if (!list.length) return "<div class='empty'><div class='ic'>📭</div><p>Aucune demande.</p></div>";
    return '<div class="table-wrap"><table class="tbl"><thead><tr>' +
      "<th>Client</th><th>Projet</th><th>Surface</th><th>Montant</th><th>Statut</th><th>Affecté à</th><th></th>" +
      "</tr></thead><tbody>" +
      list.map((r) =>
        "<tr>" +
        "<td><span class='strong'>" + AB.escapeHtml(r.clientName) + "</span><br><span class='muted'>" + AB.escapeHtml(r.phone || r.clientEmail) + "</span></td>" +
        "<td>" + AB.escapeHtml(r.buildingType) + "<br><span class='muted'>" + AB.escapeHtml(r.style) + "</span></td>" +
        "<td>" + AB.formatNumber(r.builtSurface) + " m²<br><span class='muted'>" + r.percentage + "%</span></td>" +
        "<td class='strong'>" + AB.formatMoney(r.amount) + "</td>" +
        "<td>" + SHELL.badge(r.status) + "</td>" +
        "<td>" + (r.assignedTo ? AB.escapeHtml(r.assignedTo) : "<span class='muted'>—</span>") + "</td>" +
        "<td><button class='btn btn--outline btn--sm' data-detail='" + r.id + "'>Ouvrir</button></td>" +
        "</tr>").join("") +
      "</tbody></table></div>";
  }
  function renderDash() { $("dashTable").innerHTML = tableHtml(allReqs.slice(0, 6)); }
  function renderAll() {
    const f = $("filterStatus").value;
    $("allTable").innerHTML = tableHtml(f ? allReqs.filter((r) => r.status === f) : allReqs);
  }
  function renderMine() { $("mineTable").innerHTML = tableHtml(mine()); }
  $("filterStatus").addEventListener("change", renderAll);

  /* ----------  Détail + actions sur les dossiers  ---------- */
  document.addEventListener("click", async (e) => {
    const pr = e.target.closest("[data-printreq]");
    if (pr) { const r = allReqs.find((x) => x.id === pr.dataset.printreq); if (r) SHELL.printRequest(r); return; }
    const d = e.target.closest("[data-detail]");
    if (d) { const r = allReqs.find((x) => x.id === d.dataset.detail); if (r) showDetail(r); return; }
    const act = e.target.closest("[data-act]");
    if (!act) return;
    const id = act.dataset.id;
    act.disabled = true;
    if (act.dataset.act === "assign") await DB.updateRequest(id, { assignedTo: session.name, status: "progress" });
    if (act.dataset.act === "status") await DB.updateRequest(id, { status: act.dataset.val });
    await load();
    refreshKpis(); renderDash(); renderAll(); renderMine();
    const r = allReqs.find((x) => x.id === id);
    if (r) showDetail(r); else SHELL.closeModal();
  });

  function showDetail(r) {
    const actions =
      "<div style='margin-top:16px;display:flex;gap:8px;flex-wrap:wrap'>" +
      (r.assignedTo === session.name ? "" : "<button class='btn btn--gold btn--sm' data-act='assign' data-id='" + r.id + "'>M'affecter ce dossier</button>") +
      "<button class='btn btn--outline btn--sm' data-act='status' data-val='progress' data-id='" + r.id + "'>En cours</button>" +
      "<button class='btn btn--outline btn--sm' data-act='status' data-val='done' data-id='" + r.id + "'>Terminée</button>" +
      "<button class='btn btn--outline btn--sm' data-act='status' data-val='rejected' data-id='" + r.id + "'>Refuser</button>" +
      "</div>";
    SHELL.openModal("Demande — " + r.clientName,
      SHELL.row("Client", AB.escapeHtml(r.clientName)) +
      SHELL.row("Contact", "📞 " + AB.escapeHtml(r.phone || "—") + " · " + AB.escapeHtml(r.clientEmail)) +
      SHELL.row("Statut", SHELL.badge(r.status)) +
      SHELL.briefRows(r) +
      SHELL.row("Affecté à", r.assignedTo ? AB.escapeHtml(r.assignedTo) : "—") +
      SHELL.row("Date", AB.formatDate(r.createdAt)) +
      SHELL.amountBlock(r.amount) +
      "<div style='margin-top:14px;text-align:center'><button class='btn btn--outline btn--sm' data-printreq='" + r.id + "'>📄 Télécharger le détail (PDF)</button></div>" +
      actions);
  }

  /* ----------  Collègues (toute l'équipe)  ---------- */
  async function renderColleagues() {
    const staff = await DB.getStaff();
    if (!staff.length) { $("colleaguesTable").innerHTML = "<div class='empty'><div class='ic'>👥</div><p>Aucun membre pour l'instant.</p></div>"; return; }
    $("colleaguesTable").innerHTML = "<div class='table-wrap'><table class='tbl'><thead><tr>" +
      "<th>Nom</th><th>Métier</th><th>Téléphone</th><th>E-mail</th></tr></thead><tbody>" +
      staff.map((u) =>
        "<tr>" +
        "<td class='strong'>" + AB.escapeHtml(u.name || "—") + (u.id === session.id ? " <span class='muted'>(vous)</span>" : "") + "</td>" +
        "<td>" + AB.escapeHtml(u.department ? AB.deptLabel(u.department) : (u.role === "admin" ? "Direction" : "Employé")) + "</td>" +
        "<td>" + (u.phone ? "<a href='tel:" + AB.escapeHtml((u.phone || "").replace(/\s/g, "")) + "'>" + AB.escapeHtml(u.phone) + "</a>" : "—") + "</td>" +
        "<td class='muted'>" + AB.escapeHtml(u.email || "") + "</td>" +
        "</tr>").join("") +
      "</tbody></table></div>";
  }

  /* ----------  Rapports  ---------- */
  $("reportForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const ok = $("reportOk"), err = $("reportErr");
    ok.classList.remove("show"); err.classList.remove("show");
    const title = $("rTitle").value.trim();
    const content = $("rContent").value.trim();
    if (!title || !content) { err.textContent = "Titre et contenu sont obligatoires."; err.classList.add("show"); return; }
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true; const lbl = btn.textContent; btn.textContent = "⏳ Envoi…";
    const res = await DB.addReport({ title, period: $("rPeriod").value.trim(), content });
    btn.disabled = false; btn.textContent = lbl;
    if (!res.ok) { err.textContent = res.error || "Erreur lors de l'envoi."; err.classList.add("show"); return; }
    ok.textContent = "✅ Rapport envoyé à la direction.";
    ok.classList.add("show");
    $("reportForm").reset();
    await loadReports();
  });

  async function loadReports() {
    myReports = await DB.getReports();
    renderMyReports();
  }
  function renderMyReports() {
    if (!myReports.length) { $("myReportsTable").innerHTML = "<div class='empty'><div class='ic'>📝</div><p>Aucun rapport envoyé pour le moment.</p></div>"; return; }
    $("myReportsTable").innerHTML = "<div class='table-wrap'><table class='tbl'><thead><tr>" +
      "<th>Titre</th><th>Période</th><th>Date</th><th></th></tr></thead><tbody>" +
      myReports.map((r) =>
        "<tr>" +
        "<td class='strong'>" + AB.escapeHtml(r.title) + "</td>" +
        "<td>" + AB.escapeHtml(r.period || "—") + "</td>" +
        "<td class='muted'>" + AB.formatDate(r.createdAt) + "</td>" +
        "<td><button class='btn btn--outline btn--sm' data-report='" + r.id + "'>Voir</button></td>" +
        "</tr>").join("") +
      "</tbody></table></div>";
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-report]");
    if (!b) return;
    const r = myReports.find((x) => x.id === b.dataset.report);
    if (r) SHELL.openModal("Rapport — " + r.title,
      SHELL.row("Période", AB.escapeHtml(r.period || "—")) +
      SHELL.row("Date", AB.formatDate(r.createdAt)) +
      "<div style='margin-top:14px;white-space:pre-wrap'>" + AB.escapeHtml(r.content) + "</div>");
  });

  /* ----------  Mes évaluations (notes de la direction)  ---------- */
  async function renderEvaluations() {
    const ratings = await DB.getRatings();
    const scores = ratings.map((x) => x.score);
    $("myRatingGlobal").innerHTML =
      "<div style='padding:18px;background:var(--green-100);border-radius:12px'>" +
      "<div class='muted' style='font-size:.8rem;letter-spacing:.1em;text-transform:uppercase'>Note globale</div>" +
      "<div style='font-size:1.3rem;margin-top:4px'>" + SHELL.starsHtml(scores) + "</div></div>";
    if (!ratings.length) { $("myRatingsTable").innerHTML = "<div class='empty'><div class='ic'>⭐</div><p>Aucune note pour le moment. Vos notes apparaîtront ici après évaluation par la direction.</p></div>"; return; }
    $("myRatingsTable").innerHTML = "<div class='table-wrap'><table class='tbl'><thead><tr>" +
      "<th>Projet</th><th>Note</th><th>Commentaire</th><th>Par</th><th>Date</th></tr></thead><tbody>" +
      ratings.map((r) =>
        "<tr>" +
        "<td class='strong'>" + AB.escapeHtml(r.projectLabel || "Projet") + "</td>" +
        "<td><b>" + (r.score != null ? r.score + "/10" : "—") + "</b></td>" +
        "<td>" + AB.escapeHtml(r.comment || "—") + "</td>" +
        "<td class='muted'>" + AB.escapeHtml(r.ratedBy || "Direction") + "</td>" +
        "<td class='muted'>" + AB.formatDate(r.createdAt) + "</td>" +
        "</tr>").join("") +
      "</tbody></table></div>";
  }

  /* ----------  Orchestration  ---------- */
  async function onViewChange(view) {
    if (view === "dash") { await load(); refreshKpis(); renderDash(); }
    if (view === "requests") { await load(); renderAll(); }
    if (view === "mine") { await load(); renderMine(); }
    if (view === "colleagues") renderColleagues();
    if (view === "reports") loadReports();
    if (view === "evaluations") renderEvaluations();
    if (view === "org") { document.getElementById("orgWrap").innerHTML = SHELL.orgChartHtml(await DB.getStaff()); }
  }

  await load();
  refreshKpis(); renderDash(); renderAll(); renderMine();
})();
