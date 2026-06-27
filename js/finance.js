/* =====================================================================
   ARCHI_BUILDERS — Espace Finances (direction + comptable / caissier / DAF)
   - Trésorerie : entrées & sorties de fonds (+ solde)
   - Paiements clients : avances par demande
   ===================================================================== */
(async function () {
  "use strict";
  const wrap = document.getElementById("financeWrap");
  if (!wrap) return; // page sans espace Finances

  const prof = await DB.currentProfile();
  const canSee = prof && (prof.role === "admin" ||
    (prof.role === "employe" && ["comptable", "caissier", "daf"].includes(prof.department)));
  if (!canSee) {
    document.querySelector('.snav a[data-view="finance"]')?.remove();
    document.querySelector('section[data-view="finance"]')?.remove();
    return;
  }

  const esc = AB.escapeHtml;
  const money = AB.formatMoney;
  let reqs = [], txs = [];

  async function load() {
    reqs = await DB.getRequests();
    txs = await DB.getTransactions();
    render();
  }

  function render() {
    // --- Trésorerie ---
    const tin = txs.filter((t) => t.kind === "in").reduce((s, t) => s + (+t.amount || 0), 0);
    const tout = txs.filter((t) => t.kind === "out").reduce((s, t) => s + (+t.amount || 0), 0);
    const solde = tin - tout;
    const today = new Date().toISOString().slice(0, 10);

    let html =
      "<div class='kpis'>" +
      "<div class='kpi'><div class='ic'>📥</div><b style='color:#1e8a4c'>" + money(tin) + "</b><span>Total des entrées</span></div>" +
      "<div class='kpi'><div class='ic'>📤</div><b style='color:#c0392b'>" + money(tout) + "</b><span>Total des sorties</span></div>" +
      "<div class='kpi'><div class='ic'>⚖️</div><b>" + money(solde) + "</b><span>Solde de trésorerie</span></div>" +
      "</div>";

    html += "<div class='panel'><div class='panel__head'><div><h2>Trésorerie — Entrées &amp; Sorties</h2>" +
      "<p>Enregistrez chaque mouvement de fonds de l'entreprise.</p></div></div>";
    html += "<div class='tx-form' style='display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;align-items:end'>" +
      "<div class='field'><label>Type</label><select class='select tx-kind'><option value='in'>📥 Entrée (+)</option><option value='out'>📤 Sortie (−)</option></select></div>" +
      "<div class='field'><label>Montant (FCFA)</label><input class='input tx-amount' type='number' min='0' step='1000' placeholder='0'></div>" +
      "<div class='field'><label>Catégorie</label><input class='input tx-category' placeholder='Acompte, Salaire, Matériaux…'></div>" +
      "<div class='field'><label>Libellé</label><input class='input tx-label' placeholder='Détail du mouvement'></div>" +
      "<div class='field'><label>Mode</label><select class='select tx-method'><option>Espèces</option><option>Virement</option><option>Mobile Money</option><option>Chèque</option></select></div>" +
      "<div class='field'><label>Date</label><input class='input tx-date' type='date' value='" + today + "'></div>" +
      "<button class='btn btn--gold' data-txadd>➕ Enregistrer</button>" +
      "</div><div class='alert alert--err' id='txErr'></div>";

    if (!txs.length) {
      html += "<div class='empty'><div class='ic'>💵</div><p>Aucun mouvement enregistré pour le moment.</p></div>";
    } else {
      html += "<div class='table-wrap' style='margin-top:12px'><table class='tbl'><thead><tr>" +
        "<th>Date</th><th>Type</th><th>Catégorie</th><th>Libellé</th><th>Mode</th><th>Montant</th><th>Saisi par</th><th></th></tr></thead><tbody>";
      html += txs.map((t) => {
        const inn = t.kind === "in";
        return "<tr>" +
          "<td class='muted'>" + AB.formatDate(t.occurredOn || t.createdAt) + "</td>" +
          "<td>" + (inn ? "<span class='badge badge--done'>Entrée</span>" : "<span class='badge badge--rejected'>Sortie</span>") + "</td>" +
          "<td>" + esc(t.category || "—") + "</td>" +
          "<td>" + esc(t.label || "—") + "</td>" +
          "<td class='muted'>" + esc(t.method || "—") + "</td>" +
          "<td class='strong' style='color:" + (inn ? "#1e8a4c" : "#c0392b") + "'>" + (inn ? "+" : "−") + " " + money(t.amount) + "</td>" +
          "<td class='muted'>" + esc(t.authorName || "—") + "</td>" +
          "<td><button class='btn btn--sm' style='background:#fbe9e7;color:#c0392b' data-txdel='" + t.id + "'>🗑</button></td>" +
          "</tr>";
      }).join("");
      html += "</tbody></table></div>";
    }
    html += "</div>";

    // --- Paiements clients (avances par demande) ---
    const total = reqs.reduce((s, r) => s + (r.amount || 0), 0);
    const adv = reqs.reduce((s, r) => s + (r.advance || 0), 0);
    const rem = total - adv;
    html += "<div class='kpis'>" +
      "<div class='kpi'><div class='ic'>🧾</div><b>" + money(total) + "</b><span>Total facturé (estimé)</span></div>" +
      "<div class='kpi'><div class='ic'>💰</div><b>" + money(adv) + "</b><span>Total avancé par les clients</span></div>" +
      "<div class='kpi'><div class='ic'>⏳</div><b>" + money(rem) + "</b><span>Reste à encaisser</span></div>" +
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
        "<td class='strong'>" + esc(r.clientName) + "</td>" +
        "<td>" + esc(r.buildingType) + "</td>" +
        "<td>" + money(r.amount) + "</td>" +
        "<td><input class='input fin-adv' type='number' min='0' step='1000' value='" + (r.advance || 0) + "' data-req='" + r.id + "' style='max-width:130px;padding:6px 8px;font-size:.82rem'></td>" +
        "<td class='strong' style='color:#c0392b'>" + money(rem2) + "</td>" +
        "<td><button class='btn btn--gold btn--sm' data-finsave='" + r.id + "'>💾 Enregistrer</button></td>" +
        "</tr>";
    }).join("");
    html += "</tbody></table></div></div>";
    wrap.innerHTML = html;
  }

  document.addEventListener("click", async (e) => {
    // Ajouter un mouvement de trésorerie
    const add = e.target.closest("[data-txadd]");
    if (add) {
      const form = add.closest(".tx-form");
      const err = document.getElementById("txErr");
      err.classList.remove("show");
      const amount = +form.querySelector(".tx-amount").value || 0;
      if (amount <= 0) { err.textContent = "Indiquez un montant supérieur à 0."; err.classList.add("show"); return; }
      add.disabled = true; add.textContent = "⏳…";
      const res = await DB.addTransaction({
        kind: form.querySelector(".tx-kind").value,
        amount: amount,
        category: form.querySelector(".tx-category").value.trim(),
        label: form.querySelector(".tx-label").value.trim(),
        method: form.querySelector(".tx-method").value,
        occurredOn: form.querySelector(".tx-date").value || null,
      });
      if (!res.ok) { add.disabled = false; add.textContent = "➕ Enregistrer"; err.textContent = "Erreur : " + (res.error || ""); err.classList.add("show"); return; }
      await load();
      return;
    }
    // Supprimer un mouvement
    const del = e.target.closest("[data-txdel]");
    if (del) {
      if (confirm("Supprimer ce mouvement de trésorerie ?")) { await DB.deleteTransaction(del.dataset.txdel); await load(); }
      return;
    }
    // Enregistrer une avance client
    const sav = e.target.closest("[data-finsave]");
    if (sav) {
      const inp = wrap.querySelector(".fin-adv[data-req='" + sav.dataset.finsave + "']");
      sav.disabled = true; sav.textContent = "⏳…";
      await DB.updateRequest(sav.dataset.finsave, { advance: inp ? (+inp.value || 0) : 0 });
      await load();
      return;
    }
  });

  load();
})();
