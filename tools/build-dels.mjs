// Construit l'appli DELS (dels/) à partir du simulateur public (index.html).
// Le moteur de calcul et les prix restent ceux du simulateur public :
// après une mise à jour des prix dans index.html, relancer :  node tools/build-dels.mjs
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const P = (...a) => path.join(root, ...a);
const rd = (f) => fs.readFileSync(P(f), "utf8");
let s = rd("index.html");

function rep(from, to, label) {
  const n = s.split(from).length - 1;
  if (n !== 1) throw new Error(`[${label}] ${n} occurrence(s) au lieu de 1`);
  s = s.replace(from, () => to);
}
function cut(start, end, to, label) { // remplace de start (inclus) à end (exclu)
  const i = s.indexOf(start), j = s.indexOf(end, i + start.length);
  if (i < 0 || j < 0 || s.indexOf(start, i + 1) >= 0) throw new Error(`[${label}] repères introuvables ou multiples`);
  s = s.slice(0, i) + to + s.slice(j);
}

// 1. En-tête HTML : appli privée (noindex), manifeste, icônes, police locale, aucun suivi
cut('<meta charset="utf-8">', "<style>", rd("dels/src/head.html"), "head");

// 2. Bandeau DELS à la place du bandeau public
const fav = rd("favicon.svg");
const [bld, ls] = [...fav.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1]);
const mark = `<svg viewBox="0 0 1780 1780"><path fill="#B4532A" fill-opacity=".9" fill-rule="evenodd" d="${bld}"/><path fill="#202F27" fill-rule="evenodd" d="${ls}"/></svg>`;
const s0 = s.indexOf('<header class="brand">'), s1 = s.indexOf("</header>", s0) + "</header>".length;
if (s0 < 0 || s1 < 9) throw new Error("[header] introuvable");
s = s.slice(0, s0) + rd("dels/src/header.html").replace("__LS_MARK__", mark).trimEnd() + s.slice(s1);

// 3. Taux entreprise / honoraires modifiables (appli de l'architecte)
for (const id of ["margeEnt", "honoLS"]) {
  const re = new RegExp(`<span class="pct-in locked" title="[^"]*"><input type="number" id="${id}"([^>]*) readonly tabindex="-1" aria-readonly="true">`);
  if (!re.test(s)) throw new Error(`[pct ${id}]`);
  s = s.replace(re, `<span class="pct-in"><input type="number" id="${id}"$1>`);
}
s = s.replace(/ · fixée selon le standing<\/small>/, " · proposée selon le standing, modifiable</small>")
     .replace(/ · fixés selon le standing<\/small>/, " · proposés selon le standing, modifiables</small>");
rep('<button class="btn" type="submit" id="validBtn">Valider et voir mon devis</button>', '<button class="btn" type="submit" id="validBtn">Calculer le devis</button>', "valid");
rep('<button class="btn" type="button" id="validBtn2">Valider et voir mon devis</button>', '<button class="btn" type="button" id="validBtn2">Calculer le devis</button>', "valid2");
rep("<p>Votre devis détaillé s'affichera ici dès que vous aurez validé la fiche ci-dessus. Il faut au minimum&nbsp;:</p>", "<p>Le devis s'affiche ici dès que la fiche contient au minimum&nbsp;:</p>", "lockmsg");

// 4. Actions du devis (enregistrer, PDF, partager, WhatsApp, e-mail) ; offre et mentions publiques retirées
const waSvg = (s.match(/id="waBtn"[^>]*>(<svg[\s\S]*?<\/svg>)/) || [])[1];
let actions = rd("dels/src/actions.html");
if (waSvg) actions = actions.replace(/(id="waSend">)<svg[\s\S]*?<\/svg>/, `$1${waSvg}`);
cut('      <p class="avis">', '      <div style="padding:0 24px 18px" id="recapWrap" hidden>', actions, "actions");

// 5. FAQ et contact publics retirés (éléments factices gardés pour le code commun)
cut('  <section class="sheet" aria-labelledby="faqTitle">', "  <footer>", '  <a id="waBtn" hidden></a><a id="telBtn" hidden></a>\n\n', "faq+contact");
cut("  <footer>", "</div>\n\n<div class=\"mobilebar\"",
  `  <footer>\n    <span>DELS · Devis Estimatif La Sahélienne</span>\n    <span>Version __BUILD__ · fonctionne sans Internet</span>\n  </footer>\n`, "footer");
rep('<a href="#resultats">Voir le devis</a>', '<a href="#resultats">Voir</a>', "mobilebar");

// 6. Scripts : jsPDF local, pas de collecte de contacts, pas d'analytics
rep('<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>', '<script src="./vendor/jspdf.umd.min.js"></script>', "jspdf");
s = s.replace(/<!-- Cloudflare Web Analytics -->[\s\S]*?<!-- End Cloudflare Web Analytics -->\n?/, "");
rep('var GATE = "pdf";', 'var GATE = "none";', "gate");
s = s.replace(/var LEAD_URL = "[^"]*";/, 'var LEAD_URL = "";');
cut("  var downloadsP = ", '  $("copyBtn").addEventListener', "", "pdf public");
rep('  applyTheme("light"); // le lien s\'ouvre toujours en version claire\n', "", "theme");

// 7. PDF aux couleurs de la charte + coordonnées du cabinet
rep("ACC = [158, 58, 38]", "ACC = [180, 83, 42]", "acc");
rep("CREAM = [247, 243, 236], BAND = [95, 114, 82]", "CREAM = [247, 241, 232], BAND = [32, 47, 39]", "band");
rep("color([230, 235, 223])", "color([220, 201, 179])", "bandtxt");
const logo = fs.readFileSync(P("dels/src/logo-pdf.jpg")).toString("base64");
s = s.replace(/var LOGO_PDF = "data:image\/jpeg;base64,[^"]+";/, () => `var LOGO_PDF = "data:image/jpeg;base64,${logo}";`);
rep('doc.addImage(LOGO_PDF, "JPEG", M - 2, 3.5, 57, 30.6)', 'doc.addImage(LOGO_PDF, "JPEG", M - 2, 5.6, 57, 26.7)', "logo");
rep('T("La Sahélienne · Architecture, Design & Infographie", M, 291);', 'T("La Sahélienne · +223 62 03 82 18 · contact@lasahelienne-architecture.com", M, 291);', "pied pdf");

// 8. Styles et logique DELS
rep("</style>\n\n", "</style>\n<style>" + rd("dels/src/dels.css") + "</style>\n\n", "css");
const endMain = "  update();\n})();\n</script>";
rep(endMain, rd("dels/src/dels.js") + "\n" + endMain, "js");

// Le nom s'écrit toujours « La Sahélienne » (seuls L et S en majuscules)
rep(">LA SAHÉLIENNE · ARCHITECTURE<", ">La Sahélienne · Architecture<", "plan nom");
rep('L.push("LA SAHÉLIENNE · Architecture, Design et Infographie");', 'L.push("La Sahélienne · Architecture, Design et Infographie");', "recap nom");

// Garde-fous
if (/92\s?03\s?82\s?18/.test(s)) throw new Error("numéro personnel présent !");
if (/googletagmanager|cloudflareinsights|script\.google\.com/.test(s)) throw new Error("suivi externe présent");
if (/LA SAH[ÉE]LIENNE/.test(s)) throw new Error("nom en capitales");

// 9. Version + service worker (liste des fichiers à garder hors ligne)
const assets = ["vendor/jspdf.umd.min.js", "fonts/inter-latin.woff2", "fonts/inter-latin-ext.woff2", "icons/icon.svg", "icons/icon-32.png", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "icons/apple-180.png", "manifest.webmanifest"];
const h = crypto.createHash("sha256").update(s);
for (const a of assets) h.update(fs.readFileSync(P("dels", a)));
h.update(rd("dels/src/sw.js"));
const build = new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + h.digest("hex").slice(0, 8);
s = s.replace("__BUILD__", build);
fs.writeFileSync(P("dels/index.html"), s);
fs.writeFileSync(P("dels/sw.js"), rd("dels/src/sw.js").replace("__BUILD__", build).replace("__ASSETS__", JSON.stringify(["./", ...assets.map((a) => "./" + a)])));
console.log("DELS construit :", build, Math.round(s.length / 1024) + " Ko");
