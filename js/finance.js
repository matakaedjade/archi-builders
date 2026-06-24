/* =====================================================================
   ARCHI_BUILDERS — Espace Finances (direction + comptable)
   Cumul des montants avancés / restants + enregistrement des avances
   ===================================================================== */
(async function () {
  "use strict";
  const wrap = document.getElementById("financeWrap");
  if (!wrap) return; // page sans espace Finances

  const prof = await DB.currentProfile();
  const canSee = prof && (prof.role === "admin" || (prof.role === "employe" && prof.department === "comptable"));
  if (!canSee) {
    const navLink = document.querySelector('.snav a[data-view="finance"]');
    const section = document.querySelector('section[data-view="finance"]');
    if (navLink) navLink.remove();
    if (section) section.remove();
    return;
  }

  let reqs = [];
  async function load() { reqs = await DB.getRequests(); render(); }

  function render() {
    const total = reqs.reduce((s, r) => s + (r.amount || 0), 0);
    const adv = reqs.reduce((s, r) => s + (r.advance || 0), 0);
    const rem = total - adv;
    let html = "<div class='kpis'>" +
      "<div class='kpi'><div class='ic'>🧾</div><b>" + AB.formatMoney(total) + "</b><span>Total facturé (estimé)</span></div>" +
      "<div class='kpi'><div class='ic'>💰</div><b>" + AB.formatMoney(adv) + "</b><span>Total avancé par les clients</span></div>" +
      "<div class='kpi'><div class='ic'>⏳</div><b>" + AB.formatMoney(rem) + "</b><span>Reste à encaisser (total − avances)</span></div>" +
      "</div>";
    html += "<div class='panel'><div class='panel__head'><div><h2>Paiements par demande</h2><p>Saisissez le montant avancé par chaque client.</p></div></div>";
    if (!reqs.length) {
      html += "<div class='empty'><div class='ic'>🧾</div><p>Aucune demande pour le moment.</p></div></div>";
      wrap.innerHTML = html; return;
    }
    html += "<div class='table-wrap'><table class='tbl'><thead><tr>" +
      "<th>Client</th><th>Projet</th><th>Total</th><th>Avancé</th><th>Restant</th><th></th></tr></thead><tbody>";
    html += reqs.map((r) => {
      const rem2 = Math.max(0, (r.amount || 0) - (r.advance || 0));
      return "<tr>" +
        "<td class='strong'>" + AB.escapeHtml(r.clientName) + "</td>" +
        "<td>" + AB.escapeHtml(r.buildingType) + "</td>" +
        "<td>" + AB.formatMoney(r.amount) + "</td>" +
        "<td><input class='input fin-adv' type='number' min='0' step='1000' value='" + (r.advance || 0) + "' data-req='" + r.id + "' style='max-width:130px;padding:6px 8px;font-size:.82rem'></td>" +
        "<td class='strong' style='color:#c0392b'>" + AB.formatMoney(rem2) + "</td>" +
        "<td><button class='btn btn--gold btn--sm' data-finsave='" + r.id + "'>💾 Enregistrer</button></td>" +
        "</tr>";
    }).join("");
    html += "</tbody></table></div></div>";
    wrap.innerHTML = html;
  }

  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-finsave]");
    if (!b) return;
    const inp = wrap.querySelector(".fin-adv[data-req='" + b.dataset.finsave + "']");
    b.disabled = true; b.textContent = "⏳…";
    await DB.updateRequest(b.dataset.finsave, { advance: inp ? (+inp.value || 0) : 0 });
    await load();
  });

  load();
})();
