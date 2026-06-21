/* =====================================================================
   ARCHI_BUILDERS — Authentification & sessions
   ===================================================================== */

window.AUTH = (function () {
  "use strict";
  const K_SESSION = "ab_session";

  function login(email, password, role) {
    const user = AB.findUserByEmail(email);
    if (!user || user.password !== password) {
      return { ok: false, error: "E-mail ou mot de passe incorrect." };
    }
    if (role && user.role !== role) {
      return { ok: false, error: "Ce compte n'appartient pas à l'espace « " + roleLabel(role) + " »." };
    }
    const session = { id: user.id, name: user.name, email: user.email, role: user.role };
    localStorage.setItem(K_SESSION, JSON.stringify(session));
    return { ok: true, user: session };
  }

  function register(data) {
    // Inscription réservée aux clients depuis le portail
    const res = AB.addUser({
      name: data.name,
      email: data.email,
      phone: data.phone || "",
      password: data.password,
      role: "client",
    });
    if (!res.ok) return res;
    const session = { id: res.user.id, name: res.user.name, email: res.user.email, role: "client" };
    localStorage.setItem(K_SESSION, JSON.stringify(session));
    return { ok: true, user: session };
  }

  function logout() {
    localStorage.removeItem(K_SESSION);
    window.location.href = "portail.html";
  }

  function current() {
    try { return JSON.parse(localStorage.getItem(K_SESSION)); }
    catch (e) { return null; }
  }

  /* Protège une page : redirige vers le portail si le rôle ne correspond pas */
  function requireRole(role) {
    const s = current();
    if (!s) { window.location.href = "portail.html"; return null; }
    if (s.role !== role) {
      window.location.href = dashboardFor(s.role);
      return null;
    }
    return s;
  }

  function dashboardFor(role) {
    return ({
      admin: "espace-admin.html",
      employe: "espace-employe.html",
      client: "espace-client.html",
    })[role] || "portail.html";
  }

  function roleLabel(role) {
    return ({ admin: "Administration", employe: "Employés", client: "Clients" })[role] || role;
  }

  return { login, register, logout, current, requireRole, dashboardFor, roleLabel };
})();
