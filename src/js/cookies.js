(function () {
  const CLAVE = 'cookies-consentimiento';
  const banner = document.getElementById('cookies');
  if (!banner) return;
  let estado = null;
  try { estado = localStorage.getItem(CLAVE); } catch (e) {}
  function activar() {
    document.querySelectorAll('script[type="text/plain"][data-categoria]').forEach((s) => {
      const n = document.createElement('script');
      if (s.src) n.src = s.src; else n.textContent = s.textContent;
      document.head.appendChild(n);
      s.remove();
    });
  }
  function guardar(v) {
    try { localStorage.setItem(CLAVE, v); } catch (e) {}
    banner.hidden = true;
    if (v === 'aceptado') activar();
  }
  if (!estado) banner.hidden = false;
  else if (estado === 'aceptado') activar();
  document.getElementById('cookiesAceptar').addEventListener('click', () => guardar('aceptado'));
  document.getElementById('cookiesRechazar').addEventListener('click', () => guardar('rechazado'));
  const pref = document.getElementById('cookiesPreferencias');
  if (pref) pref.addEventListener('click', (e) => { e.preventDefault(); banner.hidden = false; });
})();
