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

// 5) Titular del destacado: aparece palabra a palabra
const tituloHero = document.querySelector('.hero__titulo');
if (tituloHero && !reducir) {
  const palabras = tituloHero.textContent.trim().split(/\s+/);
  tituloHero.textContent = '';
  palabras.forEach((p, i) => {
    const s = document.createElement('span');
    s.className = 'palabra';
    s.style.animationDelay = i * 70 + 'ms';
    s.textContent = p;
    tituloHero.appendChild(s);
    tituloHero.appendChild(document.createTextNode(' '));
  });
}

// 6) Efecto parallax suave en la imagen del destacado
const fondoHero = document.querySelector('.hero__fondo');
if (fondoHero && !reducir) {
  window.addEventListener('scroll', () => {
    if (window.scrollY < 900) {
      fondoHero.style.transform = 'translateY(' + window.scrollY * 0.12 + 'px) scale(1.1)';
    }
  }, { passive: true });
}

// 7) Las tarjetas se inclinan ligeramente al pasar el ratón (solo en ordenador)
if (!reducir && window.matchMedia('(hover: hover)').matches) {
  document.querySelectorAll('.tarjeta').forEach((c) => {
    c.addEventListener('mousemove', (e) => {
      const r = c.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      c.style.setProperty('--ry', x * 8 + 'deg');
      c.style.setProperty('--rx', -y * 8 + 'deg');
    });
    c.addEventListener('mouseleave', () => {
      c.style.setProperty('--rx', '0deg');
      c.style.setProperty('--ry', '0deg');
    });
  });
}

// 8) Botón para volver arriba
const botonSubir = document.getElementById('subir');
if (botonSubir) {
  window.addEventListener('scroll', () => {
    botonSubir.classList.toggle('visible', window.scrollY > 500);
  }, { passive: true });
  botonSubir.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reducir ? 'auto' : 'smooth' });
  });
}

// 9) Carrusel de la portada (dedo en el móvil, flechas del teclado y botones en ordenador)
const pistaSlider = document.getElementById('sliderPista');
if (pistaSlider) {
  const slider = document.getElementById('slider');
  const slides = Array.from(pistaSlider.children);
  const puntos = document.getElementById('sliderPuntos');
  if (slides.length < 2) slider.classList.add('solo');
  slides.forEach((_, i) => {
    const b = document.createElement('button');
    b.setAttribute('aria-label', 'Ir a la noticia ' + (i + 1));
    b.addEventListener('click', () => ir(i));
    puntos.appendChild(b);
  });
  const actual = () => Math.round(pistaSlider.scrollLeft / pistaSlider.clientWidth);
  function ir(i) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    pistaSlider.scrollTo({ left: i * pistaSlider.clientWidth, behavior: reducir ? 'auto' : 'smooth' });
  }
  function marcar() {
    const a = actual();
    Array.from(puntos.children).forEach((b, i) => b.classList.toggle('activo', i === a));
  }
  pistaSlider.addEventListener('scroll', () => requestAnimationFrame(marcar), { passive: true });
  marcar();
  document.getElementById('sliderIzq').addEventListener('click', () => ir(actual() - 1));
  document.getElementById('sliderDer').addEventListener('click', () => ir(actual() + 1));
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const tag = (document.activeElement || {}).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    const r = slider.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) return;
    ir(actual() + (e.key === 'ArrowRight' ? 1 : -1));
  });
}

// 10) Pestañas de la ficha de equipo
document.querySelectorAll('.pestana').forEach((b) => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.pestana').forEach((x) => x.classList.toggle('activa', x === b));
    document.querySelectorAll('.panel-pestana').forEach((p) => { p.hidden = p.id !== 'panel-' + b.dataset.panel; });
  });
});
