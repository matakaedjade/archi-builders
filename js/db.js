/* =====================================================================
   ARCHI_BUILDERS — Accès aux données (Supabase) — fonctions asynchrones
   ===================================================================== */
window.DB = (function () {
  "use strict";
  const sb = SB.client;

  /* ----------  Conversions base de données <-> application  ---------- */
  function rowToProfile(p) {
    return { id: p.id, name: p.name, email: p.email, phone: p.phone,
             title: p.title, role: p.role, department: p.department,
             photo: p.photo || null, lastSeen: p.last_seen || null, presenceOn: p.presence_on,
             createdAt: p.created_at };
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
      amount: r.amount, advance: r.advance || 0, notes: r.notes, files: r.files || [], status: r.status,
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
    if ("advance" in patch) row.advance = patch.advance;
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

  /* ----------  Notes / évaluations des employés  ---------- */
  function rowToRating(r) {
    return { id: r.id, employeeId: r.employee_id, employeeName: r.employee_name,
             requestId: r.request_id, projectLabel: r.project_label, score: r.score,
             comment: r.comment, ratedBy: r.rated_by, createdAt: r.created_at };
  }
  // RLS : un employé voit ses notes ; la direction voit toutes les notes.
  async function getRatings() {
    const { data, error } = await sb.from("ratings").select("*").order("created_at", { ascending: false });
    if (error) { console.error(error); return []; }
    return data.map(rowToRating);
  }
  async function rateEmployee(o) {
    const prof = await currentProfile();
    const row = {
      employee_id: o.employeeId, employee_name: o.employeeName, request_id: o.requestId,
      project_label: o.projectLabel, score: o.score, comment: o.comment || null,
      rated_by: prof ? prof.name : "",
    };
    const { error } = await sb.from("ratings").upsert(row, { onConflict: "employee_id,request_id" });
    return { ok: !error, error: error && error.message };
  }

  /* ----------  Médias du site (galerie publique)  ---------- */
  function rowToMedia(m) {
    return { id: m.id, kind: m.kind, url: m.url, storagePath: m.storage_path,
             title: m.title, category: m.category, sortOrder: m.sort_order, createdAt: m.created_at };
  }
  async function getSiteMedia() {
    const { data, error } = await sb.from("site_media").select("*")
      .order("sort_order", { ascending: true }).order("created_at", { ascending: true });
    if (error) { console.error(error); return []; }
    return data.map(rowToMedia);
  }
  async function uploadMedia(file) {
    const safe = file.name.replace(/[^\w.\-]/g, "_");
    const path = "site/" + Date.now() + "_" + safe;
    const { error } = await sb.storage.from("media").upload(path, file, { upsert: false });
    if (error) throw error;
    const { data } = sb.storage.from("media").getPublicUrl(path);
    return { url: data.publicUrl, path: path };
  }
  async function addSiteMedia(o) {
    const prof = await currentProfile();
    const row = {
      kind: o.kind || "image", url: o.url, storage_path: o.storagePath || null,
      title: o.title || null, category: o.category || null, sort_order: o.sortOrder || 0,
      created_by: prof ? prof.name : "",
    };
    const { data, error } = await sb.from("site_media").insert(row).select().single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, media: rowToMedia(data) };
  }
  async function deleteSiteMedia(id, storagePath) {
    if (storagePath) { await sb.storage.from("media").remove([storagePath]); }
    const { error } = await sb.from("site_media").delete().eq("id", id);
    return { ok: !error, error: error && error.message };
  }

  /* ----------  Trésorerie (entrées / sorties de fonds)  ---------- */
  function rowToTx(t) {
    return { id: t.id, kind: t.kind, amount: t.amount, category: t.category, label: t.label,
             method: t.method, occurredOn: t.occurred_on, authorName: t.author_name, createdAt: t.created_at };
  }
  async function getTransactions() {
    const { data, error } = await sb.from("transactions").select("*")
      .order("occurred_on", { ascending: false }).order("created_at", { ascending: false });
    if (error) { console.error(error); return []; }
    return data.map(rowToTx);
  }
  async function addTransaction(o) {
    const u = await currentUser();
    if (!u) return { ok: false, error: "Vous devez être connecté." };
    const prof = await currentProfile();
    const row = {
      kind: o.kind, amount: o.amount, category: o.category || null, label: o.label || null,
      method: o.method || null, occurred_on: o.occurredOn || null,
      author_id: u.id, author_name: prof ? prof.name : "",
    };
    const { data, error } = await sb.from("transactions").insert(row).select().single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, tx: rowToTx(data) };
  }
  async function deleteTransaction(id) {
    const { error } = await sb.from("transactions").delete().eq("id", id);
    return { ok: !error, error: error && error.message };
  }

  /* ----------  Photo de profil & présence en ligne  ---------- */
  async function uploadAvatar(file) {
    const u = await currentUser();
    if (!u) throw new Error("non connecté");
    const safe = file.name.replace(/[^\w.\-]/g, "_");
    const path = u.id + "/avatar_" + Date.now() + "_" + safe;
    const { error } = await sb.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = sb.storage.from("avatars").getPublicUrl(path);
    return data.publicUrl;
  }
  async function setAvatar(url) {
    const u = await currentUser();
    if (!u) return { ok: false };
    clearCache();
    const { error } = await sb.from("profiles").update({ photo: url }).eq("id", u.id);
    return { ok: !error, error: error && error.message };
  }
  // Met à jour "vu en ligne" (silencieux : ne bloque jamais l'app)
  async function touchPresence() {
    try {
      const u = await currentUser();
      if (!u) return;
      const prof = await currentProfile();
      const stamp = (prof && prof.presenceOn === false) ? null : new Date().toISOString();
      await sb.from("profiles").update({ last_seen: stamp }).eq("id", u.id);
    } catch (e) { /* silencieux */ }
  }
  async function setPresence(on) {
    const u = await currentUser();
    if (!u) return { ok: false };
    clearCache();
    const { error } = await sb.from("profiles")
      .update({ presence_on: on, last_seen: on ? new Date().toISOString() : null }).eq("id", u.id);
    return { ok: !error, error: error && error.message };
  }

  return {
    currentUser, currentProfile, clearCache,
    getStaff, getEmployees, getClients, getAllProfiles, updateProfile, setRole, deleteProfile,
    getRequests, getRequestById, addRequest, updateRequest, deleteRequest,
    uploadPlan, signedUrl,
    getReports, addReport, deleteReport,
    getRatings, rateEmployee,
    getSiteMedia, uploadMedia, addSiteMedia, deleteSiteMedia,
    getTransactions, addTransaction, deleteTransaction,
    uploadAvatar, setAvatar, touchPresence, setPresence,
  };
})();
