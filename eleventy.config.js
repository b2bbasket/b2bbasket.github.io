import fs from "node:fs";

// Dirección de la web calculada a partir del repositorio de GitHub (variable GITHUB_REPOSITORY en Actions):
// - repositorio «usuario.github.io»  → https://usuario.github.io/
// - cualquier otro nombre            → https://usuario.github.io/nombre/
// Así, si se cambia de cuenta o de nombre, la web se adapta sola.
const [DUENO, REPO] = (process.env.GITHUB_REPOSITORY || "hugoamigo2006-collab/medio-nba").split("/");
const EN_RAIZ = REPO.toLowerCase() === `${DUENO.toLowerCase()}.github.io`;
const PREFIJO = EN_RAIZ ? "/" : `/${REPO}/`;
const WEB = { repo: `${DUENO}/${REPO}`, prefijo: PREFIJO, url: `https://${DUENO.toLowerCase()}.github.io${EN_RAIZ ? "" : "/" + REPO}` };

export default function (eleventyConfig) {
  // Copia tal cual estos archivos a la web final
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/img");
  eleventyConfig.addPassthroughCopy("src/admin/index.html");
  eleventyConfig.addGlobalData("web", WEB);

  // Tipografías alojadas en la propia web (sin Google Fonts): se copian desde los paquetes de Fontsource
  eleventyConfig.on("eleventy.after", ({ dir }) => {
    const fuentes = [
      ["node_modules/@fontsource-variable/inter/files", /^inter-latin-wght-normal\.woff2$/],
      ["node_modules/@fontsource/newsreader/files", /^newsreader-latin-(600|700|800)-normal\.woff2$/],
    ];
    const destino = `${dir.output}/fonts`;
    fs.mkdirSync(destino, { recursive: true });
    let copiadas = 0;
    for (const [carpeta, patron] of fuentes) {
      if (!fs.existsSync(carpeta)) { console.warn(`[fuentes] No existe ${carpeta}`); continue; }
      for (const f of fs.readdirSync(carpeta)) {
        if (patron.test(f)) { fs.copyFileSync(`${carpeta}/${f}`, `${destino}/${f}`); copiadas++; }
      }
    }
    console.log(`[fuentes] ${copiadas} archivos de tipografía copiados a /fonts`);
  });

  // Artículos más recientes primero
  eleventyConfig.addCollection("recientes", (api) =>
    api.getFilteredByTag("articulo").reverse()
  );

  // Portada: todo menos las guías. Noticias: solo la sección de última hora
  eleventyConfig.addCollection("portada", (api) =>
    api.getFilteredByTag("articulo").filter((a) => a.data.seccion !== "guias").reverse()
  );
  eleventyConfig.addCollection("noticias", (api) =>
    api.getFilteredByTag("articulo").filter((a) => a.data.seccion === "noticias").reverse()
  );
  eleventyConfig.addFilter("deSeccion", (lista, clave) => (lista || []).filter((a) => a.data.seccion === clave));

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
  // Fotos de Wikimedia Commons con su crédito: {% foto "jordan" %}
  // Los datos salen de src/_data/fotos.json, que genera el flujo «Descargar fotos».
  const esc = (t) => String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  eleventyConfig.addShortcode("foto", function (id, clase = "") {
    let fotos = {};
    try { fotos = JSON.parse(fs.readFileSync("src/_data/fotos.json", "utf8")); } catch (e) {}
    const f = fotos[id];
    if (!f) return "";
    const url = eleventyConfig.getFilter("url");
    const licencia = f.licencia_url ? `<a href="${esc(f.licencia_url)}" rel="license noopener">${esc(f.licencia)}</a>` : esc(f.licencia);
    return `<figure class="articulo__foto ${esc(clase)}"><img src="${url(f.src)}" alt="${esc(f.alt)}" loading="lazy"><figcaption>Foto: ${esc(f.autor)} · ${licencia} · <a href="${esc(f.origen)}" rel="noopener">Wikimedia Commons</a></figcaption></figure>`;
  });
  // Foto de un artículo: la «Imagen principal» si la hay; si no, la del jugador indicado en «Jugador para la foto»
  const slugJugador = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  eleventyConfig.addFilter("fotoArticulo", (data) => {
    if (data.imagen) return { src: eleventyConfig.getFilter("url")(data.imagen), alt: data.title, credito: data.credito || "" };
    if (!data.jugador_foto) return null;
    const f = (data.fotos_jugadores || {})[slugJugador(data.jugador_foto)];
    if (!f) return null;
    const url = eleventyConfig.getFilter("url");
    const licencia = f.licencia_url ? `<a href="${esc(f.licencia_url)}" rel="license noopener">${esc(f.licencia)}</a>` : esc(f.licencia);
    return { src: url(f.src), alt: f.alt, credito: `Foto de archivo: ${esc(f.autor)} · ${licencia} · <a href="${esc(f.origen)}" rel="noopener">Wikimedia Commons</a>` };
  });
  eleventyConfig.addFilter("fichaDe", (lista, nombre) => (lista || []).find((f) => f.data.nombre === nombre));
  // Clasificación: ordena por porcentaje de victorias
  eleventyConfig.addFilter("clasificar", (lista) =>
    (lista || [])
      .map((e) => ({ ...e, pct: e.v + e.d ? e.v / (e.v + e.d) : 0 }))
      .sort((a, b) => b.pct - a.pct || b.v - a.v || a.equipo.localeCompare(b.equipo))
  );
  eleventyConfig.addFilter("porcentaje", (n) => n.toFixed(3).replace(/^0/, ""));
  eleventyConfig.addFilter("equiposDe", (lista) => [...new Set((lista || []).map((a) => a.data.equipo).filter(Boolean))].sort());
  // Enlaza un partido con su crónica: mismos dos equipos y fecha cercana
  eleventyConfig.addFilter("cronicaDe", (lista, p) => {
    const par = [p.local, p.visitante].sort().join("|");
    const f = p.fecha ? new Date(p.fecha + "T00:00:00Z") : null;
    const m = (lista || []).find((a) =>
      a.data.seccion === "cronicas" && a.data.equipo_local && a.data.equipo_visitante &&
      [a.data.equipo_local, a.data.equipo_visitante].sort().join("|") === par &&
      (!f || Math.abs(a.date - f) <= 3 * 86400000)
    );
    return m ? m.url : "";
  });
  eleventyConfig.addFilter("lectura", (html) =>
    Math.max(1, Math.round(String(html).replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length / 200))
  );

  // Los artículos con "borrador: true" NO se publican
  eleventyConfig.addPreprocessor("borradores", "md", (data) => {
    if (data.borrador) return false;
  });

  return {
    dir: { input: "src", output: "_site" },
    pathPrefix: PREFIJO,
  };
}
