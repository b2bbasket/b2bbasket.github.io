// Barra superior: muestra los marcadores reales de los partidos que se están jugando.
// Los datos salen de /datos/hoy.json, que el «Vigilante de datos» actualiza cada pocos
// minutos desde balldontlie. Si no hay ningún partido en juego, la barra mantiene las noticias.
(function () {
  const barra = document.querySelector('.ticker');
  if (!barra || !barra.dataset.directo) return;
  const pista = barra.querySelector('.ticker__pista');
  const original = pista.innerHTML;
  let enDirecto = false;
  const TRAD = [[/1st Qtr/i, '1.er cuarto'], [/2nd Qtr/i, '2.º cuarto'], [/3rd Qtr/i, '3.er cuarto'], [/4th Qtr/i, '4.º cuarto'], [/Halftime/i, 'Descanso'], [/End of 1st/i, 'Fin del 1.er cuarto'], [/End of 2nd/i, 'Fin del 2.º cuarto'], [/End of 3rd/i, 'Fin del 3.er cuarto'], [/End of 4th/i, 'Fin del 4.º cuarto'], [/\bOT\b/i, 'Prórroga']];
  const traducir = (x) => { let s = x || ''; TRAD.forEach(([re, es]) => { s = s.replace(re, es); }); return s; };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function enJuego(p) {
    // Solo partidos marcados «en juego» que empezaron hace menos de 4 horas (si no, el dato es antiguo)
    return p.e === 'L' && p.hs != null && p.vs != null && (!p.t || Date.now() < Date.parse(p.t) + 4 * 3600000);
  }
  function minutos(iso) {
    if (!iso) return '';
    const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
    return m < 1 ? 'actualizado ahora' : 'actualizado hace ' + m + ' min';
  }
  function pintar(datos) {
    const vivos = (datos.partidos || []).filter(enJuego).sort((a, b) => String(a.t).localeCompare(String(b.t)));
    if (!vivos.length) {
      if (enDirecto) { pista.innerHTML = original; barra.classList.remove('ticker--directo'); barra.setAttribute('aria-label', 'Últimas noticias'); enDirecto = false; }
      return;
    }
    const enlace = barra.dataset.calendario;
    const bloque = '<span class="ticker__marca ticker__marca--directo"><i class="ticker__pulso" aria-hidden="true"></i>EN DIRECTO</span>' +
      vivos.map((p) => {
        const gv = p.vs > p.hs, gl = p.hs > p.vs;
        return '<a class="ticker__partido" href="' + esc(enlace) + '">' +
          '<b' + (gv ? ' class="gana"' : '') + '>' + esc(p.v) + ' ' + esc(p.vs) + '</b>' +
          '<span class="ticker__guion">–</span>' +
          '<b' + (gl ? ' class="gana"' : '') + '>' + esc(p.hs) + ' ' + esc(p.h) + '</b>' +
          (p.x ? '<small>' + esc(traducir(p.x)) + '</small>' : '') + '</a>';
      }).join('') +
      '<span class="ticker__nota">' + esc(minutos(datos.actualizado)) + '</span>';
    pista.innerHTML = bloque + bloque;
    barra.classList.add('ticker--directo');
    barra.setAttribute('aria-label', 'Resultados en directo');
    enDirecto = true;
  }
  function cargar() {
    fetch(barra.dataset.directo + '?t=' + Date.now(), { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) pintar(d); }).catch(() => {});
  }
  cargar();
  setInterval(() => { if (!document.hidden) cargar(); }, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) cargar(); });
})();
