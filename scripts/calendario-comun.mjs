// Funciones compartidas para guardar el calendario de la temporada (src/_data/calendario.json).
import fs from "node:fs";

export const RUTA_CAL = "src/_data/calendario.json";
export const SIGLAS = ["ATL","BOS","BKN","CHA","CHI","CLE","DAL","DEN","DET","GSW","HOU","IND","LAC","LAL","MEM","MIA","MIL","MIN","NOP","NYK","OKC","ORL","PHI","PHX","POR","SAC","SAS","TOR","UTA","WAS"];
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

// Estado: F = finalizado, L = en juego, A = aplazado/cancelado, P = programado
export function estado(g) {
  const s = String(g.status || "").trim();
  if (s === "Final" || /^final/i.test(s)) return "F";
  if (/postpon|cancel|suspend/i.test(s)) return "A";
  if (/qtr|quarter|half|\bot\b|overtime|end of|period/i.test(s)) return "L";
  return "P";
}

export function compactar(g) {
  const h = g.home_team?.abbreviation, v = g.visitor_team?.abbreviation;
  if (!SIGLAS.includes(h) || !SIGLAS.includes(v)) return null; // descarta All-Star y exhibiciones
  const e = estado(g);
  const s = String(g.status || "");
  const t = g.datetime && ISO.test(g.datetime) ? new Date(g.datetime).toISOString() : (ISO.test(s) ? new Date(s).toISOString() : null);
  const p = { id: g.id, d: String(g.date).slice(0, 10), t, h, v, e };
  if (g.postseason) p.po = 1;
  if (e === "F" || e === "L") { p.hs = g.home_team_score ?? null; p.vs = g.visitor_team_score ?? null; }
  if (e === "L") p.x = [s, g.time && g.time !== s ? g.time : ""].filter(Boolean).join(" ");
  return p;
}

const orden = (a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : String(a.t || "9").localeCompare(String(b.t || "9")) || a.id - b.id);

export function leerCalendario() {
  try { return JSON.parse(fs.readFileSync(RUTA_CAL, "utf8")); } catch { return null; }
}

// Guarda solo si los partidos han cambiado (así no se publican versiones idénticas)
export function guardarCalendario(temporada, partidos) {
  const lista = partidos.filter(Boolean).sort(orden);
  const previo = leerCalendario();
  if (previo && previo.temporada === temporada && JSON.stringify(previo.partidos) === JSON.stringify(lista)) {
    console.log("Calendario sin cambios.");
    return false;
  }
  const datos = { temporada, actualizado: new Date().toISOString(), fuente: "balldontlie", partidos: lista };
  fs.writeFileSync(RUTA_CAL, JSON.stringify(datos) + "\n");
  console.log(`Calendario guardado: ${lista.length} partidos.`);
  return true;
}
