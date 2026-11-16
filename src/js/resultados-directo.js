// Portada · «Resultados de la jornada»: además de los partidos terminados, muestra los que se
// están jugando, con su marcador y la marca EN DIRECTO. Los datos salen de /datos/hoy.json, que el
// «Vigilante de datos» actualiza cada pocos minutos. Los partidos que no han empezado no aparecen.
(function () {
  const caja = document.getElementById('resultadosPartidos');
  if (!caja || !caja.dataset.directo) return;
  const fechaTxt = document.getElementById('resultadosFecha');
  const original = { html: caja.innerHTML, fecha: fechaTxt ? fechaTxt.innerHTML : '' };
  const enlaces = {}; // crónicas ya enlazadas en la versión publicada
  caja.querySelectorAll('[data-partido]').forEach((n) => { if (n.href) enlaces[n.dataset.partido] = n.getAttribute('href'); });
  let modo = 'original';

  const TRAD = [[/1st Qtr/i, '1.er cuarto'], [/2nd Qtr/i, '2.º cuarto'], [/3rd Qtr/i, '3.er cuarto'], [/4th Qtr/i, '4.º cuarto'], [/Halftime/i, 'Descanso'], [/End of 1st/i, 'Fin del 1.er cuarto'], [/End of 2nd/i, 'Fin del 2.º cuarto'], [/End of 3rd/i, 'Fin del 3.er cuarto'], [/End of 4th/i, 'Fin del 4.º cuarto'], [/\bOT\b/i, 'Prórroga'], [/\s*\b(Q\d|OT\d?)\s+(\d+:\d\d)/i, ' · $2']];
  const periodo = (x) => { let s = x || ''; TRAD.forEach(([re, es]) => { s = s.replace(re, es); }); return s.trim(); };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fechaLarga = (d) => new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(d + 'T12:00:00Z'));
  // Un partido «en juego» con datos de hace más de 4 horas no se muestra como directo
  const enJuego = (p) => p.e === 'L' && p.hs != null && p.vs != null && (!p.t || Date.now() < Date.parse(p.t) + 4 * 3600000);
  const terminado = (p) => p.e === 'F' && p.hs != null && p.vs != null;

  function tarjeta(p, vivo) {
    const clave = p.h + '-' + p.v, url = !vivo && enlaces[clave];
    const ganaL = p.hs > p.vs, ganaV = p.vs > p.hs;
    const fila = (abr, nombre, apodo, bal, pts, gana) =>
      '<div class="partido__fila' + (gana ? ' partido__fila--gana' : '') + '">' +
      '<span class="partido__abr" aria-hidden="true">' + esc(abr) + '</span>' +
      '<span class="partido__equipo"><span class="partido__nombre"><span class="n-largo">' + esc(nombre) + '</span><span class="n-corto" aria-hidden="true">' + esc(apodo) + '</span></span>' +
      (bal && !vivo ? '<span class="partido__balance" title="Balance tras este partido">(' + esc(bal) + ')</span>' : '') + '</span>' +
      '<b class="partido__puntos" aria-label="' + esc(pts) + ' puntos">' + esc(pts) + '</b></div>';
    const cabeza = vivo ? '<p class="partido__directo"><span class="partido__vivo"><i aria-hidden="true"></i>EN DIRECTO</span>' + (p.x ? '<span class="partido__periodo">' + esc(periodo(p.x)) + '</span>' : '') + '</p>' : '';
    const cuerpo = cabeza +
      fila(p.h, p.hn, p.ha, p.rh, p.hs, vivo ? ganaL : ganaL) +
      fila(p.v, p.vn, p.va, p.rv, p.vs, vivo ? ganaV : !ganaL) +
      (url ? '<span class="partido__ver">Ver la crónica →</span>' : '');
    const clase = 'partido revelar visible' + (vivo ? ' partido--directo' : '') + (url ? ' partido--enlace' : '');
    return url ? '<a class="' + clase + '" href="' + esc(url) + '">' + cuerpo + '</a>' : '<div class="' + clase + '">' + cuerpo + '</div>';
  }

  function pintar(datos) {
    const partidos = (datos.partidos || []).filter((p) => enJuego(p) || terminado(p));
    // La «noche» más reciente con algún partido empezado (fecha de EE. UU.)
    const noche = partidos.map((p) => p.d).sort().pop();
    const deNoche = partidos.filter((p) => p.d === noche);
    const vivos = deNoche.filter(enJuego).sort((a, b) => String(a.t).localeCompare(String(b.t)));
    const fin = deNoche.filter((p) => !enJuego(p) && terminado(p)).sort((a, b) => String(a.t).localeCompare(String(b.t)));
    const masNueva = noche && noche > (caja.dataset.fecha || '');
    if (!noche || (!vivos.length && !masNueva)) {
      if (modo !== 'original') { caja.innerHTML = original.html; if (fechaTxt) fechaTxt.innerHTML = original.fecha; modo = 'original'; caja.querySelectorAll('[data-contar]').forEach((b) => { b.textContent = b.dataset.contar; }); }
      return;
    }
    caja.innerHTML = vivos.map((p) => tarjeta(p, true)).join('') + fin.map((p) => tarjeta(p, false)).join('');
    if (fechaTxt) {
      fechaTxt.innerHTML = 'Jornada NBA del ' + esc(fechaLarga(noche)) +
        (vivos.length ? ' · <span class="cifras__vivo">' + vivos.length + (vivos.length === 1 ? ' partido' : ' partidos') + ' en juego</span>' : '') +
        (fin.length ? ' · <span class="cifras__nota">entre paréntesis, balance de cada equipo tras ese partido</span>' : '');
    }
    modo = 'directo';
  }

  function cargar() {
    fetch(caja.dataset.directo + '?t=' + Date.now(), { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null)).then((d) => { if (d) pintar(d); }).catch(() => {});
  }
  cargar();
  setInterval(() => { if (!document.hidden) cargar(); }, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) cargar(); });
})();
