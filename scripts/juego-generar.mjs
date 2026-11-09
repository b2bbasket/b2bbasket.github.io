// Genera src/_data/juego.json con varios cientos de jugadores para «Adivina el jugador».
//
// Fuentes (nada se escribe a mano):
//  1. Wikipedia, «List of NBA All-Stars»: quiénes entran (todos los jugadores elegidos alguna vez
//     para el All-Star), cuántas veces y en qué años.
//  2. Wikidata (la base de datos de Wikipedia): posición, fecha y lugar de nacimiento y equipos de
//     la NBA con sus años.
// Un jugador solo entra si tiene todos los datos necesarios para sus cinco pistas.
import fs from "node:fs";

const UA = `BackToBackMedioNBA/1.0 (https://github.com/${process.env.GITHUB_REPOSITORY || "hugoamigo2006-collab/medio-nba"})`;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const sinAcentos = (t) => String(t).normalize("NFD").replace(/[̀-ͯ]/g, "");

async function json(url, opciones = {}) {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(url, { ...opciones, headers: { "User-Agent": UA, Accept: "application/json", ...(opciones.headers || {}) } });
    if (r.ok) return r.json();
    console.log(`  reintento ${i + 1} (${r.status})`);
    await espera(5000 * (i + 1));
  }
  throw new Error("No se pudo leer " + url);
}

// ---------- 1. Lista de All-Stars (Wikipedia) ----------
async function allStars() {
  const u = "https://en.wikipedia.org/w/api.php?action=parse&page=List_of_NBA_All-Stars&prop=wikitext&format=json&formatversion=2";
  const wt = (await json(u)).parse.wikitext;
  const filas = wt.split(/\n\|-/);
  const out = [];
  for (const fila of filas) {
    let articulo = null, nombre = null;
    const sn = fila.match(/\{\{\s*sortname\s*\|([^}]+)\}\}/i);
    if (sn) {
      const ps = sn[1].split("|").map((x) => x.trim());
      const pos = ps.filter((x) => !x.includes("="));
      const dab = (ps.find((x) => x.startsWith("dab=")) || "").slice(4);
      nombre = `${pos[0]} ${pos[1]}`.trim();
      articulo = pos[2] || (dab ? `${nombre} (${dab})` : nombre);
    } else {
      const enlace = fila.match(/^[^\n]*?\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/m);
      if (!enlace || /All-Star Game/.test(enlace[1])) continue;
      articulo = enlace[1].trim(); nombre = (enlace[2] || enlace[1]).trim();
    }
    const num = fila.match(/\|\|\s*(?:align=["']?center["']?\s*\|)?\s*(\d{1,2})\s*\|\|/);
    const anos = [...fila.matchAll(/\[\[(\d{4}) NBA All-Star Game/g)].map((m) => Number(m[1]));
    if (!num || !anos.length) continue;
    out.push({ articulo, nombre, veces: Number(num[1]), primero: Math.min(...anos), ultimo: Math.max(...anos) });
  }
  // Quitar duplicados por artículo
  const vistos = new Map();
  out.forEach((j) => { if (!vistos.has(j.articulo)) vistos.set(j.articulo, j); });
  return [...vistos.values()];
}

// ---------- 2. Identificadores de Wikidata ----------
async function qids(articulos) {
  const mapa = {};
  for (let i = 0; i < articulos.length; i += 50) {
    const lote = articulos.slice(i, i + 50);
    const u = "https://en.wikipedia.org/w/api.php?action=query&prop=pageprops&ppprop=wikibase_item&redirects=1&format=json&formatversion=2&titles=" + encodeURIComponent(lote.join("|"));
    const d = await json(u);
    const redir = {};
    (d.query.redirects || []).forEach((r) => (redir[r.to] = r.from));
    (d.query.normalized || []).forEach((r) => (redir[r.to] = redir[r.to] || r.from));
    for (const p of d.query.pages || []) {
      const q = p.pageprops?.wikibase_item;
      if (!q) continue;
      const original = redir[p.title] ? (redir[redir[p.title]] || redir[p.title]) : p.title;
      mapa[original] = q;
      mapa[p.title] = q;
    }
    await espera(300);
  }
  return mapa;
}

// ---------- 3. Datos de Wikidata ----------
async function sparql(consulta) {
  const r = await json("https://query.wikidata.org/sparql", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/sparql-results+json" },
    body: "query=" + encodeURIComponent(consulta),
  });
  return r.results.bindings;
}
const val = (b, k) => (b[k] ? b[k].value : null);

async function datosWikidata(lista) {
  const datos = {};
  for (let i = 0; i < lista.length; i += 80) {
    const valores = lista.slice(i, i + 80).map((q) => "wd:" + q).join(" ");
    // Equipos de la NBA (P54 con liga NBA, Q155223) y años
    const equipos = await sparql(`SELECT ?p ?equipoLabel ?inicio ?fin WHERE {
      VALUES ?p { ${valores} }
      ?p p:P54 ?st . ?st ps:P54 ?equipo . ?equipo wdt:P118 wd:Q155223 .
      OPTIONAL { ?st pq:P580 ?inicio } OPTIONAL { ?st pq:P582 ?fin }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
    }`);
    // Posición, nacimiento y lugar
    const basicos = await sparql(`SELECT ?p ?posLabel ?nac ?lugarLabel ?paisLabel WHERE {
      VALUES ?p { ${valores} }
      OPTIONAL { ?p wdt:P413 ?pos . }
      OPTIONAL { ?p wdt:P569 ?nac . }
      OPTIONAL { ?p wdt:P19 ?lugar . OPTIONAL { ?lugar wdt:P17 ?pais . } }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "es,en". }
    }`);
    for (const b of equipos) {
      const q = val(b, "p").split("/").pop();
      const d = (datos[q] = datos[q] || { equipos: [], posiciones: new Set() });
      const ini = val(b, "inicio"), fin = val(b, "fin");
      d.equipos.push({ equipo: val(b, "equipoLabel"), inicio: ini ? Number(ini.slice(0, 4)) : null, fin: fin ? Number(fin.slice(0, 4)) : null });
    }
    for (const b of basicos) {
      const q = val(b, "p").split("/").pop();
      const d = (datos[q] = datos[q] || { equipos: [], posiciones: new Set() });
      if (val(b, "posLabel")) d.posiciones.add(val(b, "posLabel"));
      if (val(b, "nac") && !d.nacimiento) d.nacimiento = Number(val(b, "nac").slice(0, 4));
      if (val(b, "lugarLabel") && !d.lugar) { d.lugar = val(b, "lugarLabel"); d.pais = val(b, "paisLabel"); }
    }
    console.log(`  Wikidata: ${Math.min(i + 80, lista.length)} / ${lista.length}`);
    await espera(1500);
  }
  return datos;
}

// ---------- 3b. Ficha (infobox) de Wikipedia: equipos con años, draft y anillos ----------
const EQUIPOS_NBA = new Set([
  "Atlanta Hawks","Boston Celtics","Brooklyn Nets","Charlotte Hornets","Chicago Bulls","Cleveland Cavaliers","Dallas Mavericks","Denver Nuggets","Detroit Pistons","Golden State Warriors","Houston Rockets","Indiana Pacers","Los Angeles Clippers","Los Angeles Lakers","Memphis Grizzlies","Miami Heat","Milwaukee Bucks","Minnesota Timberwolves","New Orleans Pelicans","New York Knicks","Oklahoma City Thunder","Orlando Magic","Philadelphia 76ers","Phoenix Suns","Portland Trail Blazers","Sacramento Kings","San Antonio Spurs","Toronto Raptors","Utah Jazz","Washington Wizards",
  "Seattle SuperSonics","New Jersey Nets","New York Nets","Vancouver Grizzlies","Charlotte Bobcats","New Orleans Hornets","New Orleans/Oklahoma City Hornets","Washington Bullets","Baltimore Bullets","Capital Bullets","Kansas City Kings","Kansas City-Omaha Kings","Kansas City–Omaha Kings","Cincinnati Royals","Rochester Royals","Minneapolis Lakers","San Diego Clippers","Buffalo Braves","San Diego Rockets","Philadelphia Warriors","San Francisco Warriors","Syracuse Nationals","Fort Wayne Pistons","St. Louis Hawks","Milwaukee Hawks","Tri-Cities Blackhawks","Chicago Zephyrs","Chicago Packers","New Orleans Jazz","Baltimore Bullets (1944–1954)","Indianapolis Olympians","Washington Capitols","Chicago Stags","Anderson Packers","Waterloo Hawks","Sheboygan Red Skins","Denver Nuggets (1948–1950)","St. Louis Bombers","Providence Steamrollers","Toronto Huskies","Pittsburgh Ironmen","Detroit Falcons","Cleveland Rebels","Indianapolis Jets"
]);
const desenlazar = (t) => String(t || "")
  .replace(/<ref[^>]*\/>|<ref[^>]*>[\s\S]*?<\/ref>/g, "")
  .replace(/\{\{[^{}]*\}\}/g, (m) => { const y = m.match(/\b(19|20)\d\d\b/); return y ? y[0] : ""; })
  .replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, "$1")
  .replace(/'{2,3}|<[^>]+>/g, "").trim();
function infobox(wt) {
  const i = wt.search(/\{\{\s*Infobox basketball biography/i);
  if (i < 0) return null;
  let n = 0, k = i;
  for (; k < wt.length; k++) { if (wt.startsWith("{{", k)) { n++; k++; } else if (wt.startsWith("}}", k)) { n--; k++; if (n === 0) break; } }
  const cuerpo = wt.slice(i, k + 1);
  const campos = {};
  let nivel = 0, actual = "";
  const partes = [];
  for (let c = 0; c < cuerpo.length; c++) {
    const dos = cuerpo.slice(c, c + 2);
    if (dos === "{{" || dos === "[[") { nivel++; actual += dos; c++; continue; }
    if (dos === "}}" || dos === "]]") { nivel--; actual += dos; c++; continue; }
    if (cuerpo[c] === "|" && nivel === 1) { partes.push(actual); actual = ""; continue; }
    actual += cuerpo[c];
  }
  partes.push(actual);
  for (const p of partes.slice(1)) { const m = p.match(/^\s*([\w ]+?)\s*=([\s\S]*)$/); if (m) campos[m[1].trim()] = m[2].trim(); }
  return campos;
}
const DESCONOCIDOS = {};
function carrera(c) {
  const equipos = [];
  for (let n = 1; n <= 40; n++) {
    const t = c["team" + n]; if (!t) continue;
    const enlace = t.match(/\[\[([^\]|#]+)/);
    const nombre = enlace ? enlace[1].trim() : desenlazar(t);
    if (!EQUIPOS_NBA.has(nombre)) { DESCONOCIDOS[nombre] = (DESCONOCIDOS[nombre] || 0) + 1; continue; }
    const anos = (desenlazar(c["years" + n]).match(/\b(19|20)\d\d\b/g) || []).map(Number);
    if (!anos.length) return null;
    equipos.push({ equipo: nombre.replace(/ \(\d{4}–\d{4}\)$/, ""), inicio: anos[0] });
  }
  return equipos;
}
function draft(c) {
  const ano = (desenlazar(c.draft_year).match(/\b(19|20)\d\d\b/) || [])[0];
  const texto = (c.draft_year || "") + " " + (c.draft_round || "") + " " + (c.draft_pick || "");
  if (/undrafted/i.test(texto)) return { ano: ano ? Number(ano) : null, elegido: false };
  const pick = (desenlazar(c.draft_pick).match(/\d+/) || [])[0];
  if (!ano || !pick) return null;
  return { ano: Number(ano), elegido: true, numero: Number(pick) };
}
function anillos(c) {
  const h = String(c.highlights || "").split(/As (?:head |assistant )?coach|As executive/i)[0];
  const m = h.match(/(\d+)\s*×\s*\[\[[^\]]*NBA (?:champion|Finals)[^\]]*\]\]/i);
  if (m) return Number(m[1]);
  return /\[\[[^\]]*NBA champion[^\]]*\]\]/i.test(h) ? 1 : 0;
}
async function fichasWikipedia(articulos) {
  const out = {};
  for (let i = 0; i < articulos.length; i += 40) {
    const lote = articulos.slice(i, i + 40);
    const u = "https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&format=json&formatversion=2&titles=" + encodeURIComponent(lote.join("|"));
    const d = await json(u);
    const redir = {};
    (d.query.normalized || []).forEach((r) => (redir[r.to] = r.from));
    (d.query.redirects || []).forEach((r) => (redir[r.to] = redir[r.from] || r.from));
    for (const p of d.query.pages || []) {
      const wt = p.revisions?.[0]?.slots?.main?.content;
      if (!wt) continue;
      const c = infobox(wt);
      if (c) out[redir[p.title] || p.title] = c;
    }
    console.log(`  Fichas de Wikipedia: ${Math.min(i + 40, articulos.length)} / ${articulos.length}`);
    await espera(500);
  }
  return out;
}

// ---------- 4. Pistas ----------
const POSICIONES = [
  [/point guard|base/i, "base"], [/shooting guard|escolta/i, "escolta"], [/small forward|alero$|^alero/i, "alero"],
  [/power forward|ala-p[ií]vot/i, "ala-pívot"], [/^ala$|^forward$/i, "alero"], [/center|p[ií]vot/i, "pívot"], [/guard/i, "escolta"], [/forward|alero/i, "alero"],
];
function posicion(set) {
  const etiquetas = [...set].filter((p) => !/^Q\d+$/.test(p));
  const halladas = [];
  for (const e of etiquetas) for (const [re, es] of POSICIONES) if (re.test(e)) { if (!halladas.includes(es)) halladas.push(es); break; }
  return halladas.slice(0, 2);
}
const lista = (xs) => (xs.length <= 1 ? xs.join("") : xs.slice(0, -1).join(", ") + " y " + xs[xs.length - 1]);

const motivos = {};
const falta = (m, j) => { (motivos[m] = motivos[m] || []).push(j.nombre); return null; };
function construir(j, d, f) {
  if (!d) return falta("sin datos", j);
  if (!d.nacimiento) return falta("nacimiento", j);
  if (!d.pais || !d.lugar) return falta("lugar", j);
  const pos = posicion(d.posiciones);
  if (!f) return falta("sin ficha en Wikipedia", j);
  const eq = carrera(f);
  if (!eq) return falta("equipos sin años", j);
  if (!eq.length) return falta("sin equipos NBA en la ficha", j);
  const nombres = [];
  eq.forEach((e) => { if (!nombres.includes(e.equipo)) nombres.push(e.equipo); });
  const debut = eq.reduce((a, b) => (b.inicio < a.inicio ? b : a));
  const dr = draft(f);
  const titulos = anillos(f);
  const ultimosAnos = Object.keys(f).filter((k) => /^years\d+$/.test(k)).map((k) => f[k]).join(" ");
  const activo = /present/i.test(String(f.career_end || "") + " " + ultimosAnos);
  const iniciales = j.nombre.split(/\s+/).filter((p) => !/^(jr\.?|sr\.?|ii|iii|iv)$/i.test(p)).map((p) => p[0].toUpperCase() + ".").join(" ");
  const pais = d.pais === "Estados Unidos" || d.pais === "United States" ? "Estados Unidos" : d.pais;
  const lugar = d.lugar === d.pais ? pais : `${d.lugar} (${pais})`;
  const draftTxt = !dr ? `Debutó en la NBA en ${debut.inicio}.`
    : dr.elegido ? `Fue elegido con el número ${dr.numero} del draft de ${dr.ano} y debutó en la NBA en ${debut.inicio}.`
    : `No fue elegido en el draft y debutó en la NBA en ${debut.inicio}.`;
  const pistas = [
    pos.length ? `Jugador nacido en ${d.nacimiento} que ${activo ? "juega" : "jugaba"} de ${lista(pos)}.` : `Jugador nacido en ${d.nacimiento}.`,
    `Fue elegido All-Star ${j.veces === 1 ? "una vez" : j.veces + " veces"}${j.veces > 1 ? `, entre ${j.primero} y ${j.ultimo}` : `, en ${j.primero}`}.`,
    draftTxt,
    `Nació en ${lugar}.${titulos ? ` Ganó ${titulos === 1 ? "un anillo" : titulos + " anillos"} de la NBA como jugador.` : ""}`,
    `${nombres.length === 1 ? `Toda su carrera en la NBA la ${activo ? "ha pasado" : "pasó"} en los ${nombres[0]}` : `Equipos de la NBA, por orden: ${lista(nombres)}`}. Sus iniciales: ${iniciales}`,
  ];
  return { nombre: j.nombre, pistas, fuente: "https://en.wikipedia.org/wiki/" + encodeURIComponent(j.articulo.replace(/ /g, "_")) };
}

// ---------- Ejecución ----------
const estrellas = await allStars();
console.log(`All-Stars encontrados en Wikipedia: ${estrellas.length}`);
if (estrellas.length < 300) throw new Error("La lista de All-Stars parece incompleta; no se toca juego.json");
const mapa = await qids(estrellas.map((e) => e.articulo));
const conQ = estrellas.filter((e) => mapa[e.articulo]);
console.log(`Con ficha en Wikidata: ${conQ.length}`);
const fichas = await fichasWikipedia(conQ.map((e) => e.articulo));
const datos = await datosWikidata([...new Set(conQ.map((e) => mapa[e.articulo]))]);
const jugadores = [], descartados = [];
for (const e of conQ) {
  const r = construir(e, datos[mapa[e.articulo]], fichas[e.articulo]);
  if (r) jugadores.push(r); else descartados.push(e.nombre);
}
// Nombres repetidos: se descartan los dos para evitar confusiones
const cuenta = {};
jugadores.forEach((j) => (cuenta[sinAcentos(j.nombre).toLowerCase()] = (cuenta[sinAcentos(j.nombre).toLowerCase()] || 0) + 1));
const finales = jugadores.filter((j) => cuenta[sinAcentos(j.nombre).toLowerCase()] === 1).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
console.log(`Jugadores con las cinco pistas completas: ${finales.length}. Descartados por datos incompletos: ${descartados.length}`);
for (const [m, ns] of Object.entries(motivos).sort((a, b) => b[1].length - a[1].length)) console.log(`  ${m}: ${ns.length} (${ns.slice(0, 6).join(", ")})`);
if (finales.length < 300 && !process.env.DEPURAR) throw new Error("Menos de 300 jugadores válidos; no se toca juego.json");
fs.writeFileSync("src/_data/juego.json", JSON.stringify({
  _nota: "Generado por scripts/juego-generar.mjs a partir de Wikipedia (All-Stars) y Wikidata. No editar a mano.",
  generado: new Date().toISOString().slice(0, 10),
  jugadores: finales,
}, null, 1) + "\n");
console.log("Equipos no NBA más frecuentes (revisar que no falte ninguno): " + Object.entries(DESCONOCIDOS).sort((a, b) => b[1] - a[1]).slice(0, 60).map(([k, v]) => k + " " + v).join(" | "));
// Muestra para revisar
for (const j of finales.filter((j, i) => i % 45 === 0 || /^(Ray Allen|Steve Kerr|LeBron James|Pau Gasol|Kevin Garnett|Victor Wembanyama)$/.test(j.nombre))) console.log("\n" + j.nombre + "\n  - " + j.pistas.join("\n  - "));
