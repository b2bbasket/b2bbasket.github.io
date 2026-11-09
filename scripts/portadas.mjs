// Portadas automáticas: genera, para cada artículo y previa, una imagen con el titular y los colores de B2B.
//   src/img/portadas/<clave>.png     → 1200×630, la que se ve al compartir el enlace (WhatsApp, X, Instagram…)
//   src/img/portadas/<clave>-ig.png  → 1080×1350, lista para subir a Instagram
// Lee la lista de artículos de _site/portadas-datos.json (hay que construir la web antes: npm run build)
// y guarda en src/_data/portadas.json qué portadas existen. Solo rehace las que han cambiado.
// Uso: node scripts/portadas.mjs [--todas]
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";

const VERSION = 1; // súbelo si cambias el diseño para que se rehagan todas
const RAIZ = process.cwd();
const CARPETA = path.join(RAIZ, "src/img/portadas");
const REGISTRO = path.join(RAIZ, "src/_data/portadas.json");
const TODAS = process.argv.includes("--todas");

let chromium;
try { ({ chromium } = await import("playwright")); } catch { ({ chromium } = createRequire(import.meta.url)("playwright")); }

const lista = JSON.parse(fs.readFileSync(path.join(RAIZ, "_site/portadas-datos.json"), "utf8"));
const site = JSON.parse(fs.readFileSync(path.join(RAIZ, "src/_data/site.json"), "utf8"));
let registro = {};
try { registro = JSON.parse(fs.readFileSync(REGISTRO, "utf8")); } catch {}
fs.mkdirSync(CARPETA, { recursive: true });

// Tipografías de la web (las instala npm install). Si no están, se usa una de reserva.
const fuente = (paquete, archivo) => {
  const ruta = path.join(RAIZ, "node_modules", paquete, "files", archivo);
  return fs.existsSync(ruta) ? `url("file://${ruta}") format("woff2")` : null;
};
const ff = [
  ["Inter", "100 900", fuente("@fontsource-variable/inter", "inter-latin-wght-normal.woff2")],
  ["Newsreader", "700", fuente("@fontsource/newsreader", "newsreader-latin-700-normal.woff2")],
  ["Newsreader", "800", fuente("@fontsource/newsreader", "newsreader-latin-800-normal.woff2")],
].filter((f) => f[2]).map(([n, w, src]) => `@font-face{font-family:"${n}";font-weight:${w};src:${src}}`).join("\n");

const COLORES = { noticias: "#FF4B2B", previas: "#2B59FF", cronicas: "#FFC93C", guias: "#FF4B2B", analisis: "#2B59FF" };
const TEXTO_SOBRE = { "#FFC93C": "#16181D" };
const [DUENO] = (process.env.GITHUB_REPOSITORY || "b2bbasket/").split("/");
const dominio = `${DUENO.toLowerCase()}.github.io`;
const esc = (t) => String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function html(a, formato) {
  const color = COLORES[a.seccion] || "#FF4B2B";
  const sobre = TEXTO_SOBRE[color] || "#fff";
  const ig = formato === "ig";
  const [W, H] = ig ? [1080, 1350] : [1200, 630];
  const foto = a.foto && fs.existsSync(path.join(RAIZ, a.foto.ruta)) ? `file://${path.join(RAIZ, a.foto.ruta)}` : null;
  const etiqueta = a.etiqueta ? `<span class="pill">${esc(a.etiqueta)}</span>` : "";
  const firma = [a.autor ? `Por ${esc(a.autor)}` : "", esc(a.fecha)].filter(Boolean).join(" · ");
  const logo = `<div class="logo">B2B<span>.</span></div>`;
  const pie = ig
    ? `<div class="pie"><span>Lee el artículo completo en <b>${esc(dominio)}</b></span><span>${esc(site.instagram_usuario || "")}</span></div>`
    : `<div class="pie"><span>${firma}</span><span><b>${esc(dominio)}</b></span></div>`;

  let centro;
  if (a.previa) {
    const p = a.previa;
    centro = `<div class="duelo">
      <div class="eq"><b>${esc(p.abrLocal)}</b><small>${esc(p.local)}</small></div>
      <div class="vs">vs</div>
      <div class="eq"><b>${esc(p.abrVisitante)}</b><small>${esc(p.visitante)}</small></div>
    </div>${p.cuando ? `<div class="cuando">${esc(p.cuando)}</div>` : ""}`;
  } else {
    centro = `<h1 id="titular">${esc(a.titulo)}</h1>${ig ? `<div class="firma">${firma}</div>` : ""}`;
  }

  const credito = foto && a.foto.credito ? `<div class="credito">${esc(a.foto.credito)}</div>` : "";
  const capaFoto = foto ? `<div class="foto" style="background-image:url('${foto}')">${credito}</div>` : "";
  // Con foto: en horizontal, la foto ocupa la derecha; en vertical, la parte de arriba.
  const caja = foto ? (ig ? "top:700px;left:72px;right:72px;bottom:150px" : "top:118px;left:64px;width:600px;bottom:120px")
                    : (ig ? "top:330px;left:80px;right:80px;bottom:190px" : "top:130px;left:72px;right:200px;bottom:100px");
  const [maxF, minF] = a.previa ? [0, 0] : ig ? [foto ? 78 : 104, 46] : [foto ? 62 : 76, 38];

  return `<!doctype html><html><head><meta charset="utf-8"><style>
${ff}
*{box-sizing:border-box;margin:0}
body{width:${W}px;height:${H}px;overflow:hidden;background:#16181D;color:#fff;font-family:Inter,"DejaVu Sans",sans-serif;position:relative}
.cancha{position:absolute;${ig ? "right:-420px;top:-160px;width:1100px;height:1100px" : "right:-260px;top:-220px;width:760px;height:760px"};border-radius:50%;border:3px solid ${color};opacity:.22}
.cancha::after{content:"";position:absolute;inset:22%;border-radius:50%;border:3px solid ${color}}
.foto{position:absolute;background:center 22%/cover no-repeat;${ig ? "left:0;right:0;top:0;height:640px" : "right:0;top:0;bottom:0;width:480px;clip-path:polygon(18% 0,100% 0,100% 100%,0 100%)"}}
.foto::after{content:"";position:absolute;inset:0;background:${ig ? "linear-gradient(to bottom,rgba(22,24,29,.55) 0%,rgba(22,24,29,0) 22%,rgba(22,24,29,0) 55%,#16181D 100%)" : "linear-gradient(to right,#16181D 0%,rgba(22,24,29,0) 30%)"}}
.credito{position:absolute;z-index:1;right:18px;${ig ? "top:18px" : "bottom:22px"};font-size:15px;color:rgba(255,255,255,.85);text-shadow:0 1px 4px rgba(0,0,0,.9);max-width:420px;text-align:right}
.barra{position:absolute;left:0;right:0;bottom:0;height:12px;background:${color}}
.arriba{position:absolute;${ig ? "top:64px;left:80px" : "top:48px;left:72px"};display:flex;align-items:center;gap:22px;z-index:2}
.logo{font-family:Newsreader,"DejaVu Serif",serif;font-weight:800;font-size:${ig ? 64 : 50}px;line-height:1;letter-spacing:-.01em;text-shadow:0 2px 12px rgba(0,0,0,.4)}
.logo span{color:#FF4B2B}
.pill{background:${color};color:${sobre};font-weight:800;font-size:${ig ? 24 : 19}px;letter-spacing:.12em;text-transform:uppercase;padding:${ig ? "10px 18px" : "8px 14px"};border-radius:999px}
.caja{position:absolute;${caja};display:flex;flex-direction:column;justify-content:${foto && ig ? "flex-start" : "center"};gap:28px;z-index:2}
h1{font-family:Newsreader,"DejaVu Serif",serif;font-weight:700;line-height:1.06;letter-spacing:-.015em;text-wrap:balance}
.firma{font-size:28px;color:#B9BCC6;font-weight:500}
.pie{position:absolute;${ig ? "left:80px;right:80px;bottom:56px" : "left:72px;right:72px;bottom:38px"};display:flex;justify-content:space-between;align-items:center;gap:24px;font-size:${ig ? 26 : 21}px;color:#B9BCC6;font-weight:500;z-index:2}
.pie b{color:#fff;font-weight:700}
${foto && !ig ? ".pie{right:auto;width:600px;flex-direction:column;align-items:flex-start;gap:6px}" : ""}
.duelo{display:flex;align-items:center;justify-content:${ig ? "center" : "flex-start"};gap:${ig ? 40 : 48}px}
.eq{display:flex;flex-direction:column;align-items:center;gap:10px}
.eq b{font-family:Newsreader,"DejaVu Serif",serif;font-weight:800;font-size:${ig ? 170 : 150}px;line-height:.9}
.eq small{font-size:${ig ? 26 : 22}px;color:#B9BCC6;font-weight:600;text-align:center;max-width:${ig ? 360 : 330}px}
.vs{font-family:Newsreader,"DejaVu Serif",serif;font-style:italic;font-size:${ig ? 64 : 54}px;color:${color};font-weight:700}
.cuando{font-size:${ig ? 32 : 26}px;font-weight:700;${ig ? "text-align:center" : ""}}
</style></head><body>
${foto ? "" : `<div class="cancha"></div>`}${capaFoto}
<div class="arriba">${logo}${etiqueta}</div>
<div class="caja" id="caja">${centro}</div>
${pie}<div class="barra"></div>
<script>
(function(){var h=document.getElementById("titular"),c=document.getElementById("caja");if(!h)return;
var t=${maxF};h.style.fontSize=t+"px";
var otros=c.scrollHeight-h.offsetHeight;
while(t>${minF}&&(h.scrollHeight>c.clientHeight-otros||h.scrollWidth>c.clientWidth)){t-=2;h.style.fontSize=t+"px";}
})();
</script></body></html>`;
}

const huella = (a) => crypto.createHash("sha1").update(JSON.stringify([VERSION, a, site.instagram_usuario, a.foto && fs.existsSync(path.join(RAIZ, a.foto.ruta)) ? fs.statSync(path.join(RAIZ, a.foto.ruta)).size : 0])).digest("hex").slice(0, 10);

const pendientes = lista.filter((a) => {
  const h = huella(a);
  return TODAS || !registro[a.clave] || registro[a.clave].v !== h || !fs.existsSync(path.join(CARPETA, `${a.clave}.png`)) || !fs.existsSync(path.join(CARPETA, `${a.clave}-ig.png`));
});
console.log(`${lista.length} artículos; ${pendientes.length} portadas por hacer.`);

if (pendientes.length) {
  const navegador = await chromium.launch();
  const pagina = await navegador.newPage();
  for (const a of pendientes) {
    for (const [formato, W, H, sufijo] of [["og", 1200, 630, ""], ["ig", 1080, 1350, "-ig"]]) {
      await pagina.setViewportSize({ width: W, height: H });
      const tmp = path.join(RAIZ, `.portada-tmp.html`);
      fs.writeFileSync(tmp, html(a, formato));
      await pagina.goto(`file://${tmp}`);
      await pagina.evaluate(() => document.fonts.ready);
      await pagina.waitForTimeout(150);
      await pagina.screenshot({ path: path.join(CARPETA, `${a.clave}${sufijo}.png`), clip: { x: 0, y: 0, width: W, height: H } });
      fs.unlinkSync(tmp);
    }
    registro[a.clave] = { v: huella(a), titulo: a.titulo, url: a.url };
    console.log(`  ✓ ${a.clave}`);
  }
  await navegador.close();
}

// Borrar las portadas de artículos que ya no existen
const vigentes = new Set(lista.map((a) => a.clave));
for (const clave of Object.keys(registro)) {
  if (vigentes.has(clave)) continue;
  delete registro[clave];
  for (const s of ["", "-ig"]) fs.rmSync(path.join(CARPETA, `${clave}${s}.png`), { force: true });
  console.log(`  ✗ ${clave} (el artículo ya no existe)`);
}
const ordenado = Object.fromEntries(Object.keys(registro).sort().map((k) => [k, registro[k]]));
fs.writeFileSync(REGISTRO, JSON.stringify(ordenado, null, 1) + "\n");
