/* =====================================================================
   ARCHI_BUILDERS — Gestion des images & vidéos du site
   (réservée à la direction et au chargé de communication)
   ===================================================================== */
(async function () {
  "use strict";
  const form = document.getElementById("mediaUploadForm");
  if (!form) return; // page sans gestion des médias

  const $ = (id) => document.getElementById(id);
  const prof = await DB.currentProfile();
  const canManage = prof && (prof.role === "admin" || (prof.role === "employe" && prof.department === "communication"));

  // Si l'utilisateur n'est pas autorisé : on retire l'onglet et la section
  if (!canManage) {
    const navLink = document.querySelector('.snav a[data-view="media"]');
    const section = document.querySelector('section[data-view="media"]');
    if (navLink) navLink.remove();
    if (section) section.remove();
    return;
  }

  let media = [];
  async function load() { media = await DB.getSiteMedia(); renderList(); }

  function renderList() {
    const el = $("mediaList");
    if (!media.length) { el.innerHTML = "<div class='empty'><div class='ic'>🖼️</div><p>Aucun média. Ajoutez-en avec le formulaire ci-dessus.</p></div>"; return; }
    el.innerHTML = "<div class='media-grid'>" + media.map((m) =>
      "<div class='media-card'>" +
      (m.kind === "video"
        ? "<div class='media-thumb media-thumb--video'>▶ Vidéo</div>"
        : "<div class='media-thumb' style=\"background-image:url('" + AB.escapeHtml(m.url) + "')\"></div>") +
      "<div class='media-meta'><b>" + AB.escapeHtml(m.title || "—") + "</b><span class='muted'>" + AB.escapeHtml(m.category || "") + "</span></div>" +
      "<button class='btn btn--sm' style='background:#fbe9e7;color:#c0392b;width:100%' data-delmedia='" + m.id + "'>🗑 Supprimer</button>" +
      "</div>").join("") + "</div>";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const ok = $("mediaOk"), err = $("mediaErr");
    ok.classList.remove("show"); err.classList.remove("show");
    const file = $("mediaFile").files[0];
    const ext = $("mediaUrl").value.trim();
    const title = $("mediaTitle").value.trim();
    const category = $("mediaCategory").value;
    if (!file && !ext) { err.textContent = "Choisissez un fichier OU collez un lien vidéo."; err.classList.add("show"); return; }

    const btn = form.querySelector("button");
    btn.disabled = true; const lbl = btn.textContent; btn.textContent = "⏳ Ajout en cours…";
    try {
      let payload;
      if (file) {
        const up = await DB.uploadMedia(file);
        payload = { kind: file.type.indexOf("video") === 0 ? "video" : "image", url: up.url, storagePath: up.path, title: title, category: category, sortOrder: media.length + 1 };
      } else {
        payload = { kind: "video", url: ext, title: title, category: category, sortOrder: media.length + 1 };
      }
      const res = await DB.addSiteMedia(payload);
      if (!res.ok) throw new Error(res.error || "");
      ok.textContent = "✅ Média ajouté au site !"; ok.classList.add("show");
      form.reset();
      await load();
    } catch (e2) {
      err.textContent = "Échec de l'ajout. Vérifiez votre connexion et réessayez."; err.classList.add("show");
    }
    btn.disabled = false; btn.textContent = lbl;
  });

  document.addEventListener("click", async (e) => {
    const d = e.target.closest("[data-delmedia]");
    if (!d) return;
    if (!confirm("Supprimer définitivement ce média du site ?")) return;
    const m = media.find((x) => x.id === d.dataset.delmedia);
    await DB.deleteSiteMedia(d.dataset.delmedia, m ? m.storagePath : null);
    await load();
  });

  load();
})();
