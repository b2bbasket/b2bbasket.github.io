// Bloques especiales para escribir desde el panel dentro del texto de un artículo:
//
//   ```grafico
//   tipo: barras            (barras o lineas)
//   titulo: Puntos por partido esta temporada
//   unidad: puntos          (opcional)
//   fuente: NBA.com         (opcional, pero recomendable)
//   Luka Dončić: 33,5
//   Shai Gilgeous-Alexander: 32,1
//   ```
//
//   ```video
//   https://www.youtube.com/watch?v=XXXXXXXXXXX
//   Pie del vídeo (opcional)
//   ```
//
// El gráfico se dibuja al publicar (sin servicios externos). El vídeo no se carga hasta que el
// lector pulsa el botón, así YouTube no recibe nada de quien no lo ve.

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const numero = (s) => Number(String(s).trim().replace(/\./g, "").replace(",", "."));
const bonito = (n) => n.toLocaleString("es-ES", { maximumFractionDigits: 2 });

export function grafico(texto) {
  const opc = { tipo: "barras", titulo: "", unidad: "", fuente: "" };
  const datos = [];
  for (const linea of texto.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const i = linea.lastIndexOf(":");
    if (i < 0) continue;
    const clave = linea.slice(0, i).trim(), valor = linea.slice(i + 1).trim();
    if (["tipo", "titulo", "título", "unidad", "fuente"].includes(clave.toLowerCase())) { opc[clave.toLowerCase().replace("í", "i")] = valor; continue; }
    const n = numero(valor);
    if (Number.isFinite(n)) datos.push({ etiqueta: clave, valor: n });
  }
  if (!datos.length) return `<p class="aviso-bloque">El gráfico no tiene datos: escribe una línea por dato, con el formato «Nombre: valor».</p>`;
  const max = Math.max(...datos.map((d) => d.valor), 0) || 1;
  const pie = opc.fuente ? `<figcaption>Fuente: ${esc(opc.fuente)}</figcaption>` : "";
  const titulo = opc.titulo ? `<p class="grafico__titulo">${esc(opc.titulo)}${opc.unidad ? ` <span>(${esc(opc.unidad)})</span>` : ""}</p>` : "";
  if (/^l[ií]nea/i.test(opc.tipo)) {
    const W = 640, H = 260, m = { t: 26, r: 44, b: 34, l: 44 };
    const min = Math.min(...datos.map((d) => d.valor), 0);
    const x = (i) => m.l + (datos.length === 1 ? (W - m.l - m.r) / 2 : (i * (W - m.l - m.r)) / (datos.length - 1));
    const y = (v) => m.t + (H - m.t - m.b) * (1 - (v - min) / (max - min || 1));
    const puntos = datos.map((d, i) => `${x(i).toFixed(1)},${y(d.valor).toFixed(1)}`).join(" ");
    const marcas = datos.map((d, i) => `<g><circle cx="${x(i).toFixed(1)}" cy="${y(d.valor).toFixed(1)}" r="5"/><text class="v" x="${x(i).toFixed(1)}" y="${(y(d.valor) - 11).toFixed(1)}">${esc(bonito(d.valor))}</text><text class="e" x="${x(i).toFixed(1)}" y="${H - 10}">${esc(d.etiqueta)}</text></g>`).join("");
    return `<figure class="grafico grafico--lineas">${titulo}<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opc.titulo || "Gráfico")}: ${esc(datos.map((d) => d.etiqueta + " " + bonito(d.valor)).join(", "))}"><polyline points="${puntos}"/>${marcas}</svg>${pie}</figure>`;
  }
  const filas = datos.map((d) => `<li><span class="grafico__etiqueta">${esc(d.etiqueta)}</span><span class="grafico__barra"><i style="width:${Math.max(2, (d.valor / max) * 100).toFixed(1)}%"></i></span><b>${esc(bonito(d.valor))}</b></li>`).join("");
  return `<figure class="grafico grafico--barras">${titulo}<ol>${filas}</ol>${pie}</figure>`;
}

export function video(texto) {
  const [url = "", ...resto] = texto.split("\n").map((l) => l.trim()).filter(Boolean);
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
  if (!m) return `<p class="aviso-bloque">El vídeo necesita un enlace de YouTube en la primera línea.</p>`;
  const id = m[1], pie = resto.join(" ");
  return `<figure class="video-b2b"><div class="video-b2b__marco" data-video="${id}"><button type="button" class="video-b2b__boton"><span class="video-b2b__play" aria-hidden="true"></span><span>Ver el vídeo</span><small>Se cargará desde YouTube</small></button></div>${pie ? `<figcaption>${esc(pie)}</figcaption>` : ""}</figure>`;
}
