/* =====================================================================
   ARCHI_BUILDERS — Logique du portail (connexion / inscription)
   ===================================================================== */
(function () {
  "use strict";

  document.querySelectorAll(".yr").forEach((e) => (e.textContent = new Date().getFullYear()));

  // Si déjà connecté, on redirige vers le bon espace
  const session = AUTH.current();
  if (session) { window.location.href = AUTH.dashboardFor(session.role); return; }

  let role = "client";
  let mode = "login"; // 'login' | 'register'

  const tabs = document.getElementById("roleTabs");
  const formTitle = document.getElementById("formTitle");
  const formSub = document.getElementById("formSub");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const toggleWrap = document.getElementById("toggleWrap");
  const toggleBtn = document.getElementById("toggleBtn");
  const alertErr = document.getElementById("alertErr");
  const alertOk = document.getElementById("alertOk");

  const TITLES = {
    client: { t: "Espace Client", s: "Connectez-vous pour déposer vos plans et estimer votre projet." },
    employe: { t: "Espace Employé", s: "Accédez aux demandes de conception qui vous sont confiées." },
    admin: { t: "Administration", s: "Pilotez l'activité, les demandes et les comptes." },
  };

  function clearAlerts() { alertErr.classList.remove("show"); alertOk.classList.remove("show"); }
  function showErr(m) { clearAlerts(); alertErr.textContent = m; alertErr.classList.add("show"); }
  function showOk(m) { clearAlerts(); alertOk.textContent = m; alertOk.classList.add("show"); }

  function setMode(m) {
    mode = m;
    const reg = m === "register";
    registerForm.classList.toggle("hidden", !reg);
    loginForm.classList.toggle("hidden", reg);
    formTitle.textContent = reg ? "Créer un espace client" : TITLES[role].t;
    formSub.textContent = reg ? "Quelques informations et c'est parti." : TITLES[role].s;
    toggleBtn.textContent = reg ? "J'ai déjà un compte" : "Créer un espace client";
    toggleWrap.firstChild.textContent = reg ? "Déjà inscrit·e ? " : "Pas encore de compte ? ";
    clearAlerts();
  }

  // Onglets de rôle
  tabs.addEventListener("click", (e) => {
    const btn = e.target.closest(".role-tab");
    if (!btn) return;
    role = btn.dataset.role;
    tabs.querySelectorAll(".role-tab").forEach((t) => t.classList.toggle("active", t === btn));
    // L'inscription n'est proposée qu'aux clients
    toggleWrap.style.display = role === "client" ? "block" : "none";
    if (role !== "client") setMode("login");
    formTitle.textContent = TITLES[role].t;
    formSub.textContent = TITLES[role].s;
    clearAlerts();
  });

  // Basculer connexion / inscription
  toggleBtn.addEventListener("click", () => setMode(mode === "login" ? "register" : "login"));

  // Connexion
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const res = AUTH.login(email, password, role);
    if (!res.ok) return showErr(res.error);
    window.location.href = AUTH.dashboardFor(res.user.role);
  });

  // Inscription
  registerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = {
      name: document.getElementById("rName").value.trim(),
      email: document.getElementById("rEmail").value.trim(),
      phone: document.getElementById("rPhone").value.trim(),
      password: document.getElementById("rPass").value,
    };
    const res = AUTH.register(data);
    if (!res.ok) return showErr(res.error);
    showOk("Compte créé ! Redirection…");
    setTimeout(() => (window.location.href = AUTH.dashboardFor("client")), 700);
  });
})();
