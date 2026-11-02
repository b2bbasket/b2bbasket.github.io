export default class {
  data() {
    return { permalink: "/buscador.json", eleventyExcludeFromCollections: true };
  }
  render(data) {
    const items = [
      ...(data.collections.articulo || []).map((a) => ({ t: a.data.title, r: a.data.resumen || "", u: a.url, k: "Artículo" })),
      ...(data.collections.fichas || []).map((f) => ({ t: f.data.nombre, r: "Historia y datos del equipo", u: f.url, k: "Equipo" })),
    ];
    return JSON.stringify(items);
  }
}
