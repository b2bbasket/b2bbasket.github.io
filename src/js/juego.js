(function () {
  const el = document.getElementById('datos-juego');
  if (!el) return;
  const jugadores = JSON.parse(el.textContent);
  const limpiar = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
  const diaN = (f) => Math.floor(Date.parse(f + 'T00:00:00Z') / 86400000);
  const n = jugadores.length;
  const j = jugadores[(((diaN(hoy) - diaN('2026-01-01')) * 7) % n + n) % n];
  const maxIntentos = j.pistas.length;
  const KEY = 'b2b-juego';
  let datos = {};
  try { datos = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
  datos.stats = datos.stats || { jugadas: 0, aciertos: 0, racha: 0, ultimo: '' };
  let hoyEstado = datos.hoy && datos.hoy.dia === hoy ? datos.hoy : { dia: hoy, intentos: [], fin: false, acierto: false };
  const guardar = () => { datos.hoy = hoyEstado; try { localStorage.setItem(KEY, JSON.stringify(datos)); } catch (e) {} };

  const lista = document.getElementById('juegoPistas');
  const form = document.getElementById('juegoForm');
  const campo = document.getElementById('juegoCampo');
  const mensaje = document.getElementById('juegoMensaje');
  const fin = document.getElementById('juegoFin');
  const resultado = document.getElementById('juegoResultado');
  const statsEl = document.getElementById('juegoStats');
  const rachaEl = document.getElementById('juegoRacha');
  const rachaNum = document.getElementById('juegoRachaNum');
  const rachaTxt = document.getElementById('juegoRachaTxt');
  const sug = document.getElementById('juegoSugerencias');
  let animarRacha = false;


  // ---- Racha de aciertos seguidos ----
  function rachaActual() {
    const s = datos.stats;
    const ayer = new Date(diaN(hoy) * 86400000 - 86400000).toISOString().slice(0, 10);
    return (s.ultimo === hoy || s.ultimo === ayer) ? (s.racha || 0) : 0;
  }
  function pintarRacha(animar) {
    const n = rachaActual();
    rachaNum.textContent = n;
    rachaTxt.textContent = n === 1 ? 'acierto seguido' : 'aciertos seguidos';
    rachaEl.classList.toggle('activa', n >= 2);
    rachaEl.setAttribute('aria-label', 'Racha actual: ' + n + (n === 1 ? ' acierto seguido' : ' aciertos seguidos'));
    if (animar && n >= 1) {
      rachaEl.classList.remove('sube'); void rachaEl.offsetWidth; rachaEl.classList.add('sube');
      setTimeout(() => rachaEl.classList.remove('sube'), 900);
    }
  }

  // ---- Autocompletado: solo aparece cuando el usuario escribe ----
  const nombres = jugadores.map((x) => x.nombre).sort((p, q) => p.localeCompare(q, 'es'));
  let opciones = [], activo = -1;
  function coincide(nombre, q) {
    const palabras = limpiar(nombre).split(' ');
    return q.split(' ').every((t) => palabras.some((w) => w.startsWith(t)));
  }
  function cerrarSug() {
    sug.hidden = true; sug.textContent = ''; opciones = []; activo = -1;
    campo.setAttribute('aria-expanded', 'false'); campo.removeAttribute('aria-activedescendant');
  }
  function marcar(i) {
    activo = i;
    Array.prototype.forEach.call(sug.children, (li, k) => li.classList.toggle('activa', k === i));
    if (i >= 0) campo.setAttribute('aria-activedescendant', 'sug-' + i); else campo.removeAttribute('aria-activedescendant');
  }
  function elegir(nombre) { campo.value = nombre; cerrarSug(); campo.focus(); }
  function mostrarSug() {
    const q = limpiar(campo.value);
    if (!q) { cerrarSug(); return; }
    opciones = nombres.filter((nm) => coincide(nm, q)).slice(0, 6);
    sug.textContent = ''; activo = -1;
    if (!opciones.length) { cerrarSug(); return; }
    opciones.forEach((nm, i) => {
      const li = document.createElement('li');
      li.id = 'sug-' + i; li.setAttribute('role', 'option'); li.textContent = nm;
      li.addEventListener('mousedown', (e) => { e.preventDefault(); elegir(nm); });
      sug.appendChild(li);
    });
    sug.hidden = false; campo.setAttribute('aria-expanded', 'true');
  }
  campo.addEventListener('input', mostrarSug);
  campo.addEventListener('keydown', (e) => {
    if (sug.hidden || !opciones.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); marcar((activo + 1) % opciones.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); marcar((activo - 1 + opciones.length) % opciones.length); }
    else if (e.key === 'Enter' && activo >= 0) { e.preventDefault(); elegir(opciones[activo]); }
    else if (e.key === 'Escape') cerrarSug();
  });
  campo.addEventListener('blur', () => setTimeout(cerrarSug, 120));

  function acierta(txt) {
    const g = limpiar(txt);
    if (!g) return false;
    return [j.nombre].concat(j.alias || []).some((a) => limpiar(a) === g);
  }
  function pintar() {
    lista.textContent = '';
    const visibles = hoyEstado.fin ? maxIntentos : Math.min(maxIntentos, hoyEstado.intentos.length + 1);
    for (let i = 0; i < visibles; i++) { const li = document.createElement('li'); li.textContent = j.pistas[i]; lista.appendChild(li); }
    mensaje.textContent = hoyEstado.fin ? '' : 'Intento ' + (hoyEstado.intentos.length + 1) + ' de ' + maxIntentos + (hoyEstado.intentos.length ? ' · Fallos: ' + hoyEstado.intentos.join(', ') : '');
    form.hidden = hoyEstado.fin;
    fin.hidden = !hoyEstado.fin;
    if (hoyEstado.fin) {
      resultado.textContent = hoyEstado.acierto ? '¡Correcto! Era ' + j.nombre + '. Lo has resuelto en ' + hoyEstado.intentos.length + (hoyEstado.intentos.length === 1 ? ' intento.' : ' intentos.') : 'Se acabaron los intentos. Era ' + j.nombre + '.';
      const s = datos.stats;
      if (hoyEstado.acierto && s.racha >= 2) resultado.textContent += ' 🔥 ¡Racha de ' + s.racha + '!';
      statsEl.textContent = 'Jugadas: ' + s.jugadas + ' · Aciertos: ' + s.aciertos + ' · Racha: ' + s.racha;
    }
    pintarRacha(animarRacha); animarRacha = false;
  }
  function terminar(acierto) {
    hoyEstado.fin = true; hoyEstado.acierto = acierto;
    const s = datos.stats; const ayer = new Date(diaN(hoy) * 86400000 - 86400000).toISOString().slice(0, 10);
    s.jugadas++;
    if (acierto) { s.aciertos++; s.racha = s.ultimo === ayer ? s.racha + 1 : 1; s.ultimo = hoy; animarRacha = true; } else { s.racha = 0; }
  }
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    cerrarSug();
    const txt = campo.value.trim();
    if (!txt || hoyEstado.fin) return;
    campo.value = '';
    if (acierta(txt)) { hoyEstado.intentos.push(j.nombre); terminar(true); }
    else { hoyEstado.intentos.push(txt); if (hoyEstado.intentos.length >= maxIntentos) terminar(false); }
    guardar(); pintar();
  });
  document.getElementById('juegoCompartir').addEventListener('click', (e) => {
    const bolas = hoyEstado.acierto ? '🏀'.repeat(hoyEstado.intentos.length) + ' ✅' : '❌';
    const t = 'Back to Back · Adivina el jugador (' + hoy + ')\n' + bolas + '\n' + location.href;
    const ok = () => { const b = e.target, x = b.textContent; b.textContent = '¡Copiado!'; setTimeout(() => { b.textContent = x; }, 1800); };
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(ok).catch(() => window.prompt('Copia tu resultado:', t)); else window.prompt('Copia tu resultado:', t);
  });
  pintar();
})();
