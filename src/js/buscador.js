(function () {
  const campo = document.getElementById('buscador');
  const caja = document.getElementById('resultadosBusqueda');
  const contador = document.getElementById('contadorBusqueda');
  if (!campo) return;
  const base = campo.dataset.base;
  let datos = [];
  const limpiar = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  fetch(base + 'buscador.json').then((r) => r.json()).then((d) => { datos = d; pintar(); }).catch(() => {
    caja.textContent = 'No se ha podido cargar el buscador.';
  });
  function pintar() {
    const palabras = limpiar(campo.value.trim()).split(/\s+/).filter(Boolean);
    caja.textContent = '';
    contador.textContent = '';
    if (!palabras.length) return;
    const res = datos.filter((i) => {
      const texto = limpiar(i.t + ' ' + i.r + ' ' + i.k);
      return palabras.every((p) => texto.includes(p));
    });
    contador.textContent = res.length ? res.length + (res.length === 1 ? ' resultado' : ' resultados') : 'No hay resultados. Prueba con otra palabra.';
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
  const q0 = new URLSearchParams(location.search).get('q');
  if (q0) campo.value = q0;
  campo.addEventListener('input', pintar);
  document.querySelectorAll('#sugerencias button').forEach((b) => b.addEventListener('click', () => {
    campo.value = b.dataset.q; pintar(); campo.focus();
  }));
})();
