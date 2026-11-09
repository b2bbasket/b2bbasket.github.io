// Descarga fotos de Wikimedia Commons comprobando antes su licencia.
// Lee src/_data/fotos-lista.json y escribe src/_data/fotos.json con autor, licencia y enlace de cada foto.
// Solo acepta licencias libres que permiten uso comercial y modificación: CC0, dominio público, CC BY y CC BY-SA.
import fs from "node:fs";
import path from "node:path";

const UA = `BackToBackMedioNBA/1.0 (https://github.com/${process.env.GITHUB_REPOSITORY || "hugoamigo2006-collab/medio-nba"})`;
const lista = JSON.parse(fs.readFileSync("src/_data/fotos-lista.json", "utf8")).fotos;
const salida = "src/_data/fotos.json";
const previas = fs.existsSync(salida) ? JSON.parse(fs.readFileSync(salida, "utf8")) : {};
const LIBRE = /^(cc0|public domain|pd|cc by(-sa)? \d(\.\d)?|cc by(-sa)?$|attribution)/i;
const NO_LIBRE = /\b(nc|nd|non-?commercial|no ?deriv)/i;
const texto = (html) => String(html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function info(archivo) {
  const u = new URL("https://commons.wikimedia.org/w/api.php");
  Object.entries({ action: "query", format: "json", prop: "imageinfo", iiprop: "url|extmetadata|size", iiurlwidth: "1600", titles: "File:" + archivo })
    .forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error("API " + r.status);
  const p = Object.values((await r.json()).query.pages)[0];
  if (!p.imageinfo) return null;
  const ii = p.imageinfo[0], m = ii.extmetadata || {};
  return {
    archivo,
    descarga: ii.thumburl || ii.url,
    origen: ii.descriptionurl,
    autor: texto(m.Artist?.value) || "Autor desconocido",
    licencia: texto(m.LicenseShortName?.value),
    licencia_url: m.LicenseUrl?.value || "",
    restricciones: texto(m.Restrictions?.value),
    ancho: ii.width || 0,
  };
}

// Limpia el crédito: quita «copyright», corchetes y repeticiones («Unknown author Unknown author»)
function limpiarAutor(a) {
  let t = a.replace(/\[|\]/g, "").replace(/copyright( held)?( by)?/gi, "").replace(/\s+/g, " ").trim();
  const mitad = t.split(" ");
  if (mitad.length % 2 === 0 && mitad.slice(0, mitad.length / 2).join(" ") === mitad.slice(mitad.length / 2).join(" ")) t = mitad.slice(0, mitad.length / 2).join(" ");
  if (/^unknown( author)?$/i.test(t)) t = "Autor desconocido";
  return t || "Autor desconocido";
}
const MINIMO = 700; // ancho mínimo preferido en píxeles

const resultado = {};
let errores = 0;
for (const f of lista) {
  let elegida = null, reserva = null;
  for (const c of f.candidatos) {
    try {
      const d = await info(c);
      if (!d) { console.log(`✗ ${f.id}: «${c}» no existe en Commons`); continue; }
      if (!LIBRE.test(d.licencia) || NO_LIBRE.test(d.licencia)) { console.log(`✗ ${f.id}: «${c}» tiene licencia «${d.licencia}», no válida`); continue; }
      if (d.ancho < MINIMO) { console.log(`· ${f.id}: «${c}» solo mide ${d.ancho} px, se guarda como reserva`); if (!reserva || d.ancho > reserva.ancho) reserva = d; continue; }
      elegida = d; break;
    } catch (e) { console.log(`✗ ${f.id}: «${c}» error ${e.message}`); }
    await espera(500);
  }
  if (!elegida && reserva) elegida = reserva;
  if (!elegida) { errores++; console.log(`!! ${f.id}: ningún candidato válido`); if (previas[f.id]) resultado[f.id] = previas[f.id]; continue; }
  const r = await fetch(elegida.descarga, { headers: { "User-Agent": UA } });
  if (!r.ok) { errores++; console.log(`!! ${f.id}: descarga fallida (${r.status})`); continue; }
  fs.mkdirSync(path.dirname(f.destino), { recursive: true });
  fs.writeFileSync(f.destino, Buffer.from(await r.arrayBuffer()));
  const { descarga, ancho, ...credito } = elegida;
  credito.autor = f.autor_lipofsky ? "Steve Lipofsky (Basketballphoto.com)" : limpiarAutor(credito.autor);
  resultado[f.id] = { src: "/" + f.destino.replace(/^src\//, ""), alt: f.alt, ...credito };
  console.log(`✓ ${f.id}: «${elegida.archivo}» · ${elegida.autor} · ${elegida.licencia}`);
  await espera(1000);
}
fs.writeFileSync(salida, JSON.stringify(resultado, null, 1) + "\n");
console.log(`\n${Object.keys(resultado).length} fotos listas, ${errores} sin foto válida.`);
