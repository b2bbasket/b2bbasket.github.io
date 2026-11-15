// Horarios por país: España (por defecto), México, Argentina o Colombia.
// La elección se recuerda en el navegador. Cualquier elemento con data-hora="<fecha ISO>" se
// reescribe en la zona elegida, y el calendario se vuelve a pintar (evento «b2b:zona»).
(function () {
  var ZONAS = {
    es: { nombre: 'España', tz: 'Europe/Madrid' },
    mx: { nombre: 'México', tz: 'America/Mexico_City' },
    ar: { nombre: 'Argentina', tz: 'America/Argentina/Buenos_Aires' },
    co: { nombre: 'Colombia', tz: 'America/Bogota' },
  };
  var clave = 'es';
  try { var g = localStorage.getItem('b2b-zona'); if (ZONAS[g]) clave = g; } catch (e) {}
  function actual() { return { clave: clave, nombre: ZONAS[clave].nombre, tz: ZONAS[clave].tz }; }
  window.b2bZona = actual();
  function texto(iso) {
    var d = new Date(iso); if (isNaN(d)) return null;
    var tz = ZONAS[clave].tz;
    var dia = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short', timeZone: tz }).format(d).replace(/\./g, '');
    var hora = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: tz }).format(d);
    return dia + ' · ' + hora + (clave === 'es' ? '' : ' (' + ZONAS[clave].nombre + ')');
  }
  function reescribir() {
    document.querySelectorAll('[data-hora]').forEach(function (n) { var t = texto(n.dataset.hora); if (t) n.textContent = t; });
    document.querySelectorAll('[data-zona-nombre]').forEach(function (n) { n.textContent = ZONAS[clave].nombre; });
    document.querySelectorAll('.zona-selector button').forEach(function (b) { var ok = b.dataset.zona === clave; b.classList.toggle('activo', ok); b.setAttribute('aria-pressed', ok); });
  }
  function elegir(c) {
    if (!ZONAS[c] || c === clave) return;
    clave = c; window.b2bZona = actual();
    try { localStorage.setItem('b2b-zona', c); } catch (e) {}
    reescribir();
    document.dispatchEvent(new CustomEvent('b2b:zona', { detail: window.b2bZona }));
  }
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('.zona-selector button'); if (b) elegir(b.dataset.zona); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', reescribir); else reescribir();
})();
