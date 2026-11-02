export default class {
  data() {
    return { permalink: "/buscador.json", eleventyExcludeFromCollections: true };
  }
  render(data) {
    const fichas = data.collections.fichas || [];
    const items = [
      ...(data.collections.articulo || []).map((a) => ({ t: a.data.title, r: a.data.resumen || "", u: a.url, k: "Artículo" })),
      ...fichas.map((f) => ({ t: f.data.nombre, r: "Historia, datos y líderes del equipo", u: f.url, k: "Equipo" })),
      ...data.secciones.map((s) => ({ t: s.titulo, r: s.descripcion, u: "/" + s.clave + "/", k: "Sección" })),
      { t: "Clasificación", r: "Clasificación de la NBA por conferencias, Este y Oeste", u: "/clasificacion/", k: "Página" },
      { t: "Equipos", r: "Los 30 equipos por conferencias y divisiones", u: "/equipos/", k: "Página" },
      { t: "Quiénes somos", r: "Quién está detrás de este medio", u: "/quienes-somos/", k: "Página" },
      { t: "Principios editoriales", r: "Fuentes, verificación y transparencia", u: "/principios-editoriales/", k: "Página" },
      { t: "Correcciones", r: "Cómo corregimos los errores", u: "/correcciones/", k: "Página" },
      { t: "Contacto", r: "Escríbenos", u: "/contacto/", k: "Página" },
    ];
    const conFicha = new Set(fichas.map((f) => f.data.nombre));
    Object.values(data.equipos).forEach((divisiones) =>
      Object.entries(divisiones).forEach(([division, lista]) =>
        lista.filter((e) => !conFicha.has(e)).forEach((e) => items.push({ t: e, r: division, u: "/equipos/", k: "Equipo" }))
      )
    );
    return JSON.stringify(items);
  }
}
