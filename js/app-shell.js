/* =====================================================================
   ARCHI_BUILDERS — Coquille commune des tableaux de bord
   (navigation, menu mobile, déconnexion, modale, détail des demandes)
   ===================================================================== */
window.SHELL = (function () {
  "use strict";

  const VIEW_TITLES = {
    dash: "Tableau de bord", new: "Nouvelle conception", requests: "Demandes",
    mine: "Mes dossiers", contact: "Contact", employees: "Équipe & comptes",
    clients: "Clients", settings: "Paramètres",
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

  return { initSession, initNav, initMobile, initModal, openModal, closeModal,
           badge, row, amountBlock, filesHtml, briefRows, VIEW_TITLES };
})();
