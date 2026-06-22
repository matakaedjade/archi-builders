/* =====================================================================
   ARCHI_BUILDERS — Connexion à Supabase (base de données en ligne)
   ---------------------------------------------------------------------
   La clé "publishable" est conçue pour être publique : la sécurité réelle
   est assurée côté serveur par les règles RLS de la base de données.
   ===================================================================== */
window.SB = (function () {
  "use strict";
  const SUPABASE_URL = "https://sfoxiehiaweudnbpbvmh.supabase.co";
  const SUPABASE_KEY = "sb_publishable_e1ktQe--NPN1w5b-sApAVQ_csqC3cNb";

  if (!window.supabase || !window.supabase.createClient) {
    console.error("La librairie Supabase n'est pas chargée.");
    return { client: null };
  }
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  return { client, URL: SUPABASE_URL };
})();
