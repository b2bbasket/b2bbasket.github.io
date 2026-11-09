// Busca en Wikimedia Commons una foto con licencia libre del jugador indicado en cada artículo
// (campo «jugador_foto») y la descarga con su crédito en src/_data/fotos_jugadores.json.
// Si el jugador ya tiene foto, no la vuelve a buscar: la misma foto sirve para todos sus artículos.
import fs from "node:fs";

const UA = "BackToBackMedioNBA/1.0 (https://github.com/hugoamigo2006-collab/medio-nba)";
const API = "https://commons.wikimedia.org/w/api.php";
const SALIDA = "src/_data/fotos_jugadores.json";
const CARPETA = "src/img/jugadores";
const LIBRE = /^(cc0|cc by(-sa)? \d(\.\d)?|cc by(-sa)?$)/i; // solo Creative Commons, sin dudas de dominio público
const NO_LIBRE = /\b(nc|nd|non-?commercial|no ?deriv)/i;
const MINIMO = 700;

export const slug = (t) => String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const texto = (h) => String(h || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(params) {
  const u = new URL(API);
  Object.entries({ format: "json", formatversion: "2", ...params }).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error("Commons respondió " + r.status);
  return r.json();
}

// 1. Nombres de jugador de todos los artículos
function jugadoresPedidos() {
  const nombres = new Set();
  for (const dir of ["src/articulos", "src/previas"]) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".md"))) {
      const fm = fs.readFileSync(`${dir}/${f}`, "utf8").split(/^---\s*$/m)[1] || "";
      const m = fm.match(/^jugador_foto:\s*["']?(.+?)["']?\s*$/m);
      if (m && m[1].trim()) nombres.add(m[1].trim());
    }
  }
  return [...nombres];
}

// 2. Archivos candidatos: primero la categoría del jugador en Commons; si no, búsqueda por nombre
async function candidatos(nombre) {
  const titulos = new Set();
  const cats = await api({ action: "query", list: "search", srnamespace: "14", srsearch: nombre, srlimit: "5" });
  const objetivo = slug(nombre);
  const cat = (cats.query?.search || []).find((c) => slug(c.title.replace(/^Category:/, "")) === objetivo);
  if (cat) {
    const m = await api({ action: "query", list: "categorymembers", cmtitle: cat.title, cmtype: "file", cmlimit: "100" });
    (m.query?.categorymembers || []).forEach((x) => titulos.add(x.title));
  }
  if (titulos.size < 5) {
    const b = await api({ action: "query", list: "search", srnamespace: "6", srsearch: `"${nombre}"`, srlimit: "30" });
    (b.query?.search || []).forEach((x) => titulos.add(x.title));
  }
  return { categoria: cat?.title || null, titulos: [...titulos] };
}

// 3. Información y licencia de cada archivo (de 50 en 50)
async function detalles(titulos) {
  const out = [];
  for (let i = 0; i < titulos.length; i += 50) {
    const d = await api({ action: "query", prop: "imageinfo", iiprop: "url|extmetadata|size|mime", iiurlwidth: "1280", titles: titulos.slice(i, i + 50).join("|") });
    for (const p of d.query?.pages || []) {
      const ii = p.imageinfo?.[0];
      if (!ii) continue;
      const m = ii.extmetadata || {};
      out.push({
        archivo: p.title.replace(/^File:/, ""), mime: ii.mime, ancho: ii.width, alto: ii.height,
        descarga: ii.thumburl || ii.url, origen: ii.descriptionurl,
        autor: texto(m.Artist?.value) || "Autor desconocido",
        licencia: texto(m.LicenseShortName?.value), licencia_url: m.LicenseUrl?.value || "",
        fecha: texto(m.DateTimeOriginal?.value || m.DateTime?.value),
      });
    }
    await espera(500);
  }
  return out;
}

// 4. Elegir la mejor: licencia libre, jpg, tamaño suficiente, una sola persona, la más reciente
function elegir(nombre, lista) {
  const apellido = slug(nombre.split(/\s+/).slice(-1)[0]);
  const validas = lista.filter((f) =>
    f.mime === "image/jpeg" && LIBRE.test(f.licencia) && !NO_LIBRE.test(f.licencia) &&
    !/\b(and|y|vs\.?|with|con)\b|&/i.test(f.archivo) && slug(f.archivo).includes(apellido));
  const puntua = (f) => (f.ancho >= MINIMO ? 1e6 : 0) + (parseInt((f.fecha.match(/(19|20)\d\d/) || ["0"])[0], 10) * 100) + (f.alto >= f.ancho ? 50 : 0);
  return validas.sort((a, b) => puntua(b) - puntua(a))[0] || null;
}

const limpiar = (a) => a.replace(/\[|\]/g, "").replace(/copyright( held)?( by)?/gi, "").replace(/\s+/g, " ").trim() || "Autor desconocido";

const guardadas = fs.existsSync(SALIDA) ? JSON.parse(fs.readFileSync(SALIDA, "utf8")) : {};
let cambios = 0;
for (const nombre of jugadoresPedidos()) {
  const id = slug(nombre);
  if (guardadas[id] && fs.existsSync("src" + guardadas[id].src)) { console.log(`= ${nombre}: ya tenía foto`); continue; }
  try {
    const { categoria, titulos } = await candidatos(nombre);
    const f = elegir(nombre, await detalles(titulos));
    if (!f) { console.log(`✗ ${nombre}: no hay ninguna foto con licencia libre (${titulos.length} revisadas${categoria ? ", " + categoria : ""})`); continue; }
    const r = await fetch(f.descarga, { headers: { "User-Agent": UA } });
    if (!r.ok) throw new Error("descarga " + r.status);
    fs.mkdirSync(CARPETA, { recursive: true });
    fs.writeFileSync(`${CARPETA}/${id}.jpg`, Buffer.from(await r.arrayBuffer()));
    guardadas[id] = { src: `/img/jugadores/${id}.jpg`, alt: nombre, autor: limpiar(f.autor), licencia: f.licencia, licencia_url: f.licencia_url, origen: f.origen, archivo: f.archivo };
    cambios++;
    console.log(`✓ ${nombre}: «${f.archivo}» · ${f.autor} · ${f.licencia}`);
  } catch (e) { console.log(`!! ${nombre}: ${e.message}`); }
  await espera(1000);
}
fs.writeFileSync(SALIDA, JSON.stringify(guardadas, null, 1) + "\n");
console.log(`\n${cambios} fotos nuevas.`);
