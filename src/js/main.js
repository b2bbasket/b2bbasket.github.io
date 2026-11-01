// 1) Barra de progreso y cabecera compacta al hacer scroll
const barra = document.getElementById('progreso');
const cabecera = document.getElementById('cabecera');
function alScroll() {
  const alto = document.documentElement.scrollHeight - window.innerHeight;
  barra.style.width = (alto > 0 ? (window.scrollY / alto) * 100 : 0) + '%';
  cabecera.classList.toggle('compacta', window.scrollY > 60);
}
window.addEventListener('scroll', alScroll, { passive: true });
alScroll();

// 2) Aparición suave de los elementos al entrar en pantalla
const observador = new IntersectionObserver((entradas) => {
  entradas.forEach((e) => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      observador.unobserve(e.target);
    }
  });
}, { threshold: 0.15 });
document.querySelectorAll('.revelar').forEach((el, i) => {
  el.style.transitionDelay = (i % 3) * 80 + 'ms';
  observador.observe(el);
});

// 3) Contadores animados
const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const contador = new IntersectionObserver((entradas) => {
  entradas.forEach((e) => {
    if (!e.isIntersecting) return;
    const el = e.target, meta = +el.dataset.contar;
    if (reducir) { el.textContent = meta; contador.unobserve(el); return; }
    const inicio = performance.now(), dur = 1400;
    (function paso(t) {
      const p = Math.min((t - inicio) / dur, 1);
      el.textContent = Math.round(meta * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(paso);
    })(inicio);
    contador.unobserve(el);
  });
}, { threshold: 0.6 });
document.querySelectorAll('[data-contar]').forEach((el) => contador.observe(el));

// 4) Menú móvil
const boton = document.getElementById('menuBoton');
const nav = document.getElementById('nav');
boton.addEventListener('click', () => {
  const abierto = nav.classList.toggle('abierto');
  boton.setAttribute('aria-expanded', abierto);
});
nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => {
  nav.classList.remove('abierto');
  boton.setAttribute('aria-expanded', 'false');
}));
