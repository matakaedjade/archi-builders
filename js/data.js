/* =====================================================================
   ARCHI_BUILDERS — Couche de données (stockage local du navigateur)
   ---------------------------------------------------------------------
   Toutes les données (comptes, demandes de conception) sont enregistrées
   dans le navigateur via localStorage. Aucune installation n'est requise.
   Pour une mise en ligne multi-utilisateurs, ces fonctions pourront être
   reliées plus tard à une vraie base de données.
   ===================================================================== */

window.AB = (function () {
  "use strict";

  /* ----------  Paramètres métier  ---------- */
  const PRICE_PER_SQM = 1500;          // Prix de conception au m²
  const CURRENCY = "FCFA";

  /* ----------  Clés de stockage  ---------- */
  const K_USERS = "ab_users";
  const K_REQUESTS = "ab_requests";
  const K_SESSION = "ab_session";
  const K_SEED = "ab_seeded_v3";

  /* ----------  Utilitaires  ---------- */
  const read = (k, def) => {
    try { return JSON.parse(localStorage.getItem(k)) ?? def; }
    catch (e) { return def; }
  };
  const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const uid = (p = "") => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  const formatMoney = (n) =>
    (Math.round(n) || 0).toLocaleString("fr-FR").replace(/ /g, " ") + " " + CURRENCY;

  const formatNumber = (n) => (Math.round(n) || 0).toLocaleString("fr-FR").replace(/ /g, " ");

  const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  };

  const escapeHtml = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ----------  Initialisation des données de démonstration  ---------- */
  function seed() {
    if (localStorage.getItem(K_SEED)) return;

    const users = [
      { id: uid("u_"), name: "Administrateur", email: "admin@archibuilders.com", phone: "+228 91 08 92 94", password: "admin123", role: "admin", createdAt: new Date().toISOString() },
      { id: uid("u_"), name: "Arch. Koffi Mensah", email: "architecte@archibuilders.com", phone: "+228 91 08 92 94", password: "archi123", role: "employe", title: "Architecte principal — Conception & projets", createdAt: new Date().toISOString() },
      { id: uid("u_"), name: "Ing. Awa Diallo", email: "ingenieur@archibuilders.com", phone: "+228 92 69 61 85", password: "ing123", role: "employe", title: "Ingénieur BTP — Suivi de chantier", createdAt: new Date().toISOString() },
      { id: uid("u_"), name: "Client Démo", email: "client@demo.com", phone: "+228 90 00 00 00", password: "client123", role: "client", createdAt: new Date().toISOString() },
    ];
    write(K_USERS, users);

    const now = Date.now();
    const day = 86400000;
    const reqs = [
      {
        id: uid("r_"), clientName: "Client Démo", clientEmail: "client@demo.com", phone: "+228 90 00 00 00",
        nature: "Nouvelle construction", usage: "Habitation principale",
        buildingType: "Villa", style: "Moderne", levels: 2,
        rooms: 4, bathrooms: 3, livings: 1, diningrooms: 1, kitchens: 1, offices: 1, dressings: 1, parking: 2, storerooms: 0,
        extras: ["Piscine", "Terrasse", "Jardin"], otherRooms: "",
        location: "Agoè, Lomé", topography: "Légère pente", orientation: "Sud",
        budget: "25 – 50 M FCFA", deadline: "Dans 1 à 3 mois",
        terrainSurface: 500, percentage: 60, builtSurface: 300, amount: 300 * PRICE_PER_SQM,
        notes: "Terrain en pente légère, souhaite une grande terrasse.",
        files: [], status: "progress", assignedTo: "Arch. Koffi Mensah",
        createdAt: new Date(now - 5 * day).toISOString(),
      },
      {
        id: uid("r_"), clientName: "Société IMMOPLUS", clientEmail: "contact@immoplus.tg", phone: "+228 22 22 00 11",
        nature: "Nouvelle construction", usage: "Usage mixte (habitation + commerce)",
        buildingType: "Immeuble (R+1 à R+10)", style: "Contemporain", levels: 6,
        rooms: 12, bathrooms: 12, livings: 6, diningrooms: 6, kitchens: 6, offices: 2, dressings: 0, parking: 8, storerooms: 2,
        extras: ["Ascenseur", "Boutique / Local commercial", "Panneaux solaires"], otherRooms: "Local technique + groupe électrogène",
        location: "Centre-ville, Lomé", topography: "Plat", orientation: "À conseiller par l'architecte",
        budget: "Plus de 100 M FCFA", deadline: "Dès que possible",
        terrainSurface: 800, percentage: 80, builtSurface: 640, amount: 640 * PRICE_PER_SQM,
        notes: "Immeuble de standing avec commerces au rez-de-chaussée.",
        files: [], status: "new", assignedTo: "",
        createdAt: new Date(now - 1 * day).toISOString(),
      },
      {
        id: uid("r_"), clientName: "M. Traoré", clientEmail: "traore@email.com", phone: "+228 90 88 99 00",
        nature: "Rénovation", usage: "Habitation principale",
        buildingType: "Villa", style: "Minimaliste", levels: 1,
        rooms: 3, bathrooms: 2, livings: 1, diningrooms: 1, kitchens: 1, offices: 0, dressings: 0, parking: 1, storerooms: 0,
        extras: ["Terrasse"], otherRooms: "",
        location: "Bè, Lomé", topography: "Plat", orientation: "Est",
        budget: "10 – 25 M FCFA", deadline: "Simple estimation pour le moment",
        terrainSurface: 300, percentage: 40, builtSurface: 120, amount: 120 * PRICE_PER_SQM,
        notes: "Budget maîtrisé, priorité au plan fonctionnel.",
        files: [], status: "done", assignedTo: "Arch. Koffi Mensah",
        createdAt: new Date(now - 12 * day).toISOString(),
      },
    ];
    write(K_REQUESTS, reqs);
    localStorage.setItem(K_SEED, "1");
  }

  /* ----------  Comptes utilisateurs  ---------- */
  const getUsers = () => read(K_USERS, []);
  const findUserByEmail = (email) =>
    getUsers().find((u) => u.email.toLowerCase() === String(email).toLowerCase());

  function addUser(u) {
    const users = getUsers();
    if (findUserByEmail(u.email)) return { ok: false, error: "Un compte existe déjà avec cet e-mail." };
    const user = { id: uid("u_"), createdAt: new Date().toISOString(), ...u };
    users.push(user);
    write(K_USERS, users);
    return { ok: true, user };
  }

  function updateUser(id, patch) {
    const users = getUsers();
    const i = users.findIndex((u) => u.id === id);
    if (i < 0) return { ok: false };
    users[i] = { ...users[i], ...patch };
    write(K_USERS, users);
    return { ok: true, user: users[i] };
  }

  function deleteUser(id) {
    write(K_USERS, getUsers().filter((u) => u.id !== id));
  }

  const getEmployees = () => getUsers().filter((u) => u.role === "employe");
  const getClients = () => getUsers().filter((u) => u.role === "client");

  /* ----------  Demandes de conception  ---------- */
  const getRequests = () => read(K_REQUESTS, []);

  function addRequest(r) {
    const list = getRequests();
    const req = {
      id: uid("r_"),
      status: "new",
      assignedTo: "",
      files: [],
      createdAt: new Date().toISOString(),
      ...r,
    };
    list.unshift(req);
    try {
      write(K_REQUESTS, list);
      return { ok: true, request: req };
    } catch (e) {
      // Quota dépassé : on réessaie sans les fichiers volumineux
      req.files = (req.files || []).map((f) => ({ name: f.name, size: f.size, data: null }));
      try { write(K_REQUESTS, list); return { ok: true, request: req, warning: "files-dropped" }; }
      catch (e2) { return { ok: false, error: "Stockage du navigateur plein. Réduisez la taille des plans." }; }
    }
  }

  function updateRequest(id, patch) {
    const list = getRequests();
    const i = list.findIndex((r) => r.id === id);
    if (i < 0) return { ok: false };
    list[i] = { ...list[i], ...patch };
    write(K_REQUESTS, list);
    return { ok: true, request: list[i] };
  }

  function deleteRequest(id) {
    write(K_REQUESTS, getRequests().filter((r) => r.id !== id));
  }

  const getRequestsByEmail = (email) =>
    getRequests().filter((r) => (r.clientEmail || "").toLowerCase() === String(email).toLowerCase());

  /* ----------  Calcul du montant de conception  ---------- */
  function computeQuote(terrainSurface, percentage) {
    const t = Math.max(0, Number(terrainSurface) || 0);
    const p = Math.max(0, Number(percentage) || 0);
    const builtSurface = t * (p / 100);
    const amount = builtSurface * PRICE_PER_SQM;
    return { builtSurface, amount, pricePerSqm: PRICE_PER_SQM };
  }

  const STATUS = {
    new:       { label: "Nouvelle",    cls: "badge--new" },
    progress:  { label: "En cours",    cls: "badge--progress" },
    done:      { label: "Terminée",    cls: "badge--done" },
    rejected:  { label: "Refusée",     cls: "badge--rejected" },
  };

  /* ----------  API publique  ---------- */
  seed();
  return {
    PRICE_PER_SQM, CURRENCY, STATUS,
    formatMoney, formatNumber, formatDate, escapeHtml, uid,
    getUsers, findUserByEmail, addUser, updateUser, deleteUser, getEmployees, getClients,
    getRequests, addRequest, updateRequest, deleteRequest, getRequestsByEmail,
    computeQuote,
    _keys: { K_USERS, K_REQUESTS, K_SESSION },
  };
})();
