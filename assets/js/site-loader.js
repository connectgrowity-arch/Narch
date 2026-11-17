/**
 * N Arch Site Loader & CMS Engine
 * Syncs site content from site-content.json / localStorage, manages transitions, and drives SEO interactions.
 */
(function() {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // 1. Load Content from localStorage or site-content.json
  let content = null;
  try {
    const local = localStorage.getItem('narch_cms_content');
    if (local) content = JSON.parse(local);
  } catch (e) {}

  async function initContent() {
    try {
      const res = await fetch('site-content.json');
      if (res.ok) {
        const fileContent = await res.json();
        if (content) {
          if (!content.projects || content.projects.length < fileContent.projects.length) {
            content.projects = fileContent.projects;
          }
          content.config = { ...fileContent.config, ...content.config };
        } else {
          content = fileContent;
        }
      }
    } catch (e) {
      console.warn('Could not fetch site-content.json, using defaults.');
    }
    applyDynamicContent();
  }

  function applyDynamicContent() {
    if (!content) return;
    const cfg = content.config || {};

    // Phone & Call links
    if (cfg.phone) {
      const tel = 'tel:' + cfg.phone.replace(/[^+\d]/g, '');
      $$('#c-phone').forEach(el => { el.innerHTML = `<a href="${tel}">${cfg.phone}</a>`; });
      const fabCall = $('#fab-call');
      if (fabCall) fabCall.href = tel;
    }
    if (cfg.phone2) {
      const tel2 = 'tel:' + cfg.phone2.replace(/[^+\d]/g, '');
      $$('#c-phone2').forEach(el => { 
        el.innerHTML = `<a href="${tel2}">${cfg.phone2}</a>`; 
        const row = el.closest('.row');
        if (row) row.style.display = 'flex';
      });
    }

    // Email
    if (cfg.email) {
      $$('#c-email').forEach(el => { el.innerHTML = `<a href="mailto:${cfg.email}">${cfg.email}</a>`; });
    }

    // Hours
    if (cfg.hours) {
      $$('#c-hours').forEach(el => { el.textContent = cfg.hours; });
    }

    // Address
    if (cfg.address) {
      $$('#c-address').forEach(el => { el.innerHTML = cfg.address.replace(/\n/g, '<br>'); });
    }

    // WhatsApp base
    if (cfg.whatsapp) {
      const waBase = `https://wa.me/${cfg.whatsapp.replace(/\D/g, '')}`;
      $$('.wa-link').forEach(a => { a.href = waBase; a.target = '_blank'; a.rel = 'noopener'; });
    }

    // Render projects if on projects or home page
    if (content.projects && $('#pgrid')) {
      renderProjectsGrid(content.projects);
    }
    if (content.projects && $('#pgrid-home')) {
      renderHomeProjects(content.projects);
    }
  }

  function renderProjectsGrid(projects, filter = 'All') {
    const grid = $('#pgrid');
    if (!grid) return;
    const items = projects.filter(p => filter === 'All' || p.category === filter);

    if (items.length === 0) {
      grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:var(--muted); padding:40px 0;">No projects in this category yet.</p>';
      return;
    }

    grid.innerHTML = items.map((p, i) => {
      const frame = (!p.image || p.placeholder)
        ? `<div class="frame"><div class="ph"><b>${p.title}</b><span>${p.category}</span></div></div>`
        : `<div class="frame"><img src="${p.image}" alt="${p.title}" loading="lazy"></div>`;
      return `
        <article class="pcard rv in enter" data-category="${p.category}" style="--rd:${(i % 3) * 0.1}s">
          ${frame}
          <div class="meta">
            <h3>${p.title}</h3>
            <span class="tag">${p.category}</span>
          </div>
          <div class="sub">${[p.location, p.size].filter(Boolean).join(' • ')}</div>
        </article>
      `;
    }).join('');

    observe(grid);
  }

  function renderHomeProjects(projects) {
    const grid = $('#pgrid-home');
    if (!grid) return;
    const items = projects.slice(0, 6);
    grid.innerHTML = items.map((p, i) => {
      const frame = (!p.image || p.placeholder)
        ? `<div class="frame"><div class="ph"><b>${p.title}</b><span>${p.category}</span></div></div>`
        : `<div class="frame"><img src="${p.image}" alt="${p.title}" loading="lazy"></div>`;
      return `
        <article class="pcard rv in" style="--rd:${(i % 3) * 0.1}s">
          ${frame}
          <div class="meta">
            <h3>${p.title}</h3>
            <span class="tag">${p.category}</span>
          </div>
          <div class="sub">${[p.location, p.size].filter(Boolean).join(' • ')}</div>
        </article>
      `;
    }).join('');
    observe(grid);
  }

  /* ---------- Motion & Text Splitting ---------- */
  function prepDraw(root = document) {
    $$('.draw path, .draw circle, .draw rect', root).forEach(p => p.setAttribute('pathLength', '1'));
  }
  prepDraw();

  function splitWords(el) {
    let n = 0;
    (function walk(node) {
      [...node.childNodes].forEach(c => {
        if (c.nodeType === 3) {
          const f = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(p => {
            if (!p) return;
            if (/^\s+$/.test(p)) { f.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            const i = document.createElement('span'); i.className = 'wi'; i.style.setProperty('--i', n++); i.textContent = p;
            w.appendChild(i); f.appendChild(w);
          });
          c.replaceWith(f);
        } else if (c.nodeType === 1) walk(c);
      });
    })(el);
  }
  $$('h1, h2').forEach(h => {
    if (h.closest('.ok') || h.classList.contains('no-kin')) return;
    h.classList.add('kin');
    splitWords(h);
  });

  const io = new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) {
      en.target.classList.add('in');
      io.unobserve(en.target);
    }
  }), { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });

  function observe(root = document) {
    $$('.rv, .kin, .draw, .mega', root).forEach(el => {
      if (!el.classList.contains('in')) io.observe(el);
    });
  }
  observe();

  /* ---------- Arch Veil Transitions Between Pages ---------- */
  const veil = $('#veil');
  const COVER = ['inset(100% 0% 0% 0% round 50vw 50vw 0vw 0vw)', 'inset(0% 0% 0% 0% round 0vw 0vw 0vw 0vw)'];
  const UNCOVER = ['inset(0% 0% 0% 0% round 0vw 0vw 0vw 0vw)', 'inset(0% 0% 100% 0% round 0vw 0vw 50vw 50vw)'];

  if (veil && !REDUCE && veil.animate) {
    // Reveal page on load
    veil.classList.remove('boot');
    veil.animate({ clipPath: UNCOVER }, { duration: 520, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' });

    // Smooth transition on internal page navigation links
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href]');
      if (!a) return;
      const href = a.getAttribute('href');
      // Only intercept relative HTML links (not hash anchors, tel, mailto, wa, external)
      if (href && href.endsWith('.html') && !href.startsWith('http') && !a.target) {
        e.preventDefault();
        veil.animate({ clipPath: COVER }, { duration: 350, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' }).onfinish = () => {
          window.location.href = href;
        };
      }
    });
  }

  /* ---------- Mobile Drawer Menu ---------- */
  const hdr = $('#hdr'), menu = $('#menu'), burger = $('#burger');
  if (burger && menu) {
    burger.addEventListener('click', () => {
      const o = !menu.classList.contains('open');
      menu.classList.toggle('open', o);
      if (hdr) hdr.classList.toggle('menuopen', o);
      burger.setAttribute('aria-expanded', o);
      burger.setAttribute('aria-label', o ? 'Close menu' : 'Open menu');
      document.body.style.overflow = o ? 'hidden' : '';
    });

    addEventListener('keydown', e => {
      if (e.key === 'Escape' && menu.classList.contains('open')) {
        menu.classList.remove('open');
        if (hdr) hdr.classList.remove('menuopen');
        burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  }

  /* ---------- Theme Switcher ---------- */
  const themeBtn = $('#theme');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const root = document.documentElement;
      const dq = matchMedia('(prefers-color-scheme: dark)').matches;
      const now = root.dataset.theme || (dq ? 'dark' : 'light');
      const next = now === 'dark' ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem('narch-theme', next); } catch (e) {}
    });
  }

  /* ---------- Scroll-Driven Effects ---------- */
  const prog = $('#prog');
  const hills = $$('.hills path');
  const pw = $('#pw');
  const heroCopy = $('.hero-copy');
  const hs = $('#hs');
  const track = $('#hs-track');
  const hsBar = $('#hs-bar');
  const hsNames = $$('#hs-names button, #hs-names span');
  const stepsEl = $('#steps');
  const steps = stepsEl ? $$('.step', stepsEl) : [];
  let lastY = scrollY, pinOn = false, hsDist = 0;

  // Clickable service tab pills
  hsNames.forEach((btn, i) => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      if (!hs) return;
      const total = Math.max(1, hsNames.length - 1);
      const targetP = i / total;
      const targetY = hs.offsetTop + targetP * hsDist;
      window.scrollTo({ top: targetY, behavior: REDUCE ? 'auto' : 'smooth' });
    });
  });

  function layout() {
    pinOn = innerWidth >= 960 && !REDUCE && !!hs && !!track;
    if (pinOn && hs && track) {
      hsDist = Math.max(0, track.scrollWidth - document.documentElement.clientWidth);
      hs.style.height = (innerHeight + hsDist) + 'px';
    } else if (hs && track) {
      hs.style.height = '';
      track.style.transform = '';
    }
  }
  addEventListener('resize', () => { layout(); onScroll(); });
  layout();

  function onScroll() {
    const y = scrollY, dy = y - lastY;
    lastY = y;
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);

    if (prog) prog.style.transform = `scaleX(${clamp(y / max, 0, 1)})`;

    if (hdr) {
      const solid = y > 40;
      hdr.classList.toggle('solid', solid);
      const isHome = document.body.dataset.page === 'home';
      hdr.classList.toggle('ondark', isHome && !solid);

      if (menu && !menu.classList.contains('open')) {
        if (dy > 4 && y > 300) hdr.classList.add('hide');
        else if (dy < -4 || y < 300) hdr.classList.remove('hide');
      }
    }

    // Parallax on hero
    if (!REDUCE && innerWidth >= 960 && y < innerHeight * 1.2) {
      if (hills.length) hills.forEach(p => p.style.transform = `translateY(${y * (+p.dataset.depth || 0.1)}px)`);
      if (pw) pw.style.transform = `translateY(${y * -0.12}px) scale(${1 - y / innerHeight * 0.06})`;
      if (heroCopy) {
        heroCopy.style.transform = `translateY(${y * 0.18}px)`;
        heroCopy.style.opacity = clamp(1 - y / (innerHeight * 0.75), 0, 1);
      }
    }

    // Horizontal pinned track
    if (pinOn && hs && track && hsBar) {
      const r = hs.getBoundingClientRect();
      const p = clamp(-r.top / Math.max(1, hsDist), 0, 1);
      track.style.transform = `translate3d(${-p * hsDist}px, 0, 0)`;
      hsBar.style.setProperty('--hp', p.toFixed(4));
      if (hsNames.length) {
        const idx = Math.round(p * (hsNames.length - 1));
        hsNames.forEach((s, i) => s.classList.toggle('on', i === idx));
      }
    }

    // Steps timeline
    if (stepsEl && steps.length) {
      const r = stepsEl.getBoundingClientRect();
      const p = REDUCE ? 1 : clamp((innerHeight * 0.6 - r.top) / r.height, 0, 1);
      stepsEl.style.setProperty('--pn', p.toFixed(3));
      const fillY = p * (r.height - 60);
      steps.forEach(s => s.classList.toggle('lit', s.offsetTop <= fillY + 4));
    }
  }
  addEventListener('scroll', onScroll, { passive: true });

  const cueBtn = $('#cue');
  if (cueBtn) {
    cueBtn.addEventListener('click', () => {
      const intro = $('#intro');
      if (intro) intro.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth' });
    });
  }

  /* ---------- Projects Filter Chips ---------- */
  const filterWrap = $('#filters');
  if (filterWrap) {
    filterWrap.addEventListener('click', e => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      $$('.chip', filterWrap).forEach(c => c.setAttribute('aria-pressed', c === btn));
      const cat = btn.dataset.cat;
      if (content && content.projects) {
        renderProjectsGrid(content.projects, cat);
      }
    });
  }

  /* ---------- Enquiry Form ---------- */
  const form = $('#form');
  if (form) {
    const setBad = (el, bad) => {
      const f = el.closest('.field');
      if (f) f.classList.toggle('bad', bad);
    };

    form.addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#f-name'), phone = $('#f-phone'), phone2 = $('#f-phone2'), email = $('#f-email'), consent = $('#f-consent');
      const service = $('#f-service'), loc = $('#f-loc'), msg = $('#f-msg');

      const okName = name && name.value.trim().length > 1;
      const okPhone = phone && /^[+()\d\s-]{7,16}$/.test(phone.value.trim()) && phone.value.replace(/\D/g, '').length >= 7;
      const okEmail = !email || !email.value.trim() || /^\S+@\S+\.\S+$/.test(email.value.trim());
      const okConsent = consent ? consent.checked : true;

      if (name) setBad(name, !okName);
      if (phone) setBad(phone, !okPhone);
      if (email) setBad(email, !okEmail);
      const consentErr = $('#consent-err');
      if (consentErr) consentErr.classList.toggle('bad', !okConsent);

      if (!(okName && okPhone && okEmail && okConsent)) {
        const firstBad = $$('.field.bad input, .field.bad textarea')[0] || consent;
        if (firstBad) firstBad.focus();
        return;
      }

      // Save enquiry into Leads database (Mini CRM in localStorage)
      try {
        const storedEnquiries = JSON.parse(localStorage.getItem('narch_enquiries') || '[]');
        storedEnquiries.unshift({
          id: Date.now(),
          date: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }),
          name: name.value.trim(),
          phone: phone.value.trim(),
          phone2: phone2 && phone2.value.trim() ? phone2.value.trim() : '',
          email: email && email.value.trim() ? email.value.trim() : '',
          service: service && service.value ? service.value : 'General Consultation',
          location: loc && loc.value.trim() ? loc.value.trim() : 'Wayanad',
          message: msg && msg.value.trim() ? msg.value.trim() : '',
          status: 'New'
        });
        localStorage.setItem('narch_enquiries', JSON.stringify(storedEnquiries));
      } catch (err) {
        console.warn('Could not save enquiry locally:', err);
      }

      const lines = [
        'New building enquiry from N Arch website:',
        `Name: ${name.value.trim()}`,
        `Primary Mobile: ${phone.value.trim()}`
      ];
      if (phone2 && phone2.value.trim()) lines.push(`Alt Mobile / WhatsApp: ${phone2.value.trim()}`);
      if (email && email.value.trim()) lines.push(`Email: ${email.value.trim()}`);
      if (service && service.value) lines.push(`Service: ${service.value}`);
      if (loc && loc.value.trim()) lines.push(`Location: ${loc.value.trim()}`);
      if (msg && msg.value.trim()) lines.push(`Details: ${msg.value.trim()}`);

      const waNumber = (content && content.config && content.config.whatsapp) ? content.config.whatsapp : '919745187474';
      const waUrl = `https://wa.me/${waNumber.replace(/\D/g, '')}?text=${encodeURIComponent(lines.join('\n'))}`;

      const waSendBtn = $('#wa-send');
      if (waSendBtn) waSendBtn.href = waUrl;

      const okTitle = $('#ok-title');
      if (okTitle) okTitle.textContent = `Thank you, ${name.value.trim().split(' ')[0]}.`;

      const okBox = $('#ok');
      if (okBox) {
        okBox.classList.remove('show');
        void okBox.offsetWidth;
        okBox.classList.add('show');
        okBox.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth', block: 'center' });
      }
    });

    $$('#form input, #form textarea').forEach(i => i.addEventListener('input', () => {
      const f = i.closest('.field');
      if (f) f.classList.remove('bad');
    }));
  }

  initContent();
})();
