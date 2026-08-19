// ─── NAVBAR SCROLL ───
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
});

// ─── HAMBURGER ───
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
hamburger.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
});
mobileMenu.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => mobileMenu.classList.remove('open'));
});

// ─── SCROLL REVEAL ───
const reveals = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
  });
}, { threshold: 0.12 });
reveals.forEach(el => observer.observe(el));

// ─── COUNTER ANIMATION ───
function animateCounter(el, target, duration = 2000) {
  const isFloat = String(target).includes('.');
  const start = performance.now();
  const update = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(ease * target);
    el.textContent = current >= 1000 ? current.toLocaleString('en-IN') : current;
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = target >= 1000 ? target.toLocaleString('en-IN') : target;
  };
  requestAnimationFrame(update);
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const target = parseInt(e.target.dataset.target);
      animateCounter(e.target, target);
      counterObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.3 });

document.querySelectorAll('[data-target]').forEach(el => counterObserver.observe(el));

// ─── CONTACT FORM ───
const form = document.getElementById('contactForm');
const submitBtn = document.getElementById('submitBtn');
const formSuccess = document.getElementById('formSuccess');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="animation:spin .6s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Sending...`;
  setTimeout(() => {
    submitBtn.style.display = 'none';
    formSuccess.classList.add('show');
    form.querySelectorAll('input,select,textarea').forEach(f => { f.value = ''; f.disabled = true; });
  }, 1400);
});

// spin keyframe via JS
const style = document.createElement('style');
style.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
document.head.appendChild(style);

// ─── SMOOTH ANCHOR SCROLL ───
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const offset = 80;
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
    }
  });
});

// ─── SCROLL TO TOP ───
const scrollTopBtn = document.getElementById('scrollTop');
window.addEventListener('scroll', () => {
  scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
});
scrollTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ─── ACTIVE NAV ON SCROLL ───
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
const activateNav = () => {
  let current = '';
  sections.forEach(s => {
    if (window.scrollY >= s.offsetTop - 120) current = s.id;
  });
  navLinks.forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === '#' + current);
  });
};
window.addEventListener('scroll', activateNav, { passive: true });

// ─── CURSOR GLOW FOLLOWER ───
const cursorGlow = document.getElementById('cursorGlow');
if (cursorGlow) {
  window.addEventListener('mousemove', (e) => {
    cursorGlow.style.left = `${e.clientX}px`;
    cursorGlow.style.top = `${e.clientY}px`;
  });
}

// ─── 3D CARD TILT EFFECT ───
document.querySelectorAll('.tilt-card').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const tiltX = (y / rect.height) * -12;
    const tiltY = (x / rect.width) * 12;
    card.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-4px)`;
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
  });
});

// ─── FIREFLIES / PARALLAX PARTICLES IN DARK SECTION ───
const firefliesContainer = document.getElementById('firefliesContainer');
if (firefliesContainer) {
  const particleCount = 18;
  for (let i = 0; i < particleCount; i++) {
    const f = document.createElement('div');
    f.className = 'firefly';
    f.style.left = `${Math.random() * 100}%`;
    f.style.top = `${Math.random() * 100}%`;
    f.style.animationDuration = `${6 + Math.random() * 8}s`;
    f.style.animationDelay = `${Math.random() * 5}s`;
    firefliesContainer.appendChild(f);
  }
}



