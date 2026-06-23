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

  /* ----------  Formules de prestation (tarif au m²)  ---------- */
  const FORMULES = {
    plans2d: { label: "Plans 2D uniquement", rate: 250 },
    plans3d: { label: "Plans 2D + images 3D extérieures", rate: 500 },
    video:   { label: "Plans + 3D + vidéo d'animation", rate: 750 },
    complet: { label: "Pack complet + permis de construire", rate: 1500 },
  };

  // montant = surface au sol × nombre de niveaux × tarif (selon la formule)
  function computeQuote(terrainSurface, percentage, rate, levels) {
    const t = Math.max(0, Number(terrainSurface) || 0);
    const p = Math.max(0, Number(percentage) || 0);
    const lv = Math.max(1, Number(levels) || 1);
    const r = Number(rate) || PRICE_PER_SQM;
    const footprint = t * (p / 100);          // emprise au sol
    const builtSurface = footprint * lv;       // surface totale à concevoir
    const amount = builtSurface * r;
    return { footprint, builtSurface, levels: lv, amount, pricePerSqm: r };
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
    communication: "Chargé(e) de communication",
    pdg: "Président Directeur Général (PDG)",
    dg: "Directeur Général (DG)",
    dga: "Directeur Général Adjoint (DGA)",
    dt: "Directeur Technique (DT)",
    daf: "Directeur Administratif & Financier (DAF)",
    drh: "Directeur des Ressources Humaines (DRH)",
    dco: "Directeur Commercial & Marketing",
    dop: "Directeur des Opérations / Travaux",
    direction: "Direction",
  };
  const EMPLOYEE_DEPTS = ["architecte", "ingenieur", "technicien", "dessinateur", "chef_chantier",
    "conducteur", "metreur", "comptable", "caissier", "juriste", "rh", "commercial", "communication",
    "secretaire", "magasinier", "logistique", "chauffeur", "entretien", "securite"];
  const ADMIN_DEPTS = ["pdg", "dg", "dga", "dt", "daf", "drh", "dco", "dop", "direction"];
  const CONCEPTION_DEPTS = ["architecte", "ingenieur", "technicien", "dessinateur", "metreur"];
  const deptLabel = (d) => DEPARTMENTS[d] || (d || "—");

  return { PRICE_PER_SQM, CURRENCY, STATUS, FORMULES,
           DEPARTMENTS, EMPLOYEE_DEPTS, ADMIN_DEPTS, CONCEPTION_DEPTS, deptLabel,
           formatMoney, formatNumber, formatDate, escapeHtml, computeQuote };
})();
