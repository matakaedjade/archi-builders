/* =====================================================================
   ARCHI_BUILDERS — Utilitaires communs (formatage, calcul, statuts)
   (les comptes et les demandes sont gérés par db.js via Supabase)
   ===================================================================== */
window.AB = (function () {
  "use strict";

  const PRICE_PER_SQM = 1500;        // Prix de conception au m²
  const CURRENCY = "FCFA";

  const formatMoney = (n) =>
    (Math.round(n) || 0).toLocaleString("fr-FR").replace(/ /g, " ") + " " + CURRENCY;

  const formatNumber = (n) => (Math.round(n) || 0).toLocaleString("fr-FR").replace(/ /g, " ");

  const formatDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  };

  const escapeHtml = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function computeQuote(terrainSurface, percentage) {
    const t = Math.max(0, Number(terrainSurface) || 0);
    const p = Math.max(0, Number(percentage) || 0);
    const builtSurface = t * (p / 100);
    const amount = builtSurface * PRICE_PER_SQM;
    return { builtSurface, amount, pricePerSqm: PRICE_PER_SQM };
  }

  const STATUS = {
    new:      { label: "Nouvelle", cls: "badge--new" },
    progress: { label: "En cours", cls: "badge--progress" },
    done:     { label: "Terminée", cls: "badge--done" },
    rejected: { label: "Refusée",  cls: "badge--rejected" },
  };

  /* ----------  Métiers / postes  ---------- */
  const DEPARTMENTS = {
    architecte: "Architecte",
    ingenieur: "Ingénieur",
    technicien: "Technicien",
    dessinateur: "Dessinateur-projeteur",
    chef_chantier: "Chef de chantier",
    conducteur: "Conducteur de travaux",
    metreur: "Métreur",
    comptable: "Comptable",
    caissier: "Caissier / Caissière",
    juriste: "Juriste",
    rh: "Ressources humaines",
    commercial: "Commercial",
    secretaire: "Secrétaire",
    magasinier: "Magasinier",
    logistique: "Logistique / Approvisionnement",
    chauffeur: "Chauffeur",
    entretien: "Agent d'entretien",
    securite: "Agent de sécurité",
    dg: "Directeur Général",
    dt: "Directeur Technique",
    direction: "Direction",
  };
  const EMPLOYEE_DEPTS = ["architecte", "ingenieur", "technicien", "dessinateur", "chef_chantier",
    "conducteur", "metreur", "comptable", "caissier", "juriste", "rh", "commercial",
    "secretaire", "magasinier", "logistique", "chauffeur", "entretien", "securite"];
  const ADMIN_DEPTS = ["dg", "dt", "direction"];
  const CONCEPTION_DEPTS = ["architecte", "ingenieur", "technicien", "dessinateur", "metreur"];
  const deptLabel = (d) => DEPARTMENTS[d] || (d || "—");

  return { PRICE_PER_SQM, CURRENCY, STATUS,
           DEPARTMENTS, EMPLOYEE_DEPTS, ADMIN_DEPTS, CONCEPTION_DEPTS, deptLabel,
           formatMoney, formatNumber, formatDate, escapeHtml, computeQuote };
})();
