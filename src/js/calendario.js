// Calendario NBA de B2B Basket
// Lee /datos/calendario.json (generado por la actualización automática) y no inventa nada:
// si falta un dato, lo dice.
(function () {
  const raiz = document.getElementById('calendario');
  if (!raiz) return;

  // ---- Equipos: nombre, ciudad y zona horaria del pabellón ----
  const EQ = {
    ATL: ['Atlanta Hawks', 'Atlanta', 'America/New_York', 'Este'],
    BOS: ['Boston Celtics', 'Boston', 'America/New_York', 'Este'],
    BKN: ['Brooklyn Nets', 'Brooklyn', 'America/New_York', 'Este'],
    CHA: ['Charlotte Hornets', 'Charlotte', 'America/New_York', 'Este'],
    CHI: ['Chicago Bulls', 'Chicago', 'America/Chicago', 'Este'],
    CLE: ['Cleveland Cavaliers', 'Cleveland', 'America/New_York', 'Este'],
    DAL: ['Dallas Mavericks', 'Dallas', 'America/Chicago', 'Oeste'],
    DEN: ['Denver Nuggets', 'Denver', 'America/Denver', 'Oeste'],
    DET: ['Detroit Pistons', 'Detroit', 'America/Detroit', 'Este'],
    GSW: ['Golden State Warriors', 'San Francisco', 'America/Los_Angeles', 'Oeste'],
    HOU: ['Houston Rockets', 'Houston', 'America/Chicago', 'Oeste'],
    IND: ['Indiana Pacers', 'Indianápolis', 'America/Indiana/Indianapolis', 'Este'],
    LAC: ['Los Angeles Clippers', 'Los Ángeles', 'America/Los_Angeles', 'Oeste'],
    LAL: ['Los Angeles Lakers', 'Los Ángeles', 'America/Los_Angeles', 'Oeste'],
    MEM: ['Memphis Grizzlies', 'Memphis', 'America/Chicago', 'Oeste'],
    MIA: ['Miami Heat', 'Miami', 'America/New_York', 'Este'],
    MIL: ['Milwaukee Bucks', 'Milwaukee', 'America/Chicago', 'Este'],
    MIN: ['Minnesota Timberwolves', 'Minneapolis', 'America/Chicago', 'Oeste'],
    NOP: ['New Orleans Pelicans', 'Nueva Orleans', 'America/Chicago', 'Oeste'],
    NYK: ['New York Knicks', 'Nueva York', 'America/New_York', 'Este'],
    OKC: ['Oklahoma City Thunder', 'Oklahoma City', 'America/Chicago', 'Oeste'],
    ORL: ['Orlando Magic', 'Orlando', 'America/New_York', 'Este'],
    PHI: ['Philadelphia 76ers', 'Filadelfia', 'America/New_York', 'Este'],
    PHX: ['Phoenix Suns', 'Phoenix', 'America/Phoenix', 'Oeste'],
    POR: ['Portland Trail Blazers', 'Portland', 'America/Los_Angeles', 'Oeste'],
    SAC: ['Sacramento Kings', 'Sacramento', 'America/Los_Angeles', 'Oeste'],
    SAS: ['San Antonio Spurs', 'San Antonio', 'America/Chicago', 'Oeste'],
    TOR: ['Toronto Raptors', 'Toronto', 'America/Toronto', 'Este'],
    UTA: ['Utah Jazz', 'Salt Lake City', 'America/Denver', 'Oeste'],
    WAS: ['Washington Wizards', 'Washington', 'America/New_York', 'Este'],
  };
  const nombre = (s) => (EQ[s] ? EQ[s][0] : s);

  // ---- Utilidades de fecha (zonas horarias con Intl: respeta horario de verano e invierno) ----
  const MAD = 'Europe/Madrid';
  const fmtCache = {};
  const fmt = (clave, opciones) => fmtCache[clave] || (fmtCache[clave] = new Intl.DateTimeFormat(opciones.locale || 'es-ES', opciones));
  const fechaEnZona = (d, tz) => fmt('ymd' + tz, { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', locale: 'en-CA' }).format(d);
  const horaEnZona = (d, tz) => fmt('hm' + tz, { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  function siglaZona(d, tz) {
    const p = fmt('tzn' + tz, { timeZone: tz, timeZoneName: 'short', locale: 'en-US' }).formatToParts(d).find((x) => x.type === 'timeZoneName');
    return p ? p.value : '';
  }
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const MESES_C = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const DIAS_C = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const deYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d, 12)); };
  const ymd = (y, m, d) => y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  const hoyET = () => fechaEnZona(new Date(), 'America/New_York');
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  function tituloDia(s) { const f = deYmd(s); return cap(DIAS[f.getUTCDay()]) + ', ' + f.getUTCDate() + ' de ' + MESES[f.getUTCMonth()] + ' de ' + f.getUTCFullYear(); }

  // ---- Estado de cada partido ----
  function estado(p) {
    if (p.e === 'F') return 'final';
    if (p.e === 'A') return 'aplazado';
    if (p.e === 'L') return 'directo';
    if (p.t && Date.now() > Date.parse(p.t) + 10 * 60000) return 'pendiente';
    return 'proximo';
  }
  const TRAD = [[/1st Qtr/i, '1.er cuarto'], [/2nd Qtr/i, '2.º cuarto'], [/3rd Qtr/i, '3.er cuarto'], [/4th Qtr/i, '4.º cuarto'], [/Halftime/i, 'Descanso'], [/End of 1st/i, 'Fin del 1.er cuarto'], [/End of 2nd/i, 'Fin del 2.º cuarto'], [/End of 3rd/i, 'Fin del 3.er cuarto'], [/End of 4th/i, 'Fin del 4.º cuarto'], [/\bOT\b/i, 'Prórroga']];
  function traducir(x) { let s = x || ''; TRAD.forEach(([re, es]) => { s = s.replace(re, es); }); return s; }
  const ETIQUETA = { final: 'Final', directo: 'En juego', proximo: 'Próximo', pendiente: 'Pendiente de actualizar', aplazado: 'Aplazado' };

  // ---- Horarios ----
  function horarios(p) {
    if (!p.t) return { es: 'Hora por confirmar', us: '', fechaEs: '' };
    const d = new Date(p.t);
    const tz = EQ[p.h] ? EQ[p.h][2] : 'America/New_York';
    const fechaEs = fechaEnZona(d, MAD);
    let es = horaEnZona(d, MAD);
    let extra = '';
    if (fechaEs !== p.d) { const f = deYmd(fechaEs); extra = DIAS_C[f.getUTCDay()] + ' ' + f.getUTCDate(); }
    return { es, extra, us: horaEnZona(d, tz) + ' ' + siglaZona(d, tz), ciudad: EQ[p.h] ? EQ[p.h][1] : '' };
  }

  // ---- Elementos ----
  const $ = (id) => document.getElementById(id);
  const aviso = $('calAviso');
  const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt !== undefined) n.textContent = txt; return n; };

  let datos = null, porDia = new Map(), meses = [], mesIdx = 0, diaSel = null, equipoSel = '', filtro = 'todos';

  // ---- Tarjeta de partido (vista General) ----
  function tarjetaPartido(p) {
    const st = estado(p);
    const a = el('article', 'cal-partido is-' + st);
    const top = el('div', 'cal-partido__top');
    const chip = el('span', 'cal-chip cal-chip--' + st, ETIQUETA[st]);
    if (st === 'directo') { const pulso = el('i', 'cal-pulso'); chip.prepend(pulso); }
    top.appendChild(chip);
    if (st === 'directo' && p.x) top.appendChild(el('span', 'cal-periodo', traducir(p.x)));
    if (p.po) top.appendChild(el('span', 'cal-tag', 'Playoffs'));
    a.appendChild(top);

    const hayMarcador = (st === 'final' || st === 'directo') && p.hs != null && p.vs != null;
    const gana = st === 'final' && hayMarcador ? (p.hs > p.vs ? 'h' : 'v') : '';
    const eqs = el('div', 'cal-partido__equipos');
    [['v', p.v, p.vs, 'Visitante'], ['h', p.h, p.hs, 'Local']].forEach(([lado, sigla, pts, rol]) => {
      const fila = el('div', 'cal-eq' + (gana && gana !== lado ? ' pierde' : '') + (gana === lado ? ' gana' : ''));
      fila.appendChild(el('span', 'cal-sigla', sigla));
      const n = el('span', 'cal-nombre', nombre(sigla));
      n.appendChild(el('small', '', rol));
      fila.appendChild(n);
      fila.appendChild(el('b', 'cal-pts', hayMarcador ? String(pts) : ''));
      eqs.appendChild(fila);
    });
    a.appendChild(eqs);

    const h = horarios(p);
    const hs = el('div', 'cal-partido__horas');
    if (!p.t) hs.appendChild(el('span', 'cal-hora', 'Hora por confirmar'));
    else {
      const es = el('span', 'cal-hora');
      es.appendChild(el('em', '', 'España'));
      es.appendChild(document.createTextNode(h.es + (h.extra ? ' · ' + h.extra : '')));
      const us = el('span', 'cal-hora');
      us.appendChild(el('em', '', 'EE. UU.'));
      us.appendChild(document.createTextNode(h.us + (h.ciudad ? ' · ' + h.ciudad : '')));
      hs.append(es, us);
    }
    a.appendChild(hs);
    return a;
  }

  // ---- Vista General ----
  function pintarMes() {
    const [y, m] = meses[mesIdx];
    $('calMesTitulo').textContent = cap(MESES[m]) + ' ' + y;
    $('calPrev').disabled = mesIdx === 0;
    $('calNext').disabled = mesIdx === meses.length - 1;
    const cont = $('calDias');
    cont.textContent = '';
    const primero = new Date(Date.UTC(y, m, 1, 12)).getUTCDay();
    const huecos = (primero + 6) % 7;
    const total = new Date(Date.UTC(y, m + 1, 0, 12)).getUTCDate();
    for (let i = 0; i < huecos; i++) cont.appendChild(el('span', 'cal-celda cal-celda--vacia'));
    const hoy = hoyET();
    for (let d = 1; d <= total; d++) {
      const clave = ymd(y, m, d);
      const lista = porDia.get(clave) || [];
      const b = el('button', 'cal-celda');
      b.type = 'button';
      b.dataset.dia = clave;
      b.appendChild(el('span', 'cal-celda__num', String(d)));
      if (lista.length) {
        const estados = lista.map(estado);
        b.classList.add('con-partidos');
        if (estados.includes('directo') || estados.includes('pendiente')) b.classList.add('hay-directo');
        else if (estados.every((s) => s === 'final' || s === 'aplazado')) b.classList.add('todo-jugado');
        b.appendChild(el('span', 'cal-celda__cant', String(lista.length)));
      }
      if (clave === hoy) b.classList.add('es-hoy');
      if (clave === diaSel) { b.classList.add('seleccionado'); b.setAttribute('aria-pressed', 'true'); } else b.setAttribute('aria-pressed', 'false');
      b.setAttribute('aria-label', tituloDia(clave) + ': ' + (lista.length ? lista.length + (lista.length === 1 ? ' partido' : ' partidos') : 'sin partidos'));
      b.addEventListener('click', () => { seleccionarDia(clave, true); });
      cont.appendChild(b);
    }
  }

  function pintarDia() {
    const lista = porDia.get(diaSel) || [];
    $('calDiaTitulo').textContent = tituloDia(diaSel);
    $('calDiaNum').textContent = lista.length ? lista.length + (lista.length === 1 ? ' partido' : ' partidos') : '';
    const cont = $('calDiaPartidos');
    cont.textContent = '';
    if (!lista.length) { cont.appendChild(el('p', 'cal-vacio', 'No hay partidos programados este día.')); return; }
    lista.forEach((p) => cont.appendChild(tarjetaPartido(p)));
  }

  function seleccionarDia(clave, desdeUsuario) {
    diaSel = clave;
    const [y, m] = clave.split('-').map(Number);
    const i = meses.findIndex(([yy, mm]) => yy === y && mm === m - 1);
    if (i >= 0) mesIdx = i;
    pintarMes(); pintarDia();
    if (desdeUsuario) {
      guardarHash();
      if (window.matchMedia('(max-width: 860px)').matches) $('calDiaTitulo').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function diaInicial() {
    const hoy = hoyET();
    const dias = [...porDia.keys()].sort();
    if (porDia.has(hoy)) return hoy;
    const sig = dias.find((d) => d > hoy);
    return sig || dias[dias.length - 1];
  }

  // ---- Vista Por equipos ----
  function prepararSelect() {
    const sel = $('calEquipo');
    ['Este', 'Oeste'].forEach((conf) => {
      const g = document.createElement('optgroup');
      g.label = 'Conferencia ' + conf;
      Object.keys(EQ).filter((s) => EQ[s][3] === conf).sort((a, b) => EQ[a][0].localeCompare(EQ[b][0], 'es')).forEach((s) => {
        const o = document.createElement('option'); o.value = s; o.textContent = EQ[s][0]; g.appendChild(o);
      });
      sel.appendChild(g);
    });
    sel.addEventListener('change', () => { equipoSel = sel.value; pintarEquipo(); guardarHash(); });
    $('calFiltros').querySelectorAll('.cal-filtro').forEach((b) => b.addEventListener('click', () => {
      filtro = b.dataset.f;
      $('calFiltros').querySelectorAll('.cal-filtro').forEach((x) => x.classList.toggle('activo', x === b));
      pintarEquipo();
    }));
  }

  function filaEquipo(p, sigla, esProximo) {
    const st = estado(p);
    const casa = p.h === sigla;
    const rival = casa ? p.v : p.h;
    const f = deYmd(p.d);
    const fila = el('article', 'cal-fila is-' + st + (esProximo ? ' es-proximo' : ''));
    if (esProximo) fila.id = 'calProximo';
    const fecha = el('div', 'cal-fila__fecha');
    fecha.appendChild(el('small', '', DIAS_C[f.getUTCDay()]));
    fecha.appendChild(el('b', '', String(f.getUTCDate())));
    fecha.appendChild(el('span', '', MESES_C[f.getUTCMonth()]));
    fila.appendChild(fecha);

    const info = el('div', 'cal-fila__info');
    const linea = el('div', 'cal-fila__rival');
    linea.appendChild(el('span', 'cal-lugar cal-lugar--' + (casa ? 'casa' : 'fuera'), casa ? 'Casa' : 'Fuera'));
    linea.appendChild(el('strong', '', (casa ? 'vs ' : '@ ') + nombre(rival)));
    if (p.po) linea.appendChild(el('span', 'cal-tag', 'Playoffs'));
    info.appendChild(linea);
    const h = horarios(p);
    info.appendChild(el('span', 'cal-fila__horas', p.t ? 'España ' + h.es + (h.extra ? ' (' + h.extra + ')' : '') + ' · EE. UU. ' + h.us + (h.ciudad ? ' (' + h.ciudad + ')' : '') : 'Hora por confirmar'));
    fila.appendChild(info);

    const res = el('div', 'cal-fila__res');
    if ((st === 'final' || st === 'directo') && p.hs != null && p.vs != null) {
      const mios = casa ? p.hs : p.vs, suyos = casa ? p.vs : p.hs;
      if (st === 'final') res.appendChild(el('span', 'cal-vd cal-vd--' + (mios > suyos ? 'v' : 'd'), mios > suyos ? 'V' : 'D'));
      else { const c = el('span', 'cal-chip cal-chip--directo', 'En juego'); c.prepend(el('i', 'cal-pulso')); res.appendChild(c); }
      res.appendChild(el('b', 'cal-fila__marcador', mios + '-' + suyos));
    } else res.appendChild(el('span', 'cal-chip cal-chip--' + st, ETIQUETA[st]));
    fila.appendChild(res);
    return fila;
  }

  function pintarEquipo() {
    const cont = $('calEquipoLista'), resumen = $('calResumen');
    cont.textContent = ''; resumen.textContent = '';
    if (!equipoSel) { cont.appendChild(el('p', 'cal-vacio', 'Elige un equipo para ver todos sus partidos de la temporada.')); return; }
    const todos = datos.partidos.filter((p) => p.h === equipoSel || p.v === equipoSel);
    if (!todos.length) { cont.appendChild(el('p', 'cal-vacio', 'Todavía no hay partidos publicados para este equipo.')); return; }

    // Resumen (solo temporada regular para el balance)
    let v = 0, d = 0, cv = 0, cd = 0, fv = 0, fd = 0;
    todos.forEach((p) => {
      if (p.po || estado(p) !== 'final' || p.hs == null) return;
      const casa = p.h === equipoSel, gano = casa ? p.hs > p.vs : p.vs > p.hs;
      if (gano) { v++; casa ? cv++ : fv++; } else { d++; casa ? cd++ : fd++; }
    });
    const proximo = todos.find((p) => ['proximo', 'directo', 'pendiente'].includes(estado(p)));
    const caja = (t, val) => { const c = el('div', 'cal-dato'); c.appendChild(el('small', '', t)); c.appendChild(el('b', '', val)); return c; };
    resumen.append(caja('Balance', v + '-' + d), caja('En casa', cv + '-' + cd), caja('Fuera', fv + '-' + fd), caja('Partidos', String(todos.length)));
    if (proximo) {
      const ir = el('button', 'cal-ir', 'Ir al próximo partido ↓');
      ir.type = 'button';
      ir.addEventListener('click', () => { filtro = 'todos'; $('calFiltros').querySelectorAll('.cal-filtro').forEach((x) => x.classList.toggle('activo', x.dataset.f === 'todos')); pintarEquipo(); const p = $('calProximo'); if (p) p.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
      resumen.appendChild(ir);
    }

    const lista = todos.filter((p) => {
      const st = estado(p);
      if (filtro === 'jugados') return st === 'final';
      if (filtro === 'proximos') return st !== 'final';
      return true;
    });
    if (!lista.length) { cont.appendChild(el('p', 'cal-vacio', filtro === 'jugados' ? 'Este equipo todavía no ha jugado ningún partido.' : 'No quedan partidos por jugar publicados.')); return; }
    let mesActual = '';
    let grupo = null;
    lista.forEach((p) => {
      const f = deYmd(p.d), clave = f.getUTCFullYear() + '-' + f.getUTCMonth();
      if (clave !== mesActual) {
        mesActual = clave;
        cont.appendChild(el('h3', 'cal-mes-sep', cap(MESES[f.getUTCMonth()]) + ' ' + f.getUTCFullYear()));
        grupo = el('div', 'cal-grupo'); cont.appendChild(grupo);
      }
      grupo.appendChild(filaEquipo(p, equipoSel, proximo && p.id === proximo.id));
    });
  }

  // ---- Pestañas ----
  const tabs = [$('tabGeneral'), $('tabEquipos')];
  function activarTab(i, enfocar) {
    tabs.forEach((t, k) => {
      const on = k === i;
      t.classList.toggle('activo', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      $(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (enfocar) tabs[i].focus();
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => { activarTab(i); guardarHash(); });
    t.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); activarTab(i === 0 ? 1 : 0, true); guardarHash(); }
    });
  });

  // ---- Enlaces compartibles: #2026-11-07 o #equipo-BOS ----
  function guardarHash() {
    const h = !$('panelEquipos').hidden ? (equipoSel ? '#equipo-' + equipoSel : '#equipos') : (diaSel ? '#' + diaSel : '');
    try { history.replaceState(null, '', location.pathname + location.search + h); } catch (e) {}
  }
  function leerHash() {
    const h = decodeURIComponent(location.hash.slice(1));
    if (/^equipo-[A-Z]{3}$/.test(h) && EQ[h.slice(7)]) { equipoSel = h.slice(7); $('calEquipo').value = equipoSel; activarTab(1); return null; }
    if (h === 'equipos') { activarTab(1); return null; }
    if (/^\d{4}-\d{2}-\d{2}$/.test(h)) return h;
    return null;
  }

  $('calPrev').addEventListener('click', () => { if (mesIdx > 0) { mesIdx--; pintarMes(); } });
  $('calNext').addEventListener('click', () => { if (mesIdx < meses.length - 1) { mesIdx++; pintarMes(); } });
  $('calHoy').addEventListener('click', () => { const d = diaInicial(); if (d) seleccionarDia(d, true); });

  // ---- Carga de datos ----
  function preparar(json) {
    datos = json;
    porDia = new Map();
    (datos.partidos || []).forEach((p) => { if (!porDia.has(p.d)) porDia.set(p.d, []); porDia.get(p.d).push(p); });
    porDia.forEach((l) => l.sort((a, b) => String(a.t || '9').localeCompare(String(b.t || '9'))));
    const dias = [...porDia.keys()].sort();
    meses = [];
    if (dias.length) {
      let [y, m] = dias[0].split('-').map(Number); m--;
      const [yf, mf] = dias[dias.length - 1].split('-').map(Number);
      while (y < yf || (y === yf && m <= mf - 1)) { meses.push([y, m]); m++; if (m > 11) { m = 0; y++; } }
    }
  }

  function textoActualizado() {
    if (!datos.actualizado) return '';
    const d = new Date(datos.actualizado);
    return 'Datos actualizados el ' + d.getDate() + ' de ' + MESES[d.getMonth()] + ' a las ' + horaEnZona(d, MAD) + ' (hora de España).';
  }

  function arrancar(json) {
    preparar(json);
    if (!meses.length) {
      aviso.textContent = 'El calendario todavía no está disponible: se cargará con la próxima actualización automática de datos.';
      aviso.classList.add('cal-aviso--vacio');
      $('panelGeneral').hidden = true; $('panelEquipos').hidden = true;
      document.querySelector('.cal-tabs').hidden = true;
      return;
    }
    const t = datos.temporada;
    aviso.textContent = (t ? 'Temporada ' + t + '-' + String(t + 1).slice(2) + '. ' : '') + textoActualizado() + (datos.partidos.some((p) => p.po) ? '' : ' Los playoffs aparecerán cuando se publique su calendario oficial.');
    prepararSelect();
    const desdeHash = leerHash();
    seleccionarDia(desdeHash && porDia.has(desdeHash) ? desdeHash : (desdeHash && /^\d{4}/.test(desdeHash) ? desdeHash : diaInicial()), false);
    pintarEquipo();
  }

  function recargar() {
    if (document.hidden || !datos) return;
    fetch(raiz.dataset.src.split('?')[0] + '?r=' + Date.now(), { cache: 'no-store' }).then((r) => r.json()).then((j) => {
      if (!j || j.actualizado === datos.actualizado) return;
      preparar(j);
      aviso.textContent = aviso.textContent.replace(/Datos actualizados.*?\(hora de España\)\./, textoActualizado());
      if (meses.length) { seleccionarDia(diaSel, false); pintarEquipo(); }
    }).catch(() => {});
  }

  fetch(raiz.dataset.src).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).then((j) => {
    arrancar(j);
    // mientras haya partidos de hoy en juego o por actualizar, revisa si hay datos nuevos cada 5 minutos
    setInterval(() => {
      const hoy = porDia.get(hoyET()) || [];
      if (hoy.some((p) => ['directo', 'pendiente'].includes(estado(p)))) recargar();
    }, 5 * 60000);
  }).catch(() => {
    aviso.textContent = 'No se ha podido cargar el calendario. Inténtalo de nuevo en unos minutos.';
    aviso.classList.add('cal-aviso--vacio');
  });
})();
