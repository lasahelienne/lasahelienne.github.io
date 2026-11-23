
  // =====================================================================
  // DELS : appli personnelle (devis enregistrés sur l'appareil, hors ligne)
  // =====================================================================
  var KEY = "dels-devis-v1", DRAFT = "dels-brouillon-v1", QUEUE = "dels-envois-v1";
  var cur = { id: null, created: null };
  function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function read(k, def) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? def : v; } catch (e) { return def; } }
  function all() { var l = read(KEY, []); return Array.isArray(l) ? l : []; }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  // Numérotation DELS : LS-AAMMJJ-01, 02… (un numéro unique par devis du jour)
  function defaultNumero() {
    var d = new Date(), pre = "LS-" + String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0") + "-";
    var max = 0;
    read(KEY, []).forEach(function (x) { var n = String(x.numero || ""); if (n.indexOf(pre) === 0) max = Math.max(max, parseInt(n.slice(pre.length), 10) || 0); });
    return pre + String(max + 1).padStart(2, "0");
  }
  function setDate(t) { $("cDate").textContent = new Date(t).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }); }
  function fileSafe(s) { return String(s).replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim(); }
  if (navigator.storage && navigator.storage.persist) { try { navigator.storage.persist(); } catch (e) {} }

  // ---------- Photo de la fiche (pour l'enregistrer et la rouvrir) ----------
  function snapshot() {
    var f = {};
    $("f").querySelectorAll("input[id], select[id]").forEach(function (el) {
      if (el.type === "radio" || el.type === "range" && el.id === "surfRange") return;
      f[el.id] = el.type === "checkbox" ? el.checked : el.value;
    });
    ["niv", "toit", "std"].forEach(function (n) { f["@" + n] = radio(n); });
    var rooms = {}; ROOMS.forEach(function (r) { rooms[r.id] = state.rooms[r.id] || 0; });
    return { f: f, rooms: rooms };
  }
  function restore(s) {
    if (!s || !s.f) return;
    var f = s.f;
    if (f.pays && COUNTRIES[f.pays]) $("pays").value = f.pays;
    fillRegions(); setCountryDefaults();
    ["niv", "toit", "std"].forEach(function (n) { if (f["@" + n]) setRadio(n, f["@" + n]); });
    Object.keys(f).forEach(function (id) {
      if (id.charAt(0) === "@" || id === "pays") return;
      var el = $(id); if (!el) return;
      if (el.type === "checkbox") el.checked = !!f[id]; else el.value = f[id];
    });
    $("surfRange").value = Math.min(1500, Math.max(30, Number($("surf").value) || 30));
    ROOMS.forEach(function (r) { state.rooms[r.id] = (s.rooms && s.rooms[r.id]) || 0; $("room-" + r.id).textContent = state.rooms[r.id]; });
    ["zone", "surf", "rooms"].forEach(function (id) { $(id).classList.remove("invalid"); });
    $("formErr").hidden = true; $("formErr2").hidden = true;
    update();
    if (!missing().length) { $("resultats").classList.remove("locked"); update(); }
    else $("resultats").classList.add("locked");
  }
  function record() {
    var r = state.last, m = meta();
    return {
      id: cur.id || uid(), created: cur.created || Date.now(), updated: Date.now(),
      numero: m.numero, client: m.client, projet: m.projet, lieu: r.Z.n + ", " + r.C.short,
      resume: TYPE[r.type].n + " " + NIV_N[r.niv - 1] + " · " + nf.format(r.surf).replace(/[  ]/g, " ") + " m² · " + BASE[r.std].long,
      total: Math.round(r.total), totalTxt: money(r.total), data: snapshot()
    };
  }

  // ---------- Enregistrement ----------
  function save(silent) {
    if (missing().length) { if (!silent) validate(); return false; }
    var rec = record(), list = all(), i = -1;
    list.forEach(function (x, k) { if (x.id === rec.id) i = k; });
    if (i >= 0) list[i] = rec; else list.unshift(rec);
    if (!store(KEY, list)) { if (!silent) setStatus("Mémoire de l'appareil pleine : enregistrement impossible.", true); return false; }
    cur.id = rec.id; cur.created = rec.created;
    try { localStorage.removeItem(DRAFT); } catch (e) {}
    renderList();
    markSaved(true);
    if (!silent) setStatus("Devis enregistré sur cet appareil");
    return true;
  }
  function markSaved(ok) {
    var b = $("saveBtn"); if (!b) return;
    b.classList.toggle("saved", !!ok);
    b.querySelector("span").textContent = ok ? "Enregistré" : "Enregistrer";
  }
  var autoT = null;
  function onEdit() {
    markSaved(false);
    clearTimeout(autoT);
    autoT = setTimeout(function () {
      // Un devis déjà enregistré se met à jour tout seul ; sinon, la fiche en cours est gardée en brouillon.
      if (cur.id && !missing().length) save(true);
      else store(DRAFT, { at: Date.now(), data: snapshot() });
    }, 700);
  }
  $("f").addEventListener("input", onEdit);
  $("f").addEventListener("change", onEdit);
  $("rooms").addEventListener("click", onEdit);

  function newDevis() {
    if (!cur.id && !missing().length && $("client").value.trim()) save(true);
    $("resetBtn").click();
    ["client", "email", "telClient", "projet"].forEach(function (id) { $(id).value = ""; });
    $("numero").value = defaultNumero();
    cur = { id: null, created: null }; setDate(Date.now());
    try { localStorage.removeItem(DRAFT); } catch (e) {}
    markSaved(false); renderList(); update();
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(function () { $("client").focus({ preventScroll: true }); }, 350);
  }
  $("newBtn").addEventListener("click", newDevis);
  $("saveBtn").addEventListener("click", function () { save(false); });

  // ---------- Panneau « Mes devis » ----------
  var panel = $("delsPanel"), lastFocus = null;
  function dateTxt(t) { return new Date(t).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }); }
  function renderList() {
    var list = all(), q = ($("dpSearch").value || "").toLowerCase().trim();
    $("listCount").textContent = list.length;
    var shown = list.filter(function (d) { return !q || [d.client, d.projet, d.numero, d.lieu, d.resume].join(" ").toLowerCase().indexOf(q) >= 0; });
    $("dpEmpty").hidden = list.length > 0;
    $("dpList").innerHTML = shown.map(function (d) {
      return '<li class="dp-item' + (d.id === cur.id ? " cur" : "") + '" data-id="' + esc(d.id) + '">' +
        '<div class="dp-top"><span class="dp-client">' + esc(d.client || "Client sans nom") + '</span><span class="dp-total">' + esc(d.totalTxt || "") + "</span></div>" +
        '<div class="dp-meta">' + esc(d.projet || "") + " · " + esc(d.resume || "") + "</div>" +
        '<div class="dp-meta">' + esc(d.lieu || "") + " · N° " + esc(d.numero || "-") + " · modifié le " + dateTxt(d.updated) + "</div>" +
        '<div class="dp-acts"><button type="button" class="open" data-act="open">Ouvrir</button><button type="button" data-act="dup">Dupliquer</button><button type="button" class="del" data-act="del">Supprimer</button></div></li>';
    }).join("") || (list.length ? '<li class="dp-empty">Aucun devis ne correspond à la recherche.</li>' : "");
  }
  function openPanel() { lastFocus = document.activeElement; renderList(); panel.hidden = false; document.body.style.overflow = "hidden"; setTimeout(function () { $("dpSearch").focus(); }, 60); }
  function closePanel() { panel.hidden = true; document.body.style.overflow = ""; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  $("listBtn").addEventListener("click", openPanel);
  panel.addEventListener("click", function (e) {
    if (e.target.closest("[data-close]")) { closePanel(); return; }
    var b = e.target.closest("button[data-act]"); if (!b) return;
    var id = b.closest(".dp-item").dataset.id, list = all(), d = list.filter(function (x) { return x.id === id; })[0];
    if (!d) return;
    if (b.dataset.act === "open") {
      cur = { id: d.id, created: d.created }; restore(d.data); setDate(d.created); markSaved(true); closePanel();
      setStatus("Devis ouvert : " + (d.client || d.numero));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (b.dataset.act === "dup") {
      cur = { id: null, created: null }; restore(d.data); setDate(Date.now());
      $("numero").value = defaultNumero(); $("projet").value = (d.projet || "") + " (copie)";
      save(true); renderList(); closePanel(); setStatus("Copie créée : modifiez-la librement");
    } else if (b.dataset.act === "del") {
      if (!b.classList.contains("sure")) { b.classList.add("sure"); b.textContent = "Confirmer ?"; setTimeout(function () { if (b.isConnected) { b.classList.remove("sure"); b.textContent = "Supprimer"; } }, 3500); return; }
      store(KEY, list.filter(function (x) { return x.id !== id; }));
      if (cur.id === id) { cur = { id: null, created: null }; markSaved(false); }
      renderList();
    }
  });
  $("dpSearch").addEventListener("input", renderList);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !panel.hidden) closePanel(); });

  // Sauvegarde / restauration (fichier) : pour changer d'appareil ou garder une copie
  $("exportBtn").addEventListener("click", function () {
    var data = JSON.stringify({ app: "DELS", version: 1, exported: new Date().toISOString(), devis: all() }, null, 1);
    var blob = new Blob([data], { type: "application/json" });
    var a = document.createElement("a"), d = new Date();
    a.href = URL.createObjectURL(blob);
    a.download = "DELS-sauvegarde-" + d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0") + ".json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  });
  $("importFile").addEventListener("change", function () {
    var file = this.files && this.files[0]; if (!file) return;
    var input = this;
    file.text().then(function (txt) {
      var j = JSON.parse(txt), inc = (j && Array.isArray(j.devis)) ? j.devis : null;
      if (!inc) throw new Error("format");
      var list = all(), byId = {}; list.forEach(function (x) { byId[x.id] = x; });
      var added = 0;
      inc.forEach(function (x) {
        if (!x || !x.id || !x.data) return;
        if (!byId[x.id]) { list.push(x); added++; } else if ((x.updated || 0) > (byId[x.id].updated || 0)) { list[list.indexOf(byId[x.id])] = x; added++; }
      });
      list.sort(function (a, b) { return (b.updated || 0) - (a.updated || 0); });
      store(KEY, list); renderList();
      $("dpEmpty").hidden = list.length > 0;
      alertPanel(added ? added + " devis ajouté(s) ou mis à jour." : "Rien de nouveau dans ce fichier.");
    }).catch(function () { alertPanel("Ce fichier n'est pas une sauvegarde DELS."); }).then(function () { input.value = ""; });
  });
  function alertPanel(msg) { var n = panel.querySelector(".dp-note.small"); n.textContent = msg; n.style.color = "var(--accent)"; }

  // ---------- PDF, partage, WhatsApp, e-mail ----------
  function pdfName() { return fileSafe("Devis La Sahélienne " + ($("numero").value.trim() || "estimatif") + ($("client").value.trim() ? " - " + $("client").value.trim() : "")) + ".pdf"; }
  function ready() { if (missing().length) { validate(); return false; } if (!window.jspdf) { setStatus("Le module PDF n'est pas chargé. Rechargez l'appli une fois avec Internet.", true); return false; } return true; }
  $("pdfBtn").addEventListener("click", function () {
    if (!ready()) return;
    save(true);
    try { buildPdf().save(pdfName()); setStatus("PDF enregistré dans vos téléchargements"); } catch (e) { setStatus("La création du PDF a échoué.", true); }
  });
  $("shareBtn").addEventListener("click", function () {
    if (!ready()) return;
    save(true);
    var file;
    try { file = new File([buildPdf().output("blob")], pdfName(), { type: "application/pdf" }); } catch (e) { setStatus("La création du PDF a échoué.", true); return; }
    var data = { files: [file], title: "Devis estimatif " + $("numero").value.trim(), text: "Devis estimatif La Sahélienne" };
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share(data).then(function () { setStatus("Devis partagé"); }, function (e) { if (e && e.name !== "AbortError") setStatus("Partage impossible ici : le PDF a été téléchargé.", true), buildPdf().save(pdfName()); });
    } else {
      buildPdf().save(pdfName());
      setStatus("Cet appareil ne sait pas partager un fichier : PDF téléchargé, joignez-le à votre message.");
    }
  });
  function waNumber(t) {
    var d = String(t || "").replace(/[^\d+]/g, "");
    if (d.indexOf("00") === 0) d = d.slice(2);
    d = d.replace(/\+/g, "");
    if (d.length === 8) d = "223" + d; // numéro malien saisi sans indicatif
    return d.length >= 8 ? d : "";
  }
  function waLink() { var n = waNumber($("telClient").value); return "https://wa.me/" + n + "?text=" + encodeURIComponent(recapText()); }
  function mailLink() {
    var m = meta();
    return "mailto:" + encodeURIComponent($("email").value.trim()).replace(/%40/g, "@") + "?subject=" + encodeURIComponent("Votre devis estimatif N° " + (m.numero || "") + " · La Sahélienne") + "&body=" + encodeURIComponent((m.client ? "Bonjour " + m.client + ",\n\n" : "Bonjour,\n\n") + "Voici l'estimation de votre projet.\n\n" + recapText());
  }
  function openOut(url) { var a = document.createElement("a"); a.href = url; a.target = "_blank"; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove(); }
  function send(kind) {
    if (missing().length) { validate(); return; }
    save(true);
    var url = kind === "wa" ? waLink() : mailLink();
    if (kind === "wa" && !navigator.onLine) {
      var q = read(QUEUE, []); q.push({ kind: kind, url: url, label: ($("client").value.trim() || "client") + " · N° " + $("numero").value.trim(), at: Date.now() });
      store(QUEUE, q); showQueue();
      setStatus("Pas de connexion : l'envoi WhatsApp est mis en attente. Il vous sera proposé dès le retour d'Internet.");
      return;
    }
    openOut(url);
  }
  $("waSend").addEventListener("click", function () { send("wa"); });
  $("mailSend").addEventListener("click", function () { send("mail"); });

  function showQueue() {
    var q = read(QUEUE, []);
    $("queueBanner").hidden = !(q.length && navigator.onLine);
    $("queueTxt").textContent = q.length === 1 ? "1 envoi WhatsApp en attente (" + q[0].label + ")." : q.length + " envois WhatsApp en attente.";
  }
  $("queueBtn").addEventListener("click", function () {
    var q = read(QUEUE, []), it = q.shift(); store(QUEUE, q);
    if (it) openOut(it.url);
    showQueue();
  });
  $("queueDrop").addEventListener("click", function () { store(QUEUE, []); showQueue(); });

  // ---------- Connexion ----------
  function net() {
    var on = navigator.onLine;
    $("netPill").classList.toggle("off", !on);
    $("netTxt").textContent = on ? "En ligne" : "Hors ligne · tout fonctionne";
    showQueue();
  }
  window.addEventListener("online", net); window.addEventListener("offline", net);

  // ---------- Thème mémorisé ----------
  function setTheme(mode) {
    if (mode === "light" || mode === "dark") document.documentElement.setAttribute("data-theme", mode);
    else document.documentElement.removeAttribute("data-theme");
    document.querySelectorAll("[data-theme-set]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.themeSet === mode)); });
    try { localStorage.setItem("dels-theme", mode); } catch (e) {}
  }
  document.querySelectorAll("[data-theme-set]").forEach(function (b) { b.addEventListener("click", function () { setTheme(b.dataset.themeSet); }); });
  setTheme((function () { try { return localStorage.getItem("dels-theme") || "auto"; } catch (e) { return "auto"; } })());

  // ---------- Installation et mises à jour ----------
  var deferred = null;
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferred = e; $("installBtn").hidden = false; });
  $("installBtn").addEventListener("click", function () {
    if (!deferred) return;
    deferred.prompt(); deferred.userChoice.then(function () { deferred = null; $("installBtn").hidden = true; });
  });
  window.addEventListener("appinstalled", function () { $("installBtn").hidden = true; });
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    var reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", function () { if (reloading) return; reloading = true; location.reload(); });
    navigator.serviceWorker.register("./sw.js").then(function (reg) {
      function offer(w) { $("updBanner").hidden = false; $("updBtn").onclick = function () { if (cur.id && !missing().length) save(true); else store(DRAFT, { at: Date.now(), data: snapshot() }); w.postMessage("skipWaiting"); }; }
      if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
      reg.addEventListener("updatefound", function () {
        var w = reg.installing; if (!w) return;
        w.addEventListener("statechange", function () { if (w.state === "installed" && navigator.serviceWorker.controller) offer(w); });
      });
      setInterval(function () { if (navigator.onLine) reg.update().catch(function () {}); }, 30 * 60 * 1000);
    }).catch(function () {});
  }

  // ---------- Démarrage : reprendre le brouillon ou le dernier devis ouvert ----------
  (function start() {
    var d = read(DRAFT, null), lastId = read("dels-ouvert", null), list = all();
    var last = list.filter(function (x) { return x.id === lastId; })[0];
    if (d && d.data && (!last || d.at > last.updated)) restore(d.data);
    else if (last) { cur = { id: last.id, created: last.created }; restore(last.data); setDate(last.created); markSaved(true); }
    if (!$("numero").value) $("numero").value = defaultNumero();
    renderList(); net();
  })();
  setInterval(function () { store("dels-ouvert", cur.id); }, 2000);
  window.addEventListener("pagehide", function () { store("dels-ouvert", cur.id); if (!cur.id) store(DRAFT, { at: Date.now(), data: snapshot() }); });
