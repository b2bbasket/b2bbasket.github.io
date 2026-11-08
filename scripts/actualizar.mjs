// Actualiza los resultados de la jornada y la clasificación desde la API de BALLDONTLIE.
// Si algo falla, no toca los datos manuales y la web se publica igualmente.
import fs from "node:fs";
import { compactar, guardarCalendario } from "./calendario-comun.mjs";

const KEY = process.env.BALLDONTLIE_API_KEY;
const site = JSON.parse(fs.readFileSync("src/_data/site.json", "utf8"));
if (site.datos_automaticos === false) { console.log("Datos automáticos desactivados en site.json."); process.exit(0); }
if (!KEY) { console.log("Falta BALLDONTLIE_API_KEY: se mantienen los datos manuales."); process.exit(0); }

const NOMBRES = { ATL: "Atlanta Hawks", BOS: "Boston Celtics", BKN: "Brooklyn Nets", CHA: "Charlotte Hornets", CHI: "Chicago Bulls", CLE: "Cleveland Cavaliers", DAL: "Dallas Mavericks", DEN: "Denver Nuggets", DET: "Detroit Pistons", GSW: "Golden State Warriors", HOU: "Houston Rockets", IND: "Indiana Pacers", LAC: "Los Angeles Clippers", LAL: "Los Angeles Lakers", MEM: "Memphis Grizzlies", MIA: "Miami Heat", MIL: "Milwaukee Bucks", MIN: "Minnesota Timberwolves", NOP: "New Orleans Pelicans", NYK: "New York Knicks", OKC: "Oklahoma City Thunder", ORL: "Orlando Magic", PHI: "Philadelphia 76ers", PHX: "Phoenix Suns", POR: "Portland Trail Blazers", SAC: "Sacramento Kings", SAS: "San Antonio Spurs", TOR: "Toronto Raptors", UTA: "Utah Jazz", WAS: "Washington Wizards" };

const equipos = JSON.parse(fs.readFileSync("src/_data/equipos.json", "utf8"));
const conferencia = {};
for (const [conf, divs] of Object.entries(equipos))
  for (const lista of Object.values(divs)) for (const n of lista) conferencia[n] = conf.includes("Este") ? "este" : "oeste";

const ahora = new Date();
const temporada = ahora.getUTCMonth() >= 8 ? ahora.getUTCFullYear() : ahora.getUTCFullYear() - 1;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function pedir(url) {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(url, { headers: { Authorization: KEY } });
    if (r.status === 429) { await espera(15000); continue; }
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }
  throw new Error("Demasiados intentos (límite de peticiones)");
}

try {
  const juegos = [];
  let cursor = null;
  for (let pagina = 0; pagina < 40; pagina++) {
    const u = new URL("https://api.balldontlie.io/nba/v1/games");
    u.searchParams.append("seasons[]", String(temporada));
    u.searchParams.set("per_page", "100");
    if (cursor) u.searchParams.set("cursor", String(cursor));
    const j = await pedir(u.toString());
    juegos.push(...j.data);
    cursor = j.meta && j.meta.next_cursor;
    if (!cursor) break;
    await espera(13000); // límite de la cuenta gratuita: 5 peticiones por minuto
  }

  // Calendario completo de la temporada (aprovecha la misma descarga, sin peticiones extra)
  try { guardarCalendario(temporada, juegos.map(compactar)); }
  catch (e) { console.log("No se ha podido guardar el calendario:", e.message); }

  const finales = juegos.filter((g) => g.status === "Final" && NOMBRES[g.home_team?.abbreviation] && NOMBRES[g.visitor_team?.abbreviation]);
  if (!finales.length) { console.log("Sin partidos finalizados: se mantienen los datos actuales."); process.exit(0); }

  // Clasificación (solo temporada regular)
  const tabla = {};
  for (const n of Object.values(NOMBRES)) tabla[n] = { equipo: n, v: 0, d: 0 };
  for (const g of finales.filter((x) => !x.postseason)) {
    const l = NOMBRES[g.home_team.abbreviation], v = NOMBRES[g.visitor_team.abbreviation];
    if (g.home_team_score > g.visitor_team_score) { tabla[l].v++; tabla[v].d++; } else { tabla[v].v++; tabla[l].d++; }
  }
  const fechaLarga = (f) => new Intl.DateTimeFormat("es-ES", { dateStyle: "long", timeZone: "UTC" }).format(new Date(f + "T00:00:00Z"));
  const hoyTxt = new Intl.DateTimeFormat("es-ES", { dateStyle: "long", timeZone: "Europe/Madrid" }).format(ahora);
  const clasif = { actualizado: `${hoyTxt} (automático)`, este: [], oeste: [] };
  for (const t of Object.values(tabla)) clasif[conferencia[t.equipo]].push(t);
  fs.writeFileSync("src/_data/clasificacion.json", JSON.stringify(clasif, null, 1));

  // Resultados de la última jornada
  const ultima = finales.map((g) => String(g.date).slice(0, 10)).sort().pop();
  const delDia = finales.filter((g) => String(g.date).slice(0, 10) === ultima);
  const res = {
    fecha: `Jornada NBA del ${fechaLarga(ultima)}`,
    partidos: delDia.map((g) => ({
      local: NOMBRES[g.home_team.abbreviation], pl: g.home_team_score,
      visitante: NOMBRES[g.visitor_team.abbreviation], pv: g.visitor_team_score, fecha: ultima,
    })),
  };
  fs.writeFileSync("src/_data/resultados.json", JSON.stringify(res, null, 1));
  console.log(`OK: ${delDia.length} partidos del ${ultima} y clasificación actualizada.`);
} catch (e) {
  console.log("No se han podido actualizar los datos automáticamente:", e.message);
  process.exit(0);
}
