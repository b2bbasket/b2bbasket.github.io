export default function (eleventyConfig) {
  // Copia tal cual estos archivos a la web final
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");

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

  // Los artículos con "borrador: true" NO se publican
  eleventyConfig.addPreprocessor("borradores", "md", (data) => {
    if (data.borrador) return false;
  });

  return {
    dir: { input: "src", output: "_site" },
    pathPrefix: "/medio-nba/",
  };
}
