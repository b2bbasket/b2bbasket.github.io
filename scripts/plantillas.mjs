// Plantillas actuales de los 30 equipos y datos de cada jugador en activo.
//
// Fuentes (gratuitas y abiertas):
//   · Wikipedia: las plantillas «Template:<Equipo> roster», que los editores mantienen al día
//     (dorsal, posición, altura, peso, fecha de nacimiento, procedencia, lesionados, contratos dobles
//     y entrenador principal).
//   · Wikidata: país deportivo (P1532) o nacionalidad (P27), lugar de nacimiento (P19) y foto (P18).
//   · Wikimedia Commons: licencia y autor de cada foto. Solo se usan fotos con licencia libre.
// Resultado: src/_data/plantillas.json. No se inventa ni se escribe ningún dato a mano.
// Uso: node scripts/plantillas.mjs
import fs from "node:fs";

const SALIDA = "src/_data/plantillas.json";
const [DUENO] = (process.env.GITHUB_REPOSITORY || "b2bbasket/").split("/");
const UA = `B2BBasket/1.0 (https://${(DUENO || "b2bbasket").toLowerCase()}.github.io; plantillas NBA)`;
const ABREV = { "Atlanta Hawks": "ATL", "Boston Celtics": "BOS", "Brooklyn Nets": "BKN", "Charlotte Hornets": "CHA", "Chicago Bulls": "CHI", "Cleveland Cavaliers": "CLE", "Dallas Mavericks": "DAL", "Denver Nuggets": "DEN", "Detroit Pistons": "DET", "Golden State Warriors": "GSW", "Houston Rockets": "HOU", "Indiana Pacers": "IND", "Los Angeles Clippers": "LAC", "Los Angeles Lakers": "LAL", "Memphis Grizzlies": "MEM", "Miami Heat": "MIA", "Milwaukee Bucks": "MIL", "Minnesota Timberwolves": "MIN", "New Orleans Pelicans": "NOP", "New York Knicks": "NYK", "Oklahoma City Thunder": "OKC", "Orlando Magic": "ORL", "Philadelphia 76ers": "PHI", "Phoenix Suns": "PHX", "Portland Trail Blazers": "POR", "Sacramento Kings": "SAC", "San Antonio Spurs": "SAS", "Toronto Raptors": "TOR", "Utah Jazz": "UTA", "Washington Wizards": "WAS" };
const POSICION = { PG: "Base", SG: "Escolta", SF: "Alero", PF: "Ala-pívot", C: "Pívot", G: "Base o escolta", F: "Alero o ala-pívot", GF: "Escolta o alero", FC: "Ala-pívot o pívot", PF_C: "Ala-pívot o pívot" };

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(url, intentos = 4) {
  for (let i = 0; i < intentos; i++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA, "Api-User-Agent": UA } });
      if (r.ok) return r.json();
      if (r.status !== 429 && r.status < 500) throw new Error(`HTTP ${r.status}`);
    } catch (e) { if (i === intentos - 1) throw e; }
    await espera(2000 * (i + 1));
  }
}
const trozos = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const slug = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const sinMarcado = (t) => String(t || "").replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1").replace(/'''?/g, "").replace(/<[^>]+>/g, "").replace(/\{\{[^}]*\}\}/g, "").trim();

// ---- 1. Plantillas de Wikipedia ----
function parsearPlantilla(texto) {
  const jugadores = [];
  for (const m of texto.matchAll(/\{\{\s*player2\s*\|([\s\S]*?)\}\}/gi)) {
    const p = {};
    for (const parte of m[1].split("|")) {
      const i = parte.indexOf("=");
      if (i > 0) p[parte.slice(0, i).trim().toLowerCase()] = parte.slice(i + 1).trim();
    }
    if (!p.first && !p.last) continue;
    jugadores.push(p);
  }
  const coach = (texto.match(/head_coach\s*=\s*\n?\*?\s*\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/) || []);
  return { jugadores, entrenador: coach[2] || coach[1] || "" };
}

const equipos = Object.keys(ABREV);
const plantillas = {};
for (const grupo of trozos(equipos, 30)) {
  const j = await api(`https://en.wikipedia.org/w/api.php?action=query&format=json&prop=revisions&rvprop=content|timestamp&rvslots=main&titles=${encodeURIComponent(grupo.map((e) => `Template:${e} roster`).join("|"))}`);
  for (const p of Object.values(j.query.pages)) {
    const equipo = p.title.replace(/^Template:/, "").replace(/ roster$/, "");
    if (p.missing !== undefined || !p.revisions) { console.log(`⚠ Sin plantilla: ${equipo}`); continue; }
    plantillas[equipo] = { ...parsearPlantilla(p.revisions[0].slots.main["*"]), revisada: p.revisions[0].timestamp };
  }
}

// ---- 2. Artículo de Wikipedia y elemento de Wikidata de cada jugador ----
const jugadores = [];
for (const [equipo, pl] of Object.entries(plantillas)) {
  for (const p of pl.jugadores) {
    const nombre = `${p.first || ""} ${p.last || ""}`.trim();
    const articulo = p.link || (p.dab ? `${nombre} (${p.dab})` : nombre);
    const pos = String(p.pos || "").toUpperCase().replace(/[^A-Z]/g, "");
    const ft = Number(p.ft), inch = Number(p.in), lbs = Number(p.lbs);
    jugadores.push({
      nombre, articulo, equipo, abr: ABREV[equipo],
      dorsal: p.num || "",
      pos, posicion: POSICION[pos] || "",
      altura: ft ? Math.round((ft * 30.48 + (inch || 0) * 2.54)) / 100 : null,
      peso: lbs ? Math.round(lbs * 0.4536) : null,
      nacimiento: /^\d{4}-\d{2}-\d{2}$/.test(p.dob || "") ? p.dob : null,
      procedencia: sinMarcado(p.college || p.school || ""),
      procedencia_pais: sinMarcado(p.from || ""),
      lesionado: /^(y|yes|si)$/i.test(p.inj || ""),
      doble_via: /TW/i.test(p.note || ""),
      g_league: /GL/i.test(p.note || ""),
    });
  }
}
console.log(`${Object.keys(plantillas).length} plantillas, ${jugadores.length} jugadores.`);

const qid = {}; // título → Q
for (const grupo of trozos([...new Set(jugadores.map((x) => x.articulo))], 50)) {
  const j = await api(`https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageprops&ppprop=wikibase_item&titles=${encodeURIComponent(grupo.join("|"))}`);
  const destino = {};
  for (const r of [...(j.query.normalized || []), ...(j.query.redirects || [])]) destino[r.from] = r.to;
  const porTitulo = {};
  for (const p of Object.values(j.query.pages || {})) if (p.pageprops && p.pageprops.wikibase_item) porTitulo[p.title] = { q: p.pageprops.wikibase_item, titulo: p.title };
  for (const t of grupo) { let x = t; for (let k = 0; k < 3 && destino[x]; k++) x = destino[x]; if (porTitulo[x]) qid[t] = porTitulo[x]; }
  await espera(300);
}

// ---- 3. Datos de Wikidata ----
const entidades = {};
const qs = [...new Set(Object.values(qid).map((x) => x.q))];
for (const grupo of trozos(qs, 50)) {
  const j = await api(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims|sitelinks&sitefilter=eswiki|enwiki&ids=${grupo.join("|")}`);
  Object.assign(entidades, j.entities || {});
  await espera(300);
}
const valor = (e, prop) => ((e && e.claims && e.claims[prop]) || []).filter((c) => c.rank !== "deprecated").map((c) => c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value).filter(Boolean);
const etiquetasQ = new Set();
for (const e of Object.values(entidades)) for (const prop of ["P1532", "P27", "P19"]) valor(e, prop).forEach((v) => v.id && etiquetasQ.add(v.id));
const etiquetas = {};
for (const grupo of trozos([...etiquetasQ], 50)) {
  const j = await api(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=labels|claims&languages=es|en&ids=${grupo.join("|")}`);
  for (const [id, e] of Object.entries(j.entities || {})) {
    const lugar = (e.labels.es || e.labels.en || {}).value || "";
    const pais = valor(e, "P17")[0];
    etiquetas[id] = { nombre: lugar, pais: pais && pais.id };
  }
  await espera(300);
}
// Nombres de los países de los lugares de nacimiento
const faltan = [...new Set(Object.values(etiquetas).map((x) => x.pais).filter((p) => p && !etiquetas[p]))];
for (const grupo of trozos(faltan, 50)) {
  const j = await api(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=labels&languages=es|en&ids=${grupo.join("|")}`);
  for (const [id, e] of Object.entries(j.entities || {})) etiquetas[id] = { nombre: ((e.labels.es || e.labels.en || {}).value) || "" };
}

// ---- 4. Fotos con licencia libre (Commons) ----
const archivos = {};
for (const x of jugadores) { const e = qid[x.articulo] && entidades[qid[x.articulo].q]; const img = valor(e, "P18")[0]; if (img) archivos[x.articulo] = img; }
const fotos = {};
const LIBRE = /^(CC0|Public domain|PD|CC BY(-SA)? \d(\.\d)?|CC BY(-SA)?)/i;
for (const grupo of trozos([...new Set(Object.values(archivos))], 40)) {
  const j = await api(`https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=480&iiextmetadatafilter=LicenseShortName|LicenseUrl|Artist|Restrictions&titles=${encodeURIComponent(grupo.map((f) => "File:" + f).join("|"))}`);
  const norm = {}; for (const n of j.query.normalized || []) norm[n.to] = n.from;
  for (const p of Object.values(j.query.pages || {})) {
    const ii = p.imageinfo && p.imageinfo[0]; if (!ii) continue;
    const m = ii.extmetadata || {};
    const lic = ((m.LicenseShortName || {}).value || "").trim();
    if (!LIBRE.test(lic) || /NC|ND/i.test(lic)) continue;
    const autor = sinMarcado((m.Artist || {}).value || "").replace(/\s+/g, " ").slice(0, 80) || "Autor desconocido";
    const original = (norm[p.title] || p.title).replace(/^File:/, "");
    fotos[original] = { url: String(ii.thumburl || ii.url).split("?")[0], origen: ii.descriptionurl, autor, licencia: lic, licencia_url: (m.LicenseUrl || {}).value || "" };
  }
  await espera(300);
}

// ---- 5. Unir todo ----
const vistos = {};
for (const x of jugadores) {
  const w = qid[x.articulo]; const e = w && entidades[w.q];
  const deporte = valor(e, "P1532").map((v) => etiquetas[v.id] && etiquetas[v.id].nombre).filter(Boolean);
  const nacion = valor(e, "P27").map((v) => etiquetas[v.id] && etiquetas[v.id].nombre).filter(Boolean);
  const lugar = valor(e, "P19")[0];
  const lug = lugar && etiquetas[lugar.id];
  x.pais = deporte[0] || nacion[0] || x.procedencia_pais || "";
  x.paises = [...new Set([...deporte, ...nacion])];
  x.lugar = lug ? [lug.nombre, lug.pais && etiquetas[lug.pais] ? etiquetas[lug.pais].nombre : ""].filter(Boolean).join(", ") : "";
  x.wikipedia = w ? `https://en.wikipedia.org/wiki/${encodeURIComponent(w.titulo.replace(/ /g, "_"))}` : "";
  x.wikipedia_es = e && e.sitelinks && e.sitelinks.eswiki ? `https://es.wikipedia.org/wiki/${encodeURIComponent(e.sitelinks.eswiki.title.replace(/ /g, "_"))}` : "";
  x.wikidata = w ? w.q : "";
  x.foto = archivos[x.articulo] && fotos[archivos[x.articulo]] ? fotos[archivos[x.articulo]] : null;
  let s = slug(x.nombre); if (vistos[s]) s = `${s}-${slug(x.abr)}`; vistos[s] = true; x.slug = s;
  delete x.procedencia_pais;
}

const salida = {
  _nota: "Generado por scripts/plantillas.mjs a partir de las plantillas de Wikipedia, Wikidata y Wikimedia Commons. No editar a mano.",
  actualizado: new Date().toISOString(),
  equipos: Object.fromEntries(Object.entries(plantillas).map(([eq, pl]) => [ABREV[eq], { equipo: eq, entrenador: pl.entrenador, revisada: pl.revisada, fuente: `https://en.wikipedia.org/wiki/Template:${encodeURIComponent((eq + " roster").replace(/ /g, "_"))}` }])),
  jugadores: jugadores.sort((a, b) => a.equipo.localeCompare(b.equipo) || a.nombre.localeCompare(b.nombre)),
};
// Comprobación: si salen muy pocos jugadores, algo ha fallado y no se sobrescribe lo anterior
if (salida.jugadores.length < 300) { console.log(`Solo ${salida.jugadores.length} jugadores: no se guarda.`); process.exit(1); }
fs.writeFileSync(SALIDA, JSON.stringify(salida, null, 1) + "\n");
const conFoto = salida.jugadores.filter((x) => x.foto).length, conPais = salida.jugadores.filter((x) => x.pais).length;
console.log(`Guardado: ${salida.jugadores.length} jugadores, ${conFoto} con foto libre, ${conPais} con país.`);
