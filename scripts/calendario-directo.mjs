// Actualización ligera del calendario: UNA petición con los partidos de ayer y hoy (fecha de EE. UU.).
// Se ejecuta cada 30 minutos en las horas de partido. No toca nada si no hay cambios.
import { compactar, guardarCalendario, leerCalendario } from "./calendario-comun.mjs";

const KEY = process.env.BALLDONTLIE_API_KEY;
if (!KEY) { console.log("Falta BALLDONTLIE_API_KEY."); process.exit(0); }
const cal = leerCalendario();
if (!cal || !cal.temporada || !cal.partidos?.length) { console.log("Aún no hay calendario completo: lo crea la actualización diaria."); process.exit(0); }

const et = (d) => d.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
const ahora = new Date();
const dias = [et(new Date(ahora.getTime() - 86400000)), et(ahora)];

try {
  const u = new URL(process.env.BALLDONTLIE_URL || "https://api.balldontlie.io/nba/v1/games");
  dias.forEach((d) => u.searchParams.append("dates[]", d));
  u.searchParams.set("per_page", "100");
  let r;
  for (let i = 0; i < 3; i++) {
    r = await fetch(u, { headers: { Authorization: KEY } });
    if (r.status !== 429) break;
    await new Promise((ok) => setTimeout(ok, 20000));
  }
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = await r.json();
  const nuevos = j.data.map(compactar).filter(Boolean);
  const porId = new Map(cal.partidos.map((p) => [p.id, p]));
  for (const p of nuevos) porId.set(p.id, p);
  // si un partido de esos días ha desaparecido del calendario oficial, se elimina
  const ids = new Set(nuevos.map((p) => p.id));
  for (const [id, p] of porId) if (dias.includes(p.d) && !ids.has(id) && j.data.length < 100) porId.delete(id);
  guardarCalendario(cal.temporada, [...porId.values()]);
  console.log(`Directo: ${nuevos.length} partidos revisados (${dias.join(", ")}).`);
} catch (e) {
  console.log("No se ha podido actualizar el calendario en directo:", e.message);
}
