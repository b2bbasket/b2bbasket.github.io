(function () {
  const campo = document.getElementById('buscador');
  const caja = document.getElementById('resultadosBusqueda');
  if (!campo) return;
  const base = campo.dataset.base;
  let datos = [];
  const limpiar = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  fetch(base + 'buscador.json').then((r) => r.json()).then((d) => { datos = d; pintar(); }).catch(() => {
    caja.textContent = 'No se ha podido cargar el buscador.';
  });
  function pintar() {
    const q = limpiar(campo.value.trim());
    caja.textContent = '';
    if (!q) return;
    const res = datos.filter((i) => limpiar(i.t + ' ' + i.r).includes(q));
    if (!res.length) { caja.textContent = 'No hay resultados.'; return; }
    res.forEach((i) => {
      const a = document.createElement('a');
      a.className = 'resultado';
      a.href = base.replace(/\/$/, '') + i.u;
      const k = document.createElement('small'); k.textContent = i.k;
      const t = document.createElement('strong'); t.textContent = i.t;
      const r = document.createElement('span'); r.textContent = i.r;
      a.append(k, t, r);
      caja.appendChild(a);
    });
  }
  campo.addEventListener('input', pintar);
})();
