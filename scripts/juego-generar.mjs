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
  if (process.env.DEPURAR) { console.log("FILAS " + filas.length); [5, 6, 50, 200].forEach((k) => console.log("=== FILA " + k + "\n" + (filas[k] || "").slice(0, 700))); }
  const out = [];
  for (const fila of filas) {
    const enlace = fila.match(/\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/);
    if (!enlace) continue;
    // Celdas de la fila
    const celdas = fila.split(/\n[|!]|\|\|/).map((c) => c.replace(/^[^|\n]*?\|(?!\|)/, (m) => (m.includes("[[") ? m : "")).trim());
    const num = celdas.map((c) => c.replace(/<[^>]+>|\{\{[^}]*\}\}/g, "").trim()).find((c) => /^\d{1,2}$/.test(c));
    const anos = (fila.match(/\b(19[5-9]\d|20[0-2]\d)\b/g) || []).map(Number).filter((a) => a >= 1951 && a <= 2026);
    if (!num || !anos.length) continue;
    out.push({ articulo: enlace[1].trim(), nombre: (enlace[2] || enlace[1]).trim(), veces: Number(num), primero: Math.min(...anos), ultimo: Math.max(...anos) });
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

// ---------- 4. Pistas ----------
const POSICIONES = [
  [/point guard|base/i, "base"], [/shooting guard|escolta/i, "escolta"], [/small forward|alero$|^alero/i, "alero"],
  [/power forward|ala-p[ií]vot/i, "ala-pívot"], [/center|p[ií]vot/i, "pívot"], [/guard/i, "escolta"], [/forward|alero/i, "alero"],
];
function posicion(set) {
  const etiquetas = [...set].filter((p) => !/^Q\d+$/.test(p));
  const halladas = [];
  for (const e of etiquetas) for (const [re, es] of POSICIONES) if (re.test(e)) { if (!halladas.includes(es)) halladas.push(es); break; }
  return halladas.slice(0, 2);
}
const lista = (xs) => (xs.length <= 1 ? xs.join("") : xs.slice(0, -1).join(", ") + " y " + xs[xs.length - 1]);

function construir(j, d) {
  if (!d || !d.nacimiento || !d.pais || !d.lugar) return null;
  const pos = posicion(d.posiciones);
  if (!pos.length) return null;
  const eq = d.equipos.filter((e) => e.equipo && !/^Q\d+$/.test(e.equipo) && e.inicio);
  if (!eq.length) return null;
  eq.sort((a, b) => a.inicio - b.inicio);
  // Equipos sin repetir, en orden de llegada
  const nombres = [];
  eq.forEach((e) => { if (!nombres.includes(e.equipo)) nombres.push(e.equipo); });
  // Equipo principal: más temporadas acumuladas
  const anosPor = {};
  eq.forEach((e) => { anosPor[e.equipo] = (anosPor[e.equipo] || 0) + Math.max(1, (e.fin || 2026) - e.inicio); });
  const principal = Object.entries(anosPor).sort((a, b) => b[1] - a[1])[0][0];
  const debut = eq[0];
  const activo = eq.some((e) => !e.fin) && d.nacimiento >= 1980;
  const iniciales = j.nombre.split(/\s+/).filter((p) => !/^(jr\.?|sr\.?|ii|iii|iv)$/i.test(p)).map((p) => p[0].toUpperCase() + ".").join(" ");
  const pais = d.pais === "Estados Unidos" || d.pais === "United States" ? "Estados Unidos" : d.pais;
  const lugar = d.lugar === d.pais ? pais : `${d.lugar} (${pais})`;
  const pistas = [
    `Jugador nacido en ${d.nacimiento} que jugaba de ${lista(pos)}.`,
    `Fue elegido All-Star ${j.veces === 1 ? "una vez" : j.veces + " veces"}${j.veces > 1 ? `, entre ${j.primero} y ${j.ultimo}` : `, en ${j.primero}`}.`,
    `Nació en ${lugar}.`,
    `Debutó en la NBA en ${debut.inicio} con ${debut.equipo}.`,
    `${nombres.length === 1 ? `Toda su carrera en la NBA la ${activo ? "ha pasado" : "pasó"} en ${principal}` : `Jugó en ${lista(nombres)}`}. Sus iniciales: ${iniciales}`,
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
const datos = await datosWikidata([...new Set(conQ.map((e) => mapa[e.articulo]))]);
const jugadores = [], descartados = [];
for (const e of conQ) {
  const r = construir(e, datos[mapa[e.articulo]]);
  if (r) jugadores.push(r); else descartados.push(e.nombre);
}
// Nombres repetidos: se descartan los dos para evitar confusiones
const cuenta = {};
jugadores.forEach((j) => (cuenta[sinAcentos(j.nombre).toLowerCase()] = (cuenta[sinAcentos(j.nombre).toLowerCase()] || 0) + 1));
const finales = jugadores.filter((j) => cuenta[sinAcentos(j.nombre).toLowerCase()] === 1).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
console.log(`Jugadores con las cinco pistas completas: ${finales.length}. Descartados por datos incompletos: ${descartados.length}`);
console.log("Descartados: " + descartados.join(", "));
if (finales.length < 300) throw new Error("Menos de 300 jugadores válidos; no se toca juego.json");
fs.writeFileSync("src/_data/juego.json", JSON.stringify({
  _nota: "Generado por scripts/juego-generar.mjs a partir de Wikipedia (All-Stars) y Wikidata. No editar a mano.",
  generado: new Date().toISOString().slice(0, 10),
  jugadores: finales,
}, null, 1) + "\n");
// Muestra para revisar
for (const j of finales.filter((_, i) => i % 40 === 0)) console.log("\n" + j.nombre + "\n  - " + j.pistas.join("\n  - "));
