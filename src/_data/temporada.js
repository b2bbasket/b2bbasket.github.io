// Estadísticas de la temporada calculadas a partir de calendario.json (datos reales de balldontlie,
// que se actualizan solos cada mañana). No se escribe ningún dato a mano.
// Solo cuenta la temporada regular: se excluyen los playoffs y la final de la NBA Cup.
import fs from "node:fs";

const NOMBRES = { ATL: "Atlanta Hawks", BOS: "Boston Celtics", BKN: "Brooklyn Nets", CHA: "Charlotte Hornets", CHI: "Chicago Bulls", CLE: "Cleveland Cavaliers", DAL: "Dallas Mavericks", DEN: "Denver Nuggets", DET: "Detroit Pistons", GSW: "Golden State Warriors", HOU: "Houston Rockets", IND: "Indiana Pacers", LAC: "Los Angeles Clippers", LAL: "Los Angeles Lakers", MEM: "Memphis Grizzlies", MIA: "Miami Heat", MIL: "Milwaukee Bucks", MIN: "Minnesota Timberwolves", NOP: "New Orleans Pelicans", NYK: "New York Knicks", OKC: "Oklahoma City Thunder", ORL: "Orlando Magic", PHI: "Philadelphia 76ers", PHX: "Phoenix Suns", POR: "Portland Trail Blazers", SAC: "Sacramento Kings", SAS: "San Antonio Spurs", TOR: "Toronto Raptors", UTA: "Utah Jazz", WAS: "Washington Wizards" };
const FINALES_COPA = new Set(["2026-12-11"]);

export default function () {
  let cal = { partidos: [] };
  try { cal = JSON.parse(fs.readFileSync("src/_data/calendario.json", "utf8")); } catch (e) {}
  const equiposJson = JSON.parse(fs.readFileSync("src/_data/equipos.json", "utf8"));
  const confDe = {};
  for (const [conf, divs] of Object.entries(equiposJson))
    for (const [div, lista] of Object.entries(divs)) for (const n of lista) confDe[n] = { conferencia: conf.includes("Este") ? "Este" : "Oeste", division: div };

  const partidos = (cal.partidos || []).filter(Boolean).slice().sort((a, b) => a.d.localeCompare(b.d) || String(a.t || "").localeCompare(String(b.t || "")) || a.id - b.id);
  const jugados = partidos.filter((p) => p.e === "F" && p.hs != null && p.vs != null && !p.po && !FINALES_COPA.has(p.d));
  const hoy = new Date().toISOString().slice(0, 10);

  const eq = {};
  for (const [abr, nombre] of Object.entries(NOMBRES)) {
    eq[abr] = { abr, nombre, ...(confDe[nombre] || {}), v: 0, d: 0, casa: { v: 0, d: 0 }, fuera: { v: 0, d: 0 }, pf: 0, pc: 0, resultados: [], proximos: [] };
  }
  const balanceTras = {}; // id → { h: "9-2", v: "8-3" }
  for (const p of jugados) {
    const L = eq[p.h], V = eq[p.v];
    if (!L || !V) continue;
    const ganaL = p.hs > p.vs;
    L.pf += p.hs; L.pc += p.vs; V.pf += p.vs; V.pc += p.hs;
    if (ganaL) { L.v++; L.casa.v++; V.d++; V.fuera.d++; } else { V.v++; V.fuera.v++; L.d++; L.casa.d++; }
    L.resultados.push({ d: p.d, rival: p.v, local: true, pf: p.hs, pc: p.vs, gano: ganaL });
    V.resultados.push({ d: p.d, rival: p.h, local: false, pf: p.vs, pc: p.hs, gano: !ganaL });
    balanceTras[p.id] = { h: `${L.v}-${L.d}`, v: `${V.v}-${V.d}` };
  }
  for (const p of partidos) {
    if (p.e === "F" || p.d < hoy) continue;
    for (const [abr, rival, local] of [[p.h, p.v, true], [p.v, p.h, false]]) if (eq[abr] && eq[abr].proximos.length < 3) eq[abr].proximos.push({ d: p.d, t: p.t, rival, local });
  }
  for (const e of Object.values(eq)) {
    const n = e.v + e.d;
    e.jugados = n;
    e.pct = n ? e.v / n : 0;
    e.ultimos = e.resultados.slice(-5).reverse();
    const diez = e.resultados.slice(-10);
    e.ultimos10 = { v: diez.filter((r) => r.gano).length, d: diez.filter((r) => !r.gano).length };
    let racha = 0; const ult = e.resultados[e.resultados.length - 1];
    for (let i = e.resultados.length - 1; i >= 0 && e.resultados[i].gano === ult?.gano; i--) racha++;
    e.racha = ult ? (ult.gano ? "G" : "P") + racha : "—";
    e.rachaNum = ult ? (ult.gano ? racha : -racha) : 0;
    e.ataque = n ? e.pf / n : 0;
    e.defensa = n ? e.pc / n : 0;
    e.diferencial = n ? (e.pf - e.pc) / n : 0;
  }
  // Puesto en la conferencia y partidos de diferencia con el líder
  const porConf = { Este: [], Oeste: [] };
  for (const e of Object.values(eq)) if (porConf[e.conferencia]) porConf[e.conferencia].push(e);
  for (const lista of Object.values(porConf)) {
    lista.sort((a, b) => b.pct - a.pct || b.v - a.v || a.nombre.localeCompare(b.nombre));
    const lider = lista[0];
    lista.forEach((e, i) => { e.puesto = i + 1; e.dif = lider ? ((lider.v - e.v) + (e.d - lider.d)) / 2 : 0; });
  }
  const todos = Object.values(eq).filter((e) => e.jugados);
  const mejor = (f) => todos.slice().sort(f)[0];
  const destacados = todos.length ? {
    balance: mejor((a, b) => b.pct - a.pct || b.v - a.v),
    racha: mejor((a, b) => b.rachaNum - a.rachaNum),
    ataque: mejor((a, b) => b.ataque - a.ataque),
    defensa: mejor((a, b) => a.defensa - b.defensa),
  } : null;
  const porNombre = {};
  for (const e of Object.values(eq)) porNombre[e.nombre] = e;

  return {
    actualizado: cal.actualizado || null,
    temporada: cal.temporada || null,
    partidosJugados: jugados.length,
    equipos: eq,
    porNombre,
    conferencias: porConf,
    destacados,
    balanceTras,
    partidos: jugados.map((p) => ({ id: p.id, d: p.d, h: p.h, v: p.v, hs: p.hs, vs: p.vs })),
  };
}
