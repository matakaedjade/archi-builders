/* =====================================================================
   ARCHI_BUILDERS — Espace Administration / Direction (Supabase)
   Métiers, supervision par métier, rapports, gestion des comptes
   ===================================================================== */
(async function () {
  "use strict";

  const session = await SHELL.initSession("admin");
  if (!session) return;
  SHELL.initMobile();
  SHELL.initModal();
  SHELL.initNav(onViewChange);
  const $ = (id) => document.getElementById(id);
  const esc = AB.escapeHtml;

  let allReqs = [];
  let profiles = [];
  let allReports = [];
  const staff = () => profiles.filter((p) => p.role === "employe" || p.role === "admin");
  const clients = () => profiles.filter((p) => p.role === "client");

  // Affiche le poste de direction dans le bandeau
  const roleEl = document.querySelector(".who .meta span");
  if (roleEl) roleEl.textContent = session.department ? AB.deptLabel(session.department) : "Administrateur";

  async function loadAll() {
    allReqs = await DB.getRequests();
    profiles = await DB.getAllProfiles();
    allReports = await DB.getReports();
  }

  /* ----------  KPIs  ---------- */
  function refreshKpis() {
    $("kReq").textContent = allReqs.length;
    $("kRev").textContent = AB.formatMoney(allReqs.reduce((s, x) => s + (x.amount || 0), 0));
    $("kClients").textContent = clients().length;
    $("kEmp").textContent = staff().length;
  }

  /* ----------  Tableau des demandes (affectation + statut)  ---------- */
  function reqRow(r) {
    const options = "<option value=''>— Affecter —</option>" +
      staff().map((e) => "<option value='" + esc(e.name) + "'" + (r.assignedTo === e.name ? " selected" : "") + ">" + esc(e.name) + "</option>").join("");
    const statusSel = ["new", "progress", "done", "rejected"].map((s) =>
      "<option value='" + s + "'" + (r.status === s ? " selected" : "") + ">" + AB.STATUS[s].label + "</option>").join("");
    return "<tr>" +
      "<td><span class='strong'>" + esc(r.clientName) + "</span><br><span class='muted'>" + esc(r.phone || r.clientEmail) + "</span></td>" +
      "<td>" + esc(r.buildingType) + "<br><span class='muted'>" + AB.formatNumber(r.builtSurface) + " m² · " + r.percentage + "%</span></td>" +
      "<td class='strong'>" + AB.formatMoney(r.amount) + "</td>" +
      "<td><select class='select' style='padding:7px 10px;font-size:.82rem' data-assign='" + r.id + "'>" + options + "</select></td>" +
      "<td><select class='select' style='padding:7px 10px;font-size:.82rem' data-status='" + r.id + "'>" + statusSel + "</select></td>" +
      "<td style='white-space:nowrap'>" +
        "<button class='btn btn--outline btn--sm' data-detail='" + r.id + "'>Voir</button> " +
        "<button class='btn btn--sm' style='background:#fbe9e7;color:#c0392b' data-del='" + r.id + "'>🗑</button>" +
      "</td></tr>";
  }
  function reqTable(list) {
    if (!list.length) return "<div class='empty'><div class='ic'>📭</div><p>Aucune demande.</p></div>";
    return "<div class='table-wrap'><table class='tbl'><thead><tr>" +
      "<th>Client</th><th>Projet</th><th>Montant</th><th>Affecté à</th><th>Statut</th><th>Actions</th>" +
      "</tr></thead><tbody>" + list.map(reqRow).join("") + "</tbody></table></div>";
  }
  function renderDash() { $("dashTable").innerHTML = reqTable(allReqs.slice(0, 6)); }
  function renderAll() {
    const f = $("filterStatus").value;
    $("allTable").innerHTML = reqTable(f ? allReqs.filter((r) => r.status === f) : allReqs);
  }
  $("filterStatus").addEventListener("change", renderAll);

  /* ----------  Sélecteurs rôle & métier  ---------- */
  function roleSelect(p) {
    const opts = [["client", "🏠 Client"], ["employe", "👷 Employé"], ["admin", "🏛️ Direction"]];
    return "<select class='select' style='padding:7px 10px;font-size:.82rem' data-roleuser='" + p.id + "'>" +
      opts.map((o) => "<option value='" + o[0] + "'" + (p.role === o[0] ? " selected" : "") + ">" + o[1] + "</option>").join("") +
      "</select>";
  }
  function deptSelect(p) {
    const list = p.role === "admin" ? AB.ADMIN_DEPTS : AB.EMPLOYEE_DEPTS;
    return "<select class='select' style='padding:7px 10px;font-size:.82rem' data-deptuser='" + p.id + "'>" +
      "<option value=''>— Métier —</option>" +
      list.map((d) => "<option value='" + d + "'" + (p.department === d ? " selected" : "") + ">" + AB.deptLabel(d) + "</option>").join("") +
      "</select>";
  }

  /* ----------  Interactions (selects)  ---------- */
  document.addEventListener("change", async (e) => {
    const as = e.target.closest("[data-assign]");
    if (as) { await DB.updateRequest(as.dataset.assign, { assignedTo: as.value, status: as.value ? "progress" : "new" }); await reloadReq(); return; }
    const st = e.target.closest("[data-status]");
    if (st) { await DB.updateRequest(st.dataset.status, { status: st.value }); await reloadReq(); return; }
    const rl = e.target.closest("[data-roleuser]");
    if (rl) { await DB.setRole(rl.dataset.roleuser, rl.value); await reloadProfiles(); return; }
    const dp = e.target.closest("[data-deptuser]");
    if (dp) { await DB.updateProfile(dp.dataset.deptuser, { department: dp.value || null }); await reloadProfiles(); return; }
  });

  /* ----------  Interactions (clics)  ---------- */
  document.addEventListener("click", async (e) => {
    const det = e.target.closest("[data-detail]");
    if (det) { const r = allReqs.find((x) => x.id === det.dataset.detail); if (r) showDetail(r); return; }
    const del = e.target.closest("[data-del]");
    if (del) { if (confirm("Supprimer définitivement cette demande ?")) { await DB.deleteRequest(del.dataset.del); await reloadReq(); } return; }
    const delU = e.target.closest("[data-deluser]");
    if (delU) { if (confirm("Retirer ce compte ? (la personne perdra son accès)")) { await DB.deleteProfile(delU.dataset.deluser); await reloadProfiles(); } return; }
    const act = e.target.closest("[data-activity]");
    if (act) { showActivity(act.dataset.activity); return; }
    const rep = e.target.closest("[data-report]");
    if (rep) { const r = allReports.find((x) => x.id === rep.dataset.report); if (r) showReport(r); return; }
    const delR = e.target.closest("[data-delreport]");
    if (delR) { if (confirm("Supprimer ce rapport ?")) { await DB.deleteReport(delR.dataset.delreport); allReports = await DB.getReports(); renderReports(); } return; }
  });

  async function reloadReq() { allReqs = await DB.getRequests(); refreshKpis(); renderDash(); renderAll(); }
  async function reloadProfiles() { profiles = await DB.getAllProfiles(); refreshKpis(); renderTeam(); renderClients(); }

  function showDetail(r) {
    SHELL.openModal("Demande — " + r.clientName,
      SHELL.row("Client", esc(r.clientName)) +
      SHELL.row("Contact", "📞 " + esc(r.phone || "—") + " · " + esc(r.clientEmail)) +
      SHELL.row("Statut", SHELL.badge(r.status)) +
      SHELL.briefRows(r) +
      SHELL.row("Affecté à", r.assignedTo ? esc(r.assignedTo) : "—") +
      SHELL.row("Date", AB.formatDate(r.createdAt)) +
      SHELL.amountBlock(r.amount));
  }

  /* ----------  Équipe (employés & direction)  ---------- */
  function renderTeam() {
    const list = staff();
    if (!list.length) { $("empTable").innerHTML = "<div class='empty'><div class='ic'>👷</div><p>Aucun membre d'équipe. Promouvez un client depuis l'onglet « Clients ».</p></div>"; return; }
    $("empTable").innerHTML = "<div class='table-wrap'><table class='tbl'><thead><tr>" +
      "<th>Nom</th><th>Rôle</th><th>Métier</th><th>Contact</th><th></th></tr></thead><tbody>" +
      list.map((u) =>
        "<tr>" +
        "<td class='strong'>" + esc(u.name || "—") + "</td>" +
        "<td>" + roleSelect(u) + "</td>" +
        "<td>" + deptSelect(u) + "</td>" +
        "<td><span class='muted'>" + esc(u.email || "") + "<br>" + esc(u.phone || "") + "</span></td>" +
        "<td>" + (u.id === session.id ? "<span class='muted'>vous</span>" : "<button class='btn btn--sm' style='background:#fbe9e7;color:#c0392b' data-deluser='" + u.id + "'>🗑</button>") + "</td>" +
        "</tr>").join("") +
      "</tbody></table></div>";
  }

  /* ----------  Clients  ---------- */
  function renderClients() {
    const list = clients();
    if (!list.length) { $("clientTable").innerHTML = "<div class='empty'><div class='ic'>🧑</div><p>Aucun client inscrit.</p></div>"; return; }
    $("clientTable").innerHTML = "<div class='table-wrap'><table class='tbl'><thead><tr>" +
      "<th>Nom</th><th>E-mail</th><th>Téléphone</th><th>Demandes</th><th>Rôle</th><th></th></tr></thead><tbody>" +
      list.map((c) => {
        const n = allReqs.filter((r) => (r.clientEmail || "").toLowerCase() === (c.email || "").toLowerCase()).length;
        return "<tr>" +
          "<td class='strong'>" + esc(c.name || "—") + "</td>" +
          "<td>" + esc(c.email || "") + "</td>" +
          "<td>" + esc(c.phone || "—") + "</td>" +
          "<td>" + n + "</td>" +
          "<td>" + roleSelect(c) + "</td>" +
          "<td><button class='btn btn--sm' style='background:#fbe9e7;color:#c0392b' data-deluser='" + c.id + "'>🗑</button></td>" +
          "</tr>";
      }).join("") +
      "</tbody></table></div>";
  }

  /* ----------  Supervision par métier  ---------- */
  function deptName(d) { return d === "autre" ? "Sans métier attribué" : AB.deptLabel(d); }
  function renderSupervision() {
    const groups = {};
    staff().forEach((p) => { const d = p.department || "autre"; (groups[d] = groups[d] || []).push(p); });
    const order = AB.EMPLOYEE_DEPTS.concat(AB.ADMIN_DEPTS).concat(["autre"]);
    let html = order.filter((d) => groups[d]).map((d) => {
      const members = groups[d];
      return "<div class='panel' style='margin-bottom:16px'>" +
        "<h3 style='margin-bottom:12px'>" + deptName(d) + " <span class='muted' style='font-weight:400'>· " + members.length + " membre(s)</span></h3>" +
        "<div class='table-wrap'><table class='tbl'><thead><tr><th>Membre</th><th>Dossiers</th><th>En cours</th><th>Terminés</th><th>Rapports</th><th></th></tr></thead><tbody>" +
        members.map((m) => {
          const ass = allReqs.filter((r) => r.assignedTo === m.name);
          const prog = ass.filter((r) => r.status === "progress").length;
          const done = ass.filter((r) => r.status === "done").length;
          const reps = allReports.filter((r) => r.authorName === m.name).length;
          return "<tr><td class='strong'>" + esc(m.name) + "</td><td>" + ass.length + "</td><td>" + prog + "</td><td>" + done + "</td><td>" + reps + "</td>" +
            "<td><button class='btn btn--outline btn--sm' data-activity='" + m.id + "'>Voir l'activité</button></td></tr>";
        }).join("") +
        "</tbody></table></div></div>";
    }).join("");
    if (!html) html = "<div class='empty'><div class='ic'>🗂</div><p>Aucun employé avec un métier. Attribuez les métiers dans l'onglet « Équipe ».</p></div>";
    $("supervisionWrap").innerHTML = html;
  }

  function showActivity(id) {
    const m = profiles.find((p) => p.id === id);
    if (!m) return;
    const ass = allReqs.filter((r) => r.assignedTo === m.name);
    const reps = allReports.filter((r) => r.authorName === m.name);
    const dossiers = ass.length
      ? "<div class='table-wrap'><table class='tbl'><thead><tr><th>Client</th><th>Projet</th><th>Statut</th></tr></thead><tbody>" +
        ass.map((r) => "<tr><td>" + esc(r.clientName) + "</td><td>" + esc(r.buildingType) + "</td><td>" + SHELL.badge(r.status) + "</td></tr>").join("") +
        "</tbody></table></div>"
      : "<span class='muted'>Aucun dossier affecté.</span>";
    const rapports = reps.length
      ? reps.map((r) => "<div class='file-pill' style='display:block;margin:6px 0'>📝 <b>" + esc(r.title) + "</b> <span class='muted'>· " + AB.formatDate(r.createdAt) + "</span><br><span style='white-space:pre-wrap'>" + esc(r.content) + "</span></div>").join("")
      : "<span class='muted'>Aucun rapport.</span>";
    SHELL.openModal("Activité — " + (m.name || ""),
      SHELL.row("Métier", esc(m.department ? AB.deptLabel(m.department) : "—")) +
      SHELL.row("Contact", "📞 " + esc(m.phone || "—") + " · " + esc(m.email || "")) +
      "<div style='margin-top:14px'><b>Dossiers affectés :</b><br>" + dossiers + "</div>" +
      "<div style='margin-top:16px'><b>Rapports envoyés :</b><br>" + rapports + "</div>");
  }

  /* ----------  Rapports (direction voit tout)  ---------- */
  function renderReports() {
    if (!allReports.length) { $("adminReportsTable").innerHTML = "<div class='empty'><div class='ic'>📝</div><p>Aucun rapport reçu pour le moment.</p></div>"; return; }
    $("adminReportsTable").innerHTML = "<div class='table-wrap'><table class='tbl'><thead><tr>" +
      "<th>Auteur</th><th>Métier</th><th>Titre</th><th>Période</th><th>Date</th><th></th></tr></thead><tbody>" +
      allReports.map((r) =>
        "<tr>" +
        "<td class='strong'>" + esc(r.authorName || "—") + "</td>" +
        "<td>" + esc(r.department ? AB.deptLabel(r.department) : "—") + "</td>" +
        "<td>" + esc(r.title) + "</td>" +
        "<td>" + esc(r.period || "—") + "</td>" +
        "<td class='muted'>" + AB.formatDate(r.createdAt) + "</td>" +
        "<td style='white-space:nowrap'><button class='btn btn--outline btn--sm' data-report='" + r.id + "'>Lire</button> " +
        "<button class='btn btn--sm' style='background:#fbe9e7;color:#c0392b' data-delreport='" + r.id + "'>🗑</button></td>" +
        "</tr>").join("") +
      "</tbody></table></div>";
  }
  function showReport(r) {
    SHELL.openModal("Rapport — " + r.title,
      SHELL.row("Auteur", esc(r.authorName || "—")) +
      SHELL.row("Métier", esc(r.department ? AB.deptLabel(r.department) : "—")) +
      SHELL.row("Période", esc(r.period || "—")) +
      SHELL.row("Date", AB.formatDate(r.createdAt)) +
      "<div style='margin-top:14px;white-space:pre-wrap'>" + esc(r.content) + "</div>");
  }

  /* ----------  Orchestration  ---------- */
  async function onViewChange(view) {
    if (view === "dash") { await loadAll(); refreshKpis(); renderDash(); }
    if (view === "requests") { allReqs = await DB.getRequests(); renderAll(); }
    if (view === "supervision") { await loadAll(); renderSupervision(); }
    if (view === "reports") { allReports = await DB.getReports(); renderReports(); }
    if (view === "employees") { profiles = await DB.getAllProfiles(); renderTeam(); }
    if (view === "clients") { await loadAll(); renderClients(); }
    if (view === "org") { profiles = await DB.getAllProfiles(); document.getElementById("orgWrap").innerHTML = SHELL.orgChartHtml(staff()); }
  }

  await loadAll();
  refreshKpis(); renderDash(); renderAll(); renderTeam(); renderClients();
})();
