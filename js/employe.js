/* =====================================================================
   ARCHI_BUILDERS — Espace Employé (Supabase)
   ===================================================================== */
(async function () {
  "use strict";

  const session = await SHELL.initSession("employe");
  if (!session) return;
  SHELL.initMobile();
  SHELL.initModal();
  const nav = SHELL.initNav(onViewChange);
  const $ = (id) => document.getElementById(id);

  let allReqs = [];
  const mine = () => allReqs.filter((r) => r.assignedTo === session.name);

  async function load() { allReqs = await DB.getRequests(); }

  function refreshKpis() {
    $("kTotal").textContent = allReqs.length;
    $("kNew").textContent = allReqs.filter((x) => x.status === "new").length;
    $("kMine").textContent = mine().length;
    $("kDone").textContent = allReqs.filter((x) => x.status === "done").length;
  }

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

  /* ----------  Détail + actions  ---------- */
  document.addEventListener("click", async (e) => {
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
      actions);
  }

  async function onViewChange(view) {
    if (view === "dash") { await load(); refreshKpis(); renderDash(); }
    if (view === "requests") { await load(); renderAll(); }
    if (view === "mine") { await load(); renderMine(); }
  }

  await load();
  refreshKpis(); renderDash(); renderAll(); renderMine();
})();
