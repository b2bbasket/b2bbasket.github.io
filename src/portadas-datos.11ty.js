// Lista de artículos y previas para generar sus portadas automáticas (scripts/portadas.mjs).
// No es una página para lectores: solo la usa el robot de portadas.
const quitarHtml = (t) => String(t || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const slug = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const fechaLarga = (d) => new Intl.DateTimeFormat("es-ES", { dateStyle: "long", timeZone: "UTC" }).format(d);

export default class {
  data() {
    return { permalink: "/portadas-datos.json", eleventyExcludeFromCollections: true };
  }

  render(data) {
    const secciones = Object.fromEntries((data.secciones || []).map((s) => [s.clave, s.menu]));
    const equiposReales = (data.temporada && data.temporada.porNombre) || {};
    const fotos = data.fotos_jugadores || {};
    const lista = (data.collections.articulo || []).map((a) => {
      const d = a.data;
      let foto = null;
      if (d.imagen) foto = { ruta: "src" + d.imagen, credito: quitarHtml(d.credito) };
      else if (d.jugador_foto && fotos[slug(d.jugador_foto)]) {
        const f = fotos[slug(d.jugador_foto)];
        foto = { ruta: "src" + f.src, credito: `Foto: ${quitarHtml(f.autor)} · ${quitarHtml(f.licencia)}` };
      }
      const item = {
        clave: this.clavePortada(a.url),
        url: a.url,
        titulo: quitarHtml(d.title),
        seccion: d.seccion || "",
        etiqueta: secciones[d.seccion] || "",
        fecha: fechaLarga(a.date),
        autor: d.autor && !String(d.autor).includes("[") ? d.autor : "",
        foto,
      };
      if (d.seccion === "previas" && equiposReales[d.local] && equiposReales[d.visitante]) {
        item.previa = {
          local: d.local, visitante: d.visitante,
          abrLocal: equiposReales[d.local].abr, abrVisitante: equiposReales[d.visitante].abr,
          cuando: d.fecha_hora && !String(d.fecha_hora).startsWith("Texto de ejemplo") ? quitarHtml(d.fecha_hora) : "",
        };
      }
      return item;
    });
    return JSON.stringify(lista, null, 1);
  }
}
