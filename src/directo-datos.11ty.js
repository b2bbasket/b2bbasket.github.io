// /datos/hoy.json: solo los partidos de ayer, hoy y mañana (hora de EE. UU.), para la barra
// de resultados en directo. Es pequeño para que la barra lo pueda consultar cada minuto.
export default class {
  data() {
    return { permalink: "/datos/hoy.json", eleventyExcludeFromCollections: true };
  }
  render(data) {
    const cal = data.calendario || { partidos: [] };
    const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    const dia = (d, n) => new Date(Date.parse(d + "T12:00:00Z") + n * 86400000).toISOString().slice(0, 10);
    const dias = new Set([dia(hoy, -1), hoy, dia(hoy, 1)]);
    const partidos = (cal.partidos || []).filter((p) => p && dias.has(p.d))
      .map((p) => ({ d: p.d, t: p.t, h: p.h, v: p.v, hs: p.hs, vs: p.vs, e: p.e, x: p.x }));
    return JSON.stringify({ actualizado: cal.actualizado || null, partidos });
  }
}
