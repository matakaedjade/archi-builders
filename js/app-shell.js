/* =====================================================================
   ARCHI_BUILDERS — Coquille commune des tableaux de bord
   (navigation, menu mobile, déconnexion, modale, détail des demandes)
   ===================================================================== */
window.SHELL = (function () {
  "use strict";

  const VIEW_TITLES = {
    dash: "Tableau de bord", new: "Nouvelle conception", requests: "Demandes",
    mine: "Mes dossiers", projets: "Projets réalisés", contact: "Contact",
    colleagues: "Collègues", supervision: "Supervision", reports: "Rapports",
    evaluations: "Mes évaluations", org: "Organigramme",
    employees: "Équipe & comptes", clients: "Clients", settings: "Paramètres",
  };

  async function initSession(role) {
    const s = await AUTH.requireRole(role);
    if (!s) return null;
    const nameEl = document.getElementById("whoName");
    const avEl = document.getElementById("whoAvatar");
    if (nameEl) nameEl.textContent = s.name || s.email;
    if (avEl) avEl.textContent = (s.name || s.email || "?").charAt(0).toUpperCase();
    const logout = document.getElementById("logoutBtn");
    if (logout) logout.addEventListener("click", function () { AUTH.logout(); });
    return s;
  }

  function initNav(onChange) {
    const snav = document.getElementById("snav");
    const pageTitle = document.getElementById("pageTitle");
    const sections = document.querySelectorAll("section[data-view]");

    function show(view) {
      sections.forEach((sec) => sec.classList.toggle("hidden", sec.dataset.view !== view));
      snav.querySelectorAll("a[data-view]").forEach((a) =>
        a.classList.toggle("active", a.dataset.view === view));
      if (pageTitle && VIEW_TITLES[view]) pageTitle.textContent = VIEW_TITLES[view];
      closeSidebar();
      if (typeof onChange === "function") onChange(view);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    snav.addEventListener("click", (e) => {
      const a = e.target.closest("a[data-view]");
      if (!a) return;
      e.preventDefault();
      show(a.dataset.view);
    });
    document.addEventListener("click", (e) => {
      const g = e.target.closest("[data-goto]");
      if (g) { e.preventDefault(); show(g.dataset.goto); }
    });
    return { show };
  }

  const sidebar = () => document.getElementById("sidebar");
  const backdrop = () => document.getElementById("backdrop");
  function openSidebar() { sidebar()?.classList.add("open"); backdrop()?.classList.add("show"); }
  function closeSidebar() { sidebar()?.classList.remove("open"); backdrop()?.classList.remove("show"); }
  function initMobile() {
    document.getElementById("burgerApp")?.addEventListener("click", openSidebar);
    document.getElementById("backdrop")?.addEventListener("click", closeSidebar);
  }

  function openModal(title, html) {
    const modal = document.getElementById("modal");
    if (!modal) return;
    document.getElementById("mTitle").textContent = title;
    document.getElementById("mBody").innerHTML = html;
    modal.classList.add("open");
  }
  function closeModal() { document.getElementById("modal")?.classList.remove("open"); }
  function initModal() {
    const modal = document.getElementById("modal");
    if (modal) {
      document.getElementById("mClose")?.addEventListener("click", closeModal);
      modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
    }
    // Téléchargement sécurisé d'un plan (lien signé à la demande)
    document.addEventListener("click", async (e) => {
      const a = e.target.closest("[data-plan]");
      if (!a) return;
      e.preventDefault();
      a.textContent = "⏳ ouverture…";
      const url = await DB.signedUrl(a.dataset.plan);
      a.textContent = a.dataset.name || "Plan";
      if (url) window.open(url, "_blank");
      else alert("Impossible d'ouvrir ce fichier.");
    });
  }

  function badge(status) {
    const s = AB.STATUS[status] || AB.STATUS.new;
    return '<span class="badge ' + s.cls + '">' + s.label + "</span>";
  }
  function row(k, v) { return '<div class="detail-row"><span>' + k + "</span><b>" + v + "</b></div>"; }
  function amountBlock(amount) {
    return '<div class="detail-amount"><small>MONTANT DE LA CONCEPTION</small><div class="amount">' +
      AB.formatMoney(amount) + "</div></div>";
  }

  function filesHtml(r) {
    if (!r.files || !r.files.length) return "<span class='muted'>Aucun plan joint.</span>";
    return r.files.map(function (f) {
      const role = AB.escapeHtml(f.role || "Fichier");
      const name = AB.escapeHtml(f.name || "plan");
      if (f.path) {
        return "<span class='file-pill'>📎 " + role + " : <a href='#' class='plan-link' data-plan='" +
          AB.escapeHtml(f.path) + "' data-name='" + name + "'>" + name + "</a></span>";
      }
      return "<span class='file-pill'>📎 " + role + " : " + name + " <span class='muted'>(non joint)</span></span>";
    }).join("");
  }

  function briefRows(r) {
    const prog = [];
    const add = (n, w) => { if (n) prog.push(n + " " + w); };
    add(r.rooms, "chambre(s)"); add(r.bathrooms, "SDB / douche(s)"); add(r.livings, "salon(s)");
    add(r.diningrooms, "salle(s) à manger"); add(r.kitchens, "cuisine(s)"); add(r.offices, "bureau(x)");
    add(r.dressings, "dressing(s)"); add(r.parking, "parking(s)"); add(r.storerooms, "magasin(s)");

    let html = "";
    html += row("Nature du projet", AB.escapeHtml(r.nature || "—"));
    if (r.usage) html += row("Usage prévu", AB.escapeHtml(r.usage));
    html += row("Type de bâtiment", AB.escapeHtml(r.buildingType || "—"));
    html += row("Style de conception", AB.escapeHtml(r.style || "—"));
    html += row("Niveaux", (r.levels || 1) + " niveau(x)");
    html += row("Programme", prog.length ? prog.join(" · ") : "—");
    if (r.extras && r.extras.length) html += row("Équipements", AB.escapeHtml(r.extras.join(", ")));
    if (r.otherRooms) html += row("Autres locaux", AB.escapeHtml(r.otherRooms));
    html += row("Surface du terrain", AB.formatNumber(r.terrainSurface) + " m²");
    html += row("Emprise au sol", (r.percentage || 0) + " %");
    html += row("Surface à concevoir", AB.formatNumber(r.builtSurface) + " m²");
    if (r.location) html += row("Localisation", AB.escapeHtml(r.location));
    if (r.topography) html += row("Topographie", AB.escapeHtml(r.topography));
    if (r.orientation) html += row("Orientation", AB.escapeHtml(r.orientation));
    if (r.budget) html += row("Budget estimé", AB.escapeHtml(r.budget));
    if (r.deadline) html += row("Délai souhaité", AB.escapeHtml(r.deadline));
    if (r.notes) html += "<div style='margin-top:12px'><b>Précisions :</b><br>" + AB.escapeHtml(r.notes) + "</div>";
    html += "<div style='margin-top:14px'><b>Plans déposés :</b><br>" + filesHtml(r) + "</div>";
    return html;
  }

  /* ----------  Note compacte en étoiles (organigramme)  ---------- */
  function compactStars(scores) {
    if (!scores || !scores.length) return "";
    const s5 = (scores.reduce((a, b) => a + (b || 0), 0) / scores.length) / 2;
    const full = Math.round(s5);
    let st = ""; for (let i = 1; i <= 5; i++) st += (i <= full ? "★" : "☆");
    return "<small style='color:#d4a017;letter-spacing:1px;display:block;margin-top:3px'>" + st + " " + s5.toFixed(1) + "/5</small>";
  }

  /* ----------  Organigramme de l'entreprise  ---------- */
  // scoresByEmp (optionnel) : { id_employé: [notes/10] } → affiche les étoiles
  function orgChartHtml(staff, scoresByEmp) {
    if (!staff || !staff.length)
      return "<div class='empty'><div class='ic'>🏛️</div><p>L'organigramme s'affichera dès que des membres auront un métier attribué.</p></div>";
    const sc = scoresByEmp || {};
    const byDept = {};
    staff.forEach((p) => { const d = p.department || "autre"; (byDept[d] = byDept[d] || []).push(p); });
    const card = (p) =>
      "<div class='org-card'><b>" + AB.escapeHtml(p.name || "—") + "</b>" +
      "<span>" + AB.escapeHtml(p.department ? AB.deptLabel(p.department) : (p.role === "admin" ? "Direction" : "Employé")) + "</span>" +
      (p.phone ? "<small>" + AB.escapeHtml(p.phone) + "</small>" : "") +
      compactStars(sc[p.id]) + "</div>";

    // Direction triée du plus haut grade au plus bas (organigramme hiérarchique)
    const rankOrder = ["pdg", "dg", "dga", "dt", "daf", "drh", "dco", "dop", "direction"];
    const rk = (d) => { const i = rankOrder.indexOf(d || "direction"); return i < 0 ? 99 : i; };
    const direction = staff.filter((p) => p.role === "admin").sort((a, b) => rk(a.department) - rk(b.department));
    let html = "<div class='org'>";
    html += "<div class='org-level org-top'>" +
      (direction.length ? direction.map(card).join("") : "<div class='org-card'><b>Direction</b><span>Direction Générale</span></div>") +
      "</div><div class='org-connector'></div>";

    const depts = AB.EMPLOYEE_DEPTS.filter((d) => byDept[d]).concat(byDept["autre"] ? ["autre"] : []);
    html += "<div class='org-depts'>";
    html += depts.map((d) =>
      "<div class='org-dept'><div class='org-dept__head'>" + (d === "autre" ? "Autres" : AB.deptLabel(d)) + "</div>" +
      byDept[d].map(card).join("") + "</div>").join("");
    html += "</div></div>";
    return html;
  }

  /* ----------  Téléchargement / impression du détail d'une demande  ---------- */
  function printRequest(r) {
    const esc = AB.escapeHtml;
    const prog = [];
    const add = (n, w) => { if (n) prog.push(n + " " + w); };
    add(r.rooms, "chambre(s)"); add(r.bathrooms, "SDB"); add(r.livings, "salon(s)");
    add(r.diningrooms, "salle(s) à manger"); add(r.kitchens, "cuisine(s)"); add(r.offices, "bureau(x)");
    add(r.dressings, "dressing(s)"); add(r.parking, "parking(s)"); add(r.storerooms, "magasin(s)");
    const line = (k, v) => "<tr><td class='k'>" + k + "</td><td class='v'>" + (v || "—") + "</td></tr>";
    const win = window.open("", "_blank");
    if (!win) { alert("Autorisez les fenêtres pop-up pour télécharger le détail."); return; }
    win.document.write(
      "<!DOCTYPE html><html lang='fr'><head><meta charset='utf-8'><title>Demande — " + esc(r.clientName || "") + "</title>" +
      "<style>" +
      "body{font-family:Arial,Helvetica,sans-serif;color:#16201b;max-width:720px;margin:24px auto;padding:0 20px}" +
      "h1{color:#1b5e3b;margin:0} .brand{font-size:26px;font-weight:800;letter-spacing:1px}" +
      ".brand .g{color:#d4a017} .sub{color:#666;margin:2px 0 18px;border-bottom:2px solid #d4a017;padding-bottom:12px}" +
      "table{width:100%;border-collapse:collapse;margin-top:10px} td{padding:7px 10px;border-bottom:1px solid #eee;vertical-align:top}" +
      ".k{color:#666;width:42%} .v{font-weight:600}" +
      ".amt{margin-top:18px;background:#e7f0ea;border-radius:10px;padding:16px;text-align:center}" +
      ".amt b{font-size:24px;color:#1b5e3b} .foot{margin-top:24px;color:#888;font-size:12px;text-align:center}" +
      "@media print{.noprint{display:none}}" +
      "</style></head><body>" +
      "<div class='brand'>ARCHI<span class='g'>_BUILDERS</span></div>" +
      "<div class='sub'>Architecture &bull; BTP — Détail de la demande de conception</div>" +
      "<h1 style='font-size:18px'>" + esc(r.buildingType || "Projet") + "</h1>" +
      "<table>" +
      line("Client", esc(r.clientName)) +
      line("Contact", esc((r.phone || "—") + " · " + (r.clientEmail || ""))) +
      line("Statut", (AB.STATUS[r.status] || AB.STATUS.new).label) +
      line("Nature du projet", esc(r.nature)) +
      line("Usage prévu", esc(r.usage)) +
      line("Type de bâtiment", esc(r.buildingType)) +
      line("Style", esc(r.style)) +
      line("Niveaux", (r.levels || 1) + " niveau(x)") +
      line("Programme", prog.length ? prog.join(" · ") : "—") +
      line("Équipements", (r.extras && r.extras.length) ? esc(r.extras.join(", ")) : "—") +
      line("Autres locaux", esc(r.otherRooms)) +
      line("Surface du terrain", AB.formatNumber(r.terrainSurface) + " m²") +
      line("Emprise au sol", (r.percentage || 0) + " %") +
      line("Surface à concevoir", AB.formatNumber(r.builtSurface) + " m²") +
      line("Localisation", esc(r.location)) +
      line("Topographie", esc(r.topography)) +
      line("Orientation", esc(r.orientation)) +
      line("Budget estimé", esc(r.budget)) +
      line("Délai souhaité", esc(r.deadline)) +
      line("Affecté à", esc(r.assignedTo)) +
      line("Date", AB.formatDate(r.createdAt)) +
      (r.notes ? line("Précisions", esc(r.notes).replace(/\n/g, "<br>")) : "") +
      "</table>" +
      "<div class='amt'><div>MONTANT DE LA CONCEPTION</div><b>" + AB.formatMoney(r.amount) + "</b></div>" +
      "<div class='foot'>ARCHI_BUILDERS — Lomé, Togo · +228 91 08 92 94 · archi-builders@gmail.com</div>" +
      "<div class='noprint' style='text-align:center;margin-top:20px'><button onclick='window.print()' style='padding:10px 20px;font-size:15px;cursor:pointer'>🖨️ Imprimer / Enregistrer en PDF</button></div>" +
      "</body></html>");
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 350);
  }

  /* ----------  Note globale en étoiles (à partir de scores /10)  ---------- */
  function starsHtml(scores) {
    if (!scores || !scores.length) return "<span class='muted'>Pas encore noté</span>";
    const avg10 = scores.reduce((a, b) => a + (b || 0), 0) / scores.length;
    const s5 = avg10 / 2;                 // échelle 0 à 5
    const full = Math.round(s5);
    let st = "";
    for (let i = 1; i <= 5; i++) st += (i <= full ? "★" : "☆");
    return "<span style='color:#d4a017;letter-spacing:2px;font-size:1.05rem'>" + st + "</span> " +
      "<span class='muted'>(" + s5.toFixed(1) + "/5 · moy. " + avg10.toFixed(1) + "/10 sur " + scores.length + " projet(s))</span>";
  }

  return { initSession, initNav, initMobile, initModal, openModal, closeModal,
           badge, row, amountBlock, filesHtml, briefRows, orgChartHtml, printRequest, starsHtml, VIEW_TITLES };
})();
