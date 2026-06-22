/* =====================================================================
   ARCHI_BUILDERS — Accès aux données (Supabase) — fonctions asynchrones
   ===================================================================== */
window.DB = (function () {
  "use strict";
  const sb = SB.client;

  /* ----------  Conversions base de données <-> application  ---------- */
  function rowToProfile(p) {
    return { id: p.id, name: p.name, email: p.email, phone: p.phone,
             title: p.title, role: p.role, department: p.department, createdAt: p.created_at };
  }

  function rowToReport(r) {
    return { id: r.id, authorName: r.author_name, department: r.department,
             title: r.title, period: r.period, content: r.content, createdAt: r.created_at };
  }

  function rowToRequest(r) {
    return {
      id: r.id, clientName: r.client_name, clientEmail: r.client_email, phone: r.phone,
      nature: r.nature, usage: r.usage_type, buildingType: r.building_type, style: r.style,
      levels: r.levels, rooms: r.rooms, bathrooms: r.bathrooms, livings: r.livings,
      diningrooms: r.diningrooms, kitchens: r.kitchens, offices: r.offices, dressings: r.dressings,
      parking: r.parking, storerooms: r.storerooms, extras: r.extras || [], otherRooms: r.other_rooms,
      location: r.location, topography: r.topography, orientation: r.orientation,
      budget: r.budget, deadline: r.deadline,
      terrainSurface: r.terrain_surface, percentage: r.percentage, builtSurface: r.built_surface,
      amount: r.amount, notes: r.notes, files: r.files || [], status: r.status,
      assignedTo: r.assigned_to, createdAt: r.created_at,
    };
  }

  function requestToRow(o, clientId) {
    return {
      client_id: clientId, client_name: o.clientName, client_email: o.clientEmail, phone: o.phone,
      nature: o.nature, usage_type: o.usage, building_type: o.buildingType, style: o.style,
      levels: o.levels, rooms: o.rooms, bathrooms: o.bathrooms, livings: o.livings,
      diningrooms: o.diningrooms, kitchens: o.kitchens, offices: o.offices, dressings: o.dressings,
      parking: o.parking, storerooms: o.storerooms, extras: o.extras || [], other_rooms: o.otherRooms,
      location: o.location, topography: o.topography, orientation: o.orientation,
      budget: o.budget, deadline: o.deadline,
      terrain_surface: o.terrainSurface, percentage: o.percentage, built_surface: o.builtSurface,
      amount: o.amount, notes: o.notes, files: o.files || [],
    };
  }

  /* ----------  Session / profil courant  ---------- */
  let _profileCache = null;

  async function currentUser() {
    const { data } = await sb.auth.getUser();
    return data ? data.user : null;
  }

  async function currentProfile(force) {
    if (_profileCache && !force) return _profileCache;
    const u = await currentUser();
    if (!u) return null;
    const { data, error } = await sb.from("profiles").select("*").eq("id", u.id).single();
    if (error || !data) return null;
    _profileCache = rowToProfile(data);
    return _profileCache;
  }
  function clearCache() { _profileCache = null; }

  /* ----------  Profils (comptes)  ---------- */
  async function getStaff() {
    const { data, error } = await sb.from("profiles").select("*")
      .in("role", ["employe", "admin"]).order("name");
    if (error) return [];
    return data.map(rowToProfile);
  }
  async function getEmployees() {
    // Pour le client : concepteurs à contacter (employés + admins)
    return getStaff();
  }
  async function getClients() {
    const { data, error } = await sb.from("profiles").select("*")
      .eq("role", "client").order("created_at", { ascending: false });
    if (error) return [];
    return data.map(rowToProfile);
  }
  async function getAllProfiles() {
    const { data, error } = await sb.from("profiles").select("*").order("role");
    if (error) return [];
    return data.map(rowToProfile);
  }
  async function updateProfile(id, patch) {
    const { error } = await sb.from("profiles").update(patch).eq("id", id);
    return { ok: !error, error: error && error.message };
  }
  async function setRole(id, role) { return updateProfile(id, { role }); }
  async function deleteProfile(id) {
    const { error } = await sb.from("profiles").delete().eq("id", id);
    return { ok: !error, error: error && error.message };
  }

  /* ----------  Demandes de conception  ---------- */
  // RLS filtre automatiquement : un client ne voit que les siennes,
  // un employé/admin voit toutes les demandes.
  async function getRequests() {
    const { data, error } = await sb.from("requests").select("*")
      .order("created_at", { ascending: false });
    if (error) { console.error(error); return []; }
    return data.map(rowToRequest);
  }
  async function getRequestById(id) {
    const { data, error } = await sb.from("requests").select("*").eq("id", id).single();
    if (error || !data) return null;
    return rowToRequest(data);
  }
  async function addRequest(obj) {
    const u = await currentUser();
    if (!u) return { ok: false, error: "Vous devez être connecté." };
    const row = requestToRow(obj, u.id);
    const { data, error } = await sb.from("requests").insert(row).select().single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, request: rowToRequest(data) };
  }
  async function updateRequest(id, patch) {
    const row = {};
    if ("status" in patch) row.status = patch.status;
    if ("assignedTo" in patch) row.assigned_to = patch.assignedTo;
    const { error } = await sb.from("requests").update(row).eq("id", id);
    return { ok: !error, error: error && error.message };
  }
  async function deleteRequest(id) {
    const { error } = await sb.from("requests").delete().eq("id", id);
    return { ok: !error, error: error && error.message };
  }

  /* ----------  Dépôt et téléchargement des plans  ---------- */
  async function uploadPlan(file, role) {
    const u = await currentUser();
    if (!u) throw new Error("non connecté");
    const safe = file.name.replace(/[^\w.\-]/g, "_");
    const path = u.id + "/" + Date.now() + "_" + safe;
    const { error } = await sb.storage.from("plans").upload(path, file, { upsert: false });
    if (error) throw error;
    return { name: file.name, path: path, size: file.size, type: file.type, role: role || "Plan" };
  }
  async function signedUrl(path) {
    const { data, error } = await sb.storage.from("plans").createSignedUrl(path, 3600);
    if (error || !data) return null;
    return data.signedUrl;
  }

  /* ----------  Rapports  ---------- */
  // RLS : un employé voit ses rapports ; un admin voit tous les rapports.
  async function getReports() {
    const { data, error } = await sb.from("reports").select("*").order("created_at", { ascending: false });
    if (error) { console.error(error); return []; }
    return data.map(rowToReport);
  }
  async function addReport(o) {
    const u = await currentUser();
    if (!u) return { ok: false, error: "Vous devez être connecté." };
    const prof = await currentProfile();
    const row = {
      author_id: u.id, author_name: prof ? prof.name : "", department: prof ? prof.department : null,
      title: o.title, period: o.period, content: o.content,
    };
    const { data, error } = await sb.from("reports").insert(row).select().single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, report: rowToReport(data) };
  }
  async function deleteReport(id) {
    const { error } = await sb.from("reports").delete().eq("id", id);
    return { ok: !error, error: error && error.message };
  }

  return {
    currentUser, currentProfile, clearCache,
    getStaff, getEmployees, getClients, getAllProfiles, updateProfile, setRole, deleteProfile,
    getRequests, getRequestById, addRequest, updateRequest, deleteRequest,
    uploadPlan, signedUrl,
    getReports, addReport, deleteReport,
  };
})();
