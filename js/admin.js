/* =====================================================================
   ARCHI_BUILDERS — Espace Administration
   ===================================================================== */
(function () {
  "use strict";

  const session = SHELL.initSession("admin");
  if (!session) return;
  SHELL.initMobile();
  SHELL.initModal();
  const nav = SHELL.initNav(onViewChange);
  const $ = (id) => document.getElementById(id);

  const all = () => AB.getRequests();

  /* ----------  KPIs  ---------- */
  function refreshKpis() {
    const r = all();
    $("kReq").textContent = r.length;
    $("kRev").textContent = AB.formatMoney(r.reduce((s, x) => s + (x.amount || 0), 0));
    $("kClients").textContent = AB.getClients().length;
    $("kEmp").textContent = AB.getEmployees().length;
  }

  /* ----------  Tableau des demandes (avec affectation)  ---------- */
  function reqRow(r) {
    const emps = AB.getEmployees();
    const options = "<option value=''>— Affecter —</option>" +
      emps.map((e) => "<option value='" + AB.escapeHtml(e.name) + "'" + (r.assignedTo === e.name ? " selected" : "") + ">" + AB.escapeHtml(e.name) + "</option>").join("");
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

  function tableHtml(list) {
    if (!list.length) return "<div class='empty'><div class='ic'>📭</div><p>Aucune demande.</p></div>";
    return "<div class='table-wrap'><table class='tbl'><thead><tr>" +
      "<th>Client</th><th>Projet</th><th>Montant</th><th>Affecté à</th><th>Statut</th><th>Actions</th>" +
      "</tr></thead><tbody>" + list.map(reqRow).join("") + "</tbody></table></div>";
  }

  function renderDash() { $("dashTable").innerHTML = tableHtml(all().slice(0, 6)); }
  function renderAll() {
    const f = $("filterStatus").value;
    $("allTable").innerHTML = tableHtml(f ? all().filter((r) => r.status === f) : all());
  }
  $("filterStatus").addEventListener("change", renderAll);

  /* ----------  Interactions tableau  ---------- */
  document.addEventListener("change", (e) => {
    const as = e.target.closest("[data-assign]");
    if (as) { AB.updateRequest(as.dataset.assign, { assignedTo: as.value, status: as.value ? "progress" : "new" }); refreshAll(); return; }
    const st = e.target.closest("[data-status]");
    if (st) { AB.updateRequest(st.dataset.status, { status: st.value }); refreshAll(); return; }
  });

  document.addEventListener("click", (e) => {
    const det = e.target.closest("[data-detail]");
    if (det) { const r = all().find((x) => x.id === det.dataset.detail); if (r) showDetail(r); return; }
    const del = e.target.closest("[data-del]");
    if (del) {
      if (confirm("Supprimer définitivement cette demande ?")) { AB.deleteRequest(del.dataset.del); refreshAll(); }
      return;
    }
    const delU = e.target.closest("[data-deluser]");
    if (delU) {
      if (confirm("Supprimer ce compte ?")) { AB.deleteUser(delU.dataset.deluser); renderEmployees(); renderClients(); refreshKpis(); }
    }
  });

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

  /* ----------  Création de compte employé / admin  ---------- */
  $("empForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const ok = $("empOk"), err = $("empErr");
    ok.classList.remove("show"); err.classList.remove("show");
    const res = AB.addUser({
      name: $("eName").value.trim(),
      title: $("eTitle").value.trim(),
      email: $("eEmail").value.trim(),
      phone: $("ePhone").value.trim(),
      password: $("ePass").value,
      role: $("eRole").value,
    });
    if (!res.ok) { err.textContent = res.error; err.classList.add("show"); return; }
    ok.textContent = "✅ Compte créé pour " + res.user.name + ".";
    ok.classList.add("show");
    $("empForm").reset();
    renderEmployees(); refreshKpis();
  });

  function renderEmployees() {
    const list = AB.getUsers().filter((u) => u.role === "employe" || u.role === "admin");
    $("empTable").innerHTML = "<div class='table-wrap'><table class='tbl'><thead><tr>" +
      "<th>Nom</th><th>Fonction</th><th>Rôle</th><th>Contact</th><th></th></tr></thead><tbody>" +
      list.map((u) => "<tr>" +
        "<td class='strong'>" + AB.escapeHtml(u.name) + "</td>" +
        "<td>" + AB.escapeHtml(u.title || "—") + "</td>" +
        "<td>" + (u.role === "admin" ? "🏛️ Admin" : "👷 Employé") + "</td>" +
        "<td><span class='muted'>" + AB.escapeHtml(u.email) + "<br>" + AB.escapeHtml(u.phone || "") + "</span></td>" +
        "<td>" + (u.id === session.id ? "<span class='muted'>vous</span>" : "<button class='btn btn--sm' style='background:#fbe9e7;color:#c0392b' data-deluser='" + u.id + "'>🗑</button>") + "</td>" +
        "</tr>").join("") +
      "</tbody></table></div>";
  }

  function renderClients() {
    const clients = AB.getClients();
    $("clientTable").innerHTML = !clients.length
      ? "<div class='empty'><div class='ic'>🧑</div><p>Aucun client inscrit.</p></div>"
      : "<div class='table-wrap'><table class='tbl'><thead><tr>" +
        "<th>Nom</th><th>E-mail</th><th>Téléphone</th><th>Demandes</th><th>Inscrit le</th><th></th></tr></thead><tbody>" +
        clients.map((c) => {
          const n = AB.getRequestsByEmail(c.email).length;
          return "<tr>" +
            "<td class='strong'>" + AB.escapeHtml(c.name) + "</td>" +
            "<td>" + AB.escapeHtml(c.email) + "</td>" +
            "<td>" + AB.escapeHtml(c.phone || "—") + "</td>" +
            "<td>" + n + "</td>" +
            "<td class='muted'>" + AB.formatDate(c.createdAt) + "</td>" +
            "<td><button class='btn btn--sm' style='background:#fbe9e7;color:#c0392b' data-deluser='" + c.id + "'>🗑</button></td>" +
            "</tr>";
        }).join("") +
        "</tbody></table></div>";
  }

  function refreshAll() { refreshKpis(); renderDash(); renderAll(); }
  function onViewChange(view) {
    if (view === "dash") { refreshKpis(); renderDash(); }
    if (view === "requests") renderAll();
    if (view === "employees") renderEmployees();
    if (view === "clients") renderClients();
  }

  refreshAll();
})();
