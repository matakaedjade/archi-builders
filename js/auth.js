/* =====================================================================
   ARCHI_BUILDERS — Authentification (Supabase) — asynchrone
   ===================================================================== */
window.AUTH = (function () {
  "use strict";
  const sb = SB.client;

  function roleLabel(role) {
    return ({ admin: "Administration", employe: "Employés", client: "Clients" })[role] || role;
  }
  function dashboardFor(role) {
    return ({ admin: "espace-admin.html", employe: "espace-employe.html", client: "espace-client.html" })[role]
      || "portail.html";
  }
  function translateError(msg) {
    msg = (msg || "").toLowerCase();
    if (msg.includes("already registered") || msg.includes("already been registered"))
      return "Un compte existe déjà avec cet e-mail.";
    if (msg.includes("invalid login")) return "E-mail ou mot de passe incorrect.";
    if (msg.includes("password")) return "Mot de passe trop court (6 caractères minimum).";
    if (msg.includes("email")) return "Adresse e-mail invalide.";
    return "Une erreur est survenue. Réessayez.";
  }

  async function login(email, password, role) {
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { ok: false, error: translateError(error.message) };
    DB.clearCache();
    const prof = await DB.currentProfile(true);
    if (!prof) { await sb.auth.signOut(); return { ok: false, error: "Profil introuvable. Contactez l'administrateur." }; }
    if (role && prof.role !== role) {
      await sb.auth.signOut(); DB.clearCache();
      return { ok: false, error: "Ce compte n'appartient pas à l'espace « " + roleLabel(role) + " ». Choisissez le bon onglet." };
    }
    return { ok: true, user: prof };
  }

  async function register(d) {
    const { data, error } = await sb.auth.signUp({
      email: d.email.trim(), password: d.password,
      options: { data: { name: d.name, phone: d.phone || "" } },
    });
    if (error) return { ok: false, error: translateError(error.message) };
    if (!data.session) {
      // Cas où la confirmation par e-mail serait restée active
      return { ok: false, error: "Compte créé. Vérifiez votre boîte e-mail pour confirmer, puis connectez-vous." };
    }
    DB.clearCache();
    const prof = await DB.currentProfile(true);
    return { ok: true, user: { email: d.email, role: prof ? prof.role : "client" } };
  }

  async function logout() {
    await sb.auth.signOut();
    DB.clearCache();
    window.location.href = "portail.html";
  }

  async function current() {
    return await DB.currentProfile();
  }

  // Protège une page de tableau de bord
  async function requireRole(role) {
    const prof = await DB.currentProfile(true);
    if (!prof) { window.location.href = "portail.html"; return null; }
    if (prof.role !== role) { window.location.href = dashboardFor(prof.role); return null; }
    return prof;
  }

  return { login, register, logout, current, requireRole, dashboardFor, roleLabel };
})();
