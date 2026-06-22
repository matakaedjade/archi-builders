/* =====================================================================
   ARCHI_BUILDERS — Espace Administration (Supabase)
   ===================================================================== */
(async function () {
  "use strict";

  const session = await SHELL.initSession("admin");
  if (!session) return;
  SHELL.initMobile();
  SHELL.initModal();
  const nav = SHELL.initNav(onViewChange);
  const $ = (id) => document.getElementById(id);

  let allReqs = [];
  let profiles = [];
  const staff = () => profiles.filter((p) => p.role === "employe" || p.role === "admin");
  const clients = () => profiles.filter((p) => p.role === "client");

  async function loadAll() {
    allReqs = await DB.getRequests();
    profiles = await DB.getAllProfiles();
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
      staff().map((e) => "<option value='" + AB.escapeHtml(e.name) + "'" + (r.assignedTo === e.name ? " selected" : "") + ">" + AB.escapeHtml(e.name) + "</option>").join("");
    const statusSel = ["new", "progress", "done", "rejected"].map((s) =>
      "<option value='" + s + "'" + (r.status === s ? " selected" : "") + ">" + AB.STATUS[s].label + "</option>").join("");
    return "<tr>" +
      "<td><span class='strong'>" + AB.escapeHtml(r.clientName) + "</span><br><span class='muted'>" + AB.escapeHtml(r.phone || r.clientEmail) + "</span></td>" +
      "<td>" + AB.escapeHtml(r.buildingType) + "<br><span class='muted'>" + AB.formatNumber(r.builtSurface) + " m² · " + r.percentage + "%</span></td>" +
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

  /* ----------  Interactions (affectation, statut, rôles)  ---------- */
  document.addEventListener("change", async (e) => {
    const as = e.target.closest("[data-assign]");
    if (as) { await DB.updateRequest(as.dataset.assign, { assignedTo: as.value, status: as.value ? "progress" : "new" }); await reloadReq(); return; }
    const st = e.target.closest("[data-status]");
    if (st) { await DB.updateRequest(st.dataset.status, { status: st.value }); await reloadReq(); return; }
    const rl = e.target.closest("[data-roleuser]");
    if (rl) { await DB.setRole(rl.dataset.roleuser, rl.value); await reloadProfiles(); return; }
  });

  document.addEventListener("click", async (e) => {
    const det = e.target.closest("[data-detail]");
    if (det) { const r = allReqs.find((x) => x.id === det.dataset.detail); if (r) showDetail(r); return; }
    const del = e.target.closest("[data-del]");
    if (del) { if (confirm("Supprimer définitivement cette demande ?")) { await DB.deleteRequest(del.dataset.del); await reloadReq(); } return; }
    const delU = e.target.closest("[data-deluser]");
    if (delU) { if (confirm("Retirer ce compte ? (la personne perdra son accès)")) { await DB.deleteProfile(delU.dataset.deluser); await reloadProfiles(); } return; }
    const saveT = e.target.closest("[data-savetitle]");
    if (saveT) {
      const inp = document.querySelector("[data-title='" + saveT.dataset.savetitle + "']");
      await DB.updateProfile(saveT.dataset.savetitle, { title: inp.value.trim() });
      saveT.textContent = "✓"; setTimeout(() => (saveT.textContent = "Enregistrer"), 1200);
    }
  });

  async function reloadReq() { allReqs = await DB.getRequests(); refreshKpis(); renderDash(); renderAll(); }
  async function reloadProfiles() { profiles = await DB.getAllProfiles(); refreshKpis(); renderTeam(); renderClients(); }

  function showDetail(r) {
    SHELL.openModal("Demande — " + r.clientName,
      SHELL.row("Client", AB.escapeHtml(r.clientName)) +
      SHELL.row("Contact", "📞 " + AB.escapeHtml(r.phone || "—") + " · " + AB.escapeHtml(r.clientEmail)) +
      SHELL.row("Statut", SHELL.badge(r.status)) +
      SHELL.briefRows(r) +
      SHELL.row("Affecté à", r.assignedTo ? AB.escapeHtml(r.assignedTo) : "—") +
      SHELL.row("Date", AB.formatDate(r.createdAt)) +
      SHELL.amountBlock(r.amount));
  }

  /* ----------  Sélecteur de rôle réutilisable  ---------- */
  function roleSelect(p) {
    const opts = [["client", "🏠 Client"], ["employe", "👷 Employé"], ["admin", "🏛️ Admin"]];
    return "<select class='select' style='padding:7px 10px;font-size:.82rem' data-roleuser='" + p.id + "'>" +
      opts.map((o) => "<option value='" + o[0] + "'" + (p.role === o[0] ? " selected" : "") + ">" + o[1] + "</option>").join("") +
      "</select>";
  }

  /* ----------  Équipe (employés & admins)  ---------- */
  function renderTeam() {
    const list = staff();
    let html = "<div class='table-wrap'><table class='tbl'><thead><tr>" +
      "<th>Nom</th><th>Fonction</th><th>Rôle</th><th>Contact</th><th></th></tr></thead><tbody>";
    html += list.map((u) =>
      "<tr>" +
      "<td class='strong'>" + AB.escapeHtml(u.name || "—") + "</td>" +
      "<td><div style='display:flex;gap:6px'><input class='input' style='padding:7px 10px;font-size:.82rem' data-title='" + u.id + "' value='" + AB.escapeHtml(u.title || "") + "' placeholder='Ex. Architecte' />" +
        "<button class='btn btn--outline btn--sm' data-savetitle='" + u.id + "'>Enregistrer</button></div></td>" +
      "<td>" + roleSelect(u) + "</td>" +
      "<td><span class='muted'>" + AB.escapeHtml(u.email || "") + "<br>" + AB.escapeHtml(u.phone || "") + "</span></td>" +
      "<td>" + (u.id === session.id ? "<span class='muted'>vous</span>" : "<button class='btn btn--sm' style='background:#fbe9e7;color:#c0392b' data-deluser='" + u.id + "'>🗑</button>") + "</td>" +
      "</tr>").join("");
    html += "</tbody></table></div>";
    if (!list.length) html = "<div class='empty'><div class='ic'>👷</div><p>Aucun membre d'équipe pour l'instant.</p></div>";
    $("empTable").innerHTML = html;
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
          "<td class='strong'>" + AB.escapeHtml(c.name || "—") + "</td>" +
          "<td>" + AB.escapeHtml(c.email || "") + "</td>" +
          "<td>" + AB.escapeHtml(c.phone || "—") + "</td>" +
          "<td>" + n + "</td>" +
          "<td>" + roleSelect(c) + "</td>" +
          "<td><button class='btn btn--sm' style='background:#fbe9e7;color:#c0392b' data-deluser='" + c.id + "'>🗑</button></td>" +
          "</tr>";
      }).join("") +
      "</tbody></table></div>";
  }

  async function onViewChange(view) {
    if (view === "dash") { await loadAll(); refreshKpis(); renderDash(); }
    if (view === "requests") { allReqs = await DB.getRequests(); renderAll(); }
    if (view === "employees") { profiles = await DB.getAllProfiles(); renderTeam(); }
    if (view === "clients") { await loadAll(); renderClients(); }
  }

  await loadAll();
  refreshKpis(); renderDash(); renderAll(); renderTeam(); renderClients();
})();
