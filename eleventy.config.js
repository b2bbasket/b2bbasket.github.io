import fs from "node:fs";

export default function (eleventyConfig) {
  // Copia tal cual estos archivos a la web final
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/img");
  eleventyConfig.addPassthroughCopy("src/admin");

  // Artículos más recientes primero
  eleventyConfig.addCollection("recientes", (api) =>
    api.getFilteredByTag("articulo").reverse()
  );

  // Fecha en español: 31 de octubre de 2026
  eleventyConfig.addFilter("fecha", (d) =>
    new Intl.DateTimeFormat("es-ES", { dateStyle: "long", timeZone: "UTC" }).format(d)
  );
  eleventyConfig.addFilter("limite", (lista, n) => lista.slice(0, n));
  eleventyConfig.addFilter("excepto", (lista, url) => lista.filter((a) => a.url !== url));
  // Si existe src/img/secciones/<clave>.jpg (o png/webp) se usa como imagen de la sección
  eleventyConfig.addFilter("imagenSeccion", (clave) => {
    for (const ext of ["jpg", "jpeg", "png", "webp"]) {
      if (fs.existsSync(`src/img/secciones/${clave}.${ext}`)) return `/img/secciones/${clave}.${ext}`;
    }
    return "";
  });
  eleventyConfig.addFilter("fichaDe", (lista, nombre) => (lista || []).find((f) => f.data.nombre === nombre));
  eleventyConfig.addFilter("lectura", (html) =>
    Math.max(1, Math.round(String(html).replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length / 200))
  );

  // Los artículos con "borrador: true" NO se publican
  eleventyConfig.addPreprocessor("borradores", "md", (data) => {
    if (data.borrador) return false;
  });

  return {
    dir: { input: "src", output: "_site" },
    pathPrefix: "/medio-nba/",
  };
}
