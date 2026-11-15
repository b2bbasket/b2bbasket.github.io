// «Adivina el jugador»: cuatro dificultades, cada una con su jugador del día,
// puntos según la dificultad y las pistas usadas, y una racha de días seguidos acertando
// que no depende de la dificultad.
(function () {
  const script = document.getElementById('scriptJuego');
  if (!script) return;
  const carga = document.getElementById('juegoCarga');
  fetch(script.dataset.datos).then((r) => r.json()).then(iniciar).catch(() => {
    if (carga) carga.textContent = 'No se ha podido cargar el juego. Recarga la página para intentarlo de nuevo.';
  });

  function iniciar(datosJuego) {
    if (carga) carga.hidden = true;
    const NIVELES = {};
    datosJuego.niveles.forEach((n) => { NIVELES[n.clave] = n; });
    const grupos = datosJuego.grupos;
    const todos = [].concat(...Object.values(grupos));

    const limpiar = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
    const diaN = (f) => Math.floor(Date.parse(f + 'T00:00:00Z') / 86400000);
    const ayer = new Date(diaN(hoy) * 86400000 - 86400000).toISOString().slice(0, 10);

    // ---- Puntos: la base de la dificultad, menos una quinta parte por cada pista extra ----
    // 1 pista: 100 % · 2: 80 % · 3: 60 % · 4: 40 % · 5: 20 % · fallo: 0
    const puntosCon = (nivel, pistas) => Math.max(0, Math.round(NIVELES[nivel].puntos * (6 - pistas) / 5));

    // ---- Jugador del día de cada nivel, sin repeticiones hasta agotar el grupo ----
    function barajar(lista, semilla) {
      let t = semilla >>> 0;
      const azar = () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
      const a = lista.slice();
      for (let i = a.length - 1; i > 0; i--) { const k = Math.floor(azar() * (i + 1)); [a[i], a[k]] = [a[k], a[i]]; }
      return a;
    }
    const dia = Math.max(0, diaN(hoy) - diaN('2026-11-10'));
    function jugadorDelDia(nivel, sal) {
      const g = grupos[nivel];
      const lista = g.map((x, i) => i).sort((a, b) => g[a].nombre.localeCompare(g[b].nombre, 'en'));
      const n = lista.length, vuelta = Math.floor(dia / n);
      const orden = (v) => barajar(lista, 20261110 + v * 7919 + sal * 104729);
      let a = orden(vuelta);
      // Al empezar una vuelta, los que salieron en la segunda mitad de la anterior van al final
      if (vuelta > 0) { const rec = new Set(orden(vuelta - 1).slice(Math.floor(n / 2))); a = a.filter((i) => !rec.has(i)).concat(a.filter((i) => rec.has(i))); }
      return g[a[dia % n]];
    }
    const delDia = {};
    Object.keys(NIVELES).forEach((k, i) => { delDia[k] = jugadorDelDia(k, i + 1); });

    // ---- Nombres aceptados: completo o, si no se repite, solo el apellido ----
    const apellido = (nm) => limpiar(nm).split(' ').filter((p) => !/^(jr|sr|ii|iii|iv)$/.test(p)).slice(-1)[0];
    const cuentaApellidos = {};
    todos.forEach((x) => { const a = apellido(x.nombre); cuentaApellidos[a] = (cuentaApellidos[a] || 0) + 1; });

    // ---- Datos guardados en el navegador ----
    const KEY = 'b2b-juego';
    let datos = {};
    try { datos = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
    datos.stats = datos.stats || { jugadas: 0, aciertos: 0, racha: 0, ultimo: '' };
    if (typeof datos.puntos !== 'number') datos.puntos = 0;
    // Partidas de hoy, una por nivel
    if (!datos.dia || datos.dia.fecha !== hoy) datos.dia = { fecha: hoy, partidas: {} };
    const partida = (nivel) => (datos.dia.partidas[nivel] = datos.dia.partidas[nivel] || { intentos: [], fin: false, acierto: false, puntos: 0 });
    const guardar = () => { delete datos.hoy; try { localStorage.setItem(KEY, JSON.stringify(datos)); } catch (e) {} };

    const $ = (id) => document.getElementById(id);
    const el = {
      niveles: $('juegoNiveles'), partida: $('juegoPartida'), chip: $('juegoNivelChip'), potencial: $('juegoPotencial'),
      premioPre: $('juegoPremioPre'), barra: $('juegoBarra'), lista: $('juegoPistas'),
      form: $('juegoForm'), campo: $('juegoCampo'), sug: $('juegoSugerencias'), mensaje: $('juegoMensaje'),
      fin: $('juegoFin'), resultado: $('juegoResultado'), recompensa: $('juegoRecompensa'), ganados: $('juegoGanados'),
      fuente: $('juegoFuente'), stats: $('juegoStats'), racha: $('juegoRacha'), rachaNum: $('juegoRachaNum'),
      rachaTxt: $('juegoRachaTxt'), puntos: $('juegoPuntos'), total: $('juegoTotal'),
    };
    let actual = null;      // nivel en juego
    let celebrar = false;   // animar la recompensa solo justo al acertar

    // ---- Racha: días seguidos con al menos un acierto, en cualquier dificultad ----
    const rachaActual = () => (datos.stats.ultimo === hoy || datos.stats.ultimo === ayer ? datos.stats.racha || 0 : 0);
    function salta(nodo) { nodo.classList.remove('sube'); void nodo.offsetWidth; nodo.classList.add('sube'); setTimeout(() => nodo.classList.remove('sube'), 900); }
    function pintarMarcador(animar) {
      const n = rachaActual();
      el.rachaNum.textContent = n;
      el.rachaTxt.textContent = n === 1 ? 'día seguido' : 'días seguidos';
      el.racha.classList.toggle('activa', n >= 1);
      el.racha.setAttribute('aria-label', 'Racha: ' + n + (n === 1 ? ' día seguido' : ' días seguidos') + ' acertando');
      el.puntos.textContent = datos.puntos;
      if (animar) { salta(el.racha); salta(el.total); }
      const s = datos.stats;
      el.stats.textContent = s.jugadas ? 'Partidas: ' + s.jugadas + ' · Aciertos: ' + s.aciertos + ' · Mejor racha: ' + Math.max(s.mejor || 0, s.racha || 0) + (Math.max(s.mejor || 0, s.racha || 0) === 1 ? ' día' : ' días') : '';
    }

    // ---- Tarjetas de dificultad ----
    function pintarNiveles() {
      document.querySelectorAll('.jg-nivel').forEach((b) => {
        const p = datos.dia.partidas[b.dataset.nivel];
        const est = b.querySelector('[data-estado]');
        b.classList.remove('ganado', 'perdido');
        if (p && p.fin) { b.classList.add(p.acierto ? 'ganado' : 'perdido'); est.textContent = p.acierto ? '✓ +' + p.puntos + ' puntos' : 'Fallado · ver solución'; }
        else if (p && p.intentos.length) est.textContent = 'Continuar (' + p.intentos.length + '/5)';
        else est.textContent = 'Jugar';
      });
    }

    // ---- Partida ----
    function pintarPartida() {
      const nv = NIVELES[actual], j = delDia[actual], p = partida(actual);
      el.partida.style.setProperty('--nv', nv.color);
      el.chip.textContent = nv.nombre;
      const max = j.pistas.length;
      const vistas = p.fin ? max : Math.min(max, p.intentos.length + 1);
      el.lista.textContent = '';
      for (let i = 0; i < vistas; i++) {
        const li = document.createElement('li'); li.textContent = j.pistas[i];
        if (!p.fin && i === vistas - 1 && i > 0) li.classList.add('nueva');
        el.lista.appendChild(li);
      }
      // Recompensa: lo que aún se puede ganar, o lo ganado al terminar
      const anterior = Number(el.potencial.textContent);
      const ahora = p.fin ? p.puntos : puntosCon(actual, vistas);
      el.premioPre.textContent = p.fin ? (p.acierto ? 'Has ganado' : 'Esta vez sumas') : 'Puedes ganar';
      el.potencial.textContent = ahora;
      if (!p.fin && ahora < anterior) { el.potencial.classList.remove('baja'); void el.potencial.offsetWidth; el.potencial.classList.add('baja'); }
      // Barra de 5 segmentos: se apaga uno por cada pista extra
      const apagados = p.fin ? (p.acierto ? p.intentos.length - 1 : 5) : vistas - 1;
      Array.prototype.forEach.call(el.barra.children, (seg, i) => seg.classList.toggle('usada', i >= 5 - apagados));
      el.form.hidden = p.fin;
      el.mensaje.textContent = p.fin ? '' : 'Intento ' + (p.intentos.length + 1) + ' de ' + max + (p.intentos.length ? ' · Fallos: ' + p.intentos.join(', ') : '');
      el.fin.hidden = !p.fin;
      el.recompensa.hidden = !(p.fin && p.acierto);
      if (p.fin) {
        el.ganados.textContent = p.puntos;
        el.resultado.textContent = p.acierto
          ? '¡Correcto! Era ' + j.nombre + '. Lo has resuelto con ' + p.intentos.length + (p.intentos.length === 1 ? ' pista.' : ' pistas.')
          : 'Se acabaron los intentos. Era ' + j.nombre + '.';
        el.fuente.textContent = '';
        if (j.fuente) { const a = document.createElement('a'); a.href = j.fuente; a.rel = 'noopener'; a.target = '_blank'; a.textContent = 'Fuente de las pistas: Wikipedia y Wikidata'; el.fuente.appendChild(a); }
        if (celebrar && p.acierto) { el.recompensa.style.animation = 'none'; void el.recompensa.offsetWidth; el.recompensa.style.animation = ''; }
      }
    }
    function abrir(nivel) {
      actual = nivel;
      el.potencial.textContent = puntosCon(nivel, 1);
      el.niveles.hidden = true; el.partida.hidden = false;
      pintarPartida();
      el.partida.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (!partida(nivel).fin) setTimeout(() => el.campo.focus({ preventScroll: true }), 350);
    }
    function cerrar() {
      actual = null; cerrarSug();
      el.partida.hidden = true; el.niveles.hidden = false;
      pintarNiveles();
      el.niveles.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function terminar(acierto) {
      const p = partida(actual), s = datos.stats;
      p.fin = true; p.acierto = acierto;
      p.puntos = acierto ? puntosCon(actual, p.intentos.length) : 0;
      s.jugadas++;
      if (acierto) {
        s.aciertos++;
        datos.puntos += p.puntos;
        // La racha sube una vez al día, con el primer acierto en cualquier dificultad.
        // Fallar un nivel no la rompe: solo se pierde si pasa un día entero sin acertar.
        if (s.ultimo !== hoy) { s.racha = s.ultimo === ayer ? (s.racha || 0) + 1 : 1; s.ultimo = hoy; }
        s.mejor = Math.max(s.mejor || 0, s.racha);
        celebrar = true;
      }
    }

    // ---- Autocompletado ----
    const nombres = todos.map((x) => x.nombre).sort((p, q) => p.localeCompare(q, 'es'));
    let opciones = [], activo = -1;
    const coincide = (nombre, q) => { const w = limpiar(nombre).split(' '); return q.split(' ').every((t) => w.some((x) => x.startsWith(t))); };
    function cerrarSug() { el.sug.hidden = true; el.sug.textContent = ''; opciones = []; activo = -1; el.campo.setAttribute('aria-expanded', 'false'); el.campo.removeAttribute('aria-activedescendant'); }
    function marcar(i) {
      activo = i;
      Array.prototype.forEach.call(el.sug.children, (li, k) => li.classList.toggle('activa', k === i));
      if (i >= 0) el.campo.setAttribute('aria-activedescendant', 'sug-' + i); else el.campo.removeAttribute('aria-activedescendant');
    }
    function elegir(nombre) { el.campo.value = nombre; cerrarSug(); el.campo.focus(); }
    function mostrarSug() {
      const q = limpiar(el.campo.value);
      if (!q) { cerrarSug(); return; }
      opciones = nombres.filter((nm) => coincide(nm, q)).slice(0, 6);
      el.sug.textContent = ''; activo = -1;
      if (!opciones.length) { cerrarSug(); return; }
      opciones.forEach((nm, i) => {
        const li = document.createElement('li');
        li.id = 'sug-' + i; li.setAttribute('role', 'option'); li.textContent = nm;
        li.addEventListener('mousedown', (e) => { e.preventDefault(); elegir(nm); });
        el.sug.appendChild(li);
      });
      el.sug.hidden = false; el.campo.setAttribute('aria-expanded', 'true');
    }
    el.campo.addEventListener('input', mostrarSug);
    el.campo.addEventListener('keydown', (e) => {
      if (el.sug.hidden || !opciones.length) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); marcar((activo + 1) % opciones.length); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); marcar((activo - 1 + opciones.length) % opciones.length); }
      else if (e.key === 'Enter' && activo >= 0) { e.preventDefault(); elegir(opciones[activo]); }
      else if (e.key === 'Escape') cerrarSug();
    });
    el.campo.addEventListener('blur', () => setTimeout(cerrarSug, 120));

    function acierta(txt) {
      const g = limpiar(txt), j = delDia[actual];
      if (!g) return false;
      if (g === limpiar(j.nombre)) return true;
      const ap = apellido(j.nombre);
      return g === ap && cuentaApellidos[ap] === 1;
    }
    el.form.addEventListener('submit', (e) => {
      e.preventDefault(); cerrarSug();
      const p = partida(actual), txt = el.campo.value.trim();
      if (!txt || p.fin) return;
      el.campo.value = '';
      if (acierta(txt)) { p.intentos.push(delDia[actual].nombre); terminar(true); }
      else { p.intentos.push(txt); if (p.intentos.length >= delDia[actual].pistas.length) terminar(false); }
      guardar(); pintarPartida(); pintarMarcador(celebrar); celebrar = false;
      if (!p.fin) el.campo.focus();
    });

    document.querySelectorAll('.jg-nivel').forEach((b) => b.addEventListener('click', () => abrir(b.dataset.nivel)));
    $('juegoVolver').addEventListener('click', cerrar);
    $('juegoOtro').addEventListener('click', cerrar);
    $('juegoCompartir').addEventListener('click', (e) => {
      const p = partida(actual), nv = NIVELES[actual];
      const bolas = p.acierto ? '🏀'.repeat(p.intentos.length) + ' ✅ +' + p.puntos + ' pts' : '❌';
      const r = rachaActual();
      const t = 'B2B Basket · Adivina el jugador · ' + nv.nombre + ' (' + hoy + ')\n' + bolas + (r >= 2 ? '\n🔥 ' + r + ' días seguidos' : '') + '\n' + location.href;
      const b = e.currentTarget, ok = () => { const x = b.textContent; b.textContent = '¡Copiado!'; setTimeout(() => { b.textContent = x; }, 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(ok).catch(() => window.prompt('Copia tu resultado:', t));
      else window.prompt('Copia tu resultado:', t);
    });

    guardar();
    pintarNiveles();
    pintarMarcador(false);
  }
})();
