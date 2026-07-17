/* ════════════════════════════════════════════════════
   RANTANGINN — Landing Page Script
   Checklist:
   ✅ Smooth scroll
   ✅ Navbar: shadow + mobile burger
   ✅ Scroll-reveal (.reveal)
   ✅ FAQ accordion
   ✅ Form validation (2 fields: name + instagram)
   ✅ Google Sheets POST (Apps Script)
   ✅ Thank You popup modal
   ✅ Privacy Policy modal
   ✅ GA4 events: page_view, generate_lead, form_submit, cta_click
   ✅ Meta Pixel: ViewContent, Lead
   ✅ Google Ads: conversion
   ════════════════════════════════════════════════════

   SETUP GOOGLE SHEETS (3 langkah):
   1. Buka script.google.com → New Project
   2. Paste kode dari google-sheet-script.gs
   3. Deploy → Web App (Execute as Me, Anyone can access)
   4. Copy URL deployment → tempel di SHEET_ENDPOINT di bawah
   ════════════════════════════════════════════════════ */

'use strict';

/* ── Config — ganti sebelum deploy ── */
const SHEET_ENDPOINT  = 'YOUR_APPS_SCRIPT_DEPLOYMENT_URL'; // #3 Google Sheets
const GA4_MEASUREMENT = 'G-XXXXXXXXXX';   // #7 GA4 ID
const GADS_ID         = 'AW-XXXXXXXXXX';  // #7 Google Ads ID
const GADS_LABEL      = 'CONVERSION_LABEL'; // #7 Google Ads conversion label

/* ════════════════════════════════════════════════════
   DOM READY
   ════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initSmoothScroll();
  initNavbar();
  initReveal();
  initFAQ();
  initForm();
  initPrivacyModal();
  initCTATracking();
});

/* ════════════════════════════════════════════════════
   1. SMOOTH SCROLL
   ════════════════════════════════════════════════════ */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const id = link.getAttribute('href');
      if (id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const navH = document.querySelector('.navbar')?.offsetHeight ?? 72;
      const top  = target.getBoundingClientRect().top + window.scrollY - navH - 8;
      window.scrollTo({ top, behavior: 'smooth' });
      /* Close mobile menu if open */
      closeMobileMenu();
    });
  });
}

/* ════════════════════════════════════════════════════
   2. NAVBAR — shadow on scroll + mobile burger
   ════════════════════════════════════════════════════ */
function initNavbar() {
  const navbar     = document.querySelector('.navbar');
  const burger     = document.getElementById('burgerBtn');
  const mobileMenu = document.getElementById('mobileMenu');

  /* Shadow on scroll */
  window.addEventListener('scroll', () => {
    if (!navbar) return;
    navbar.style.boxShadow = window.scrollY > 12
      ? '0 4px 24px rgba(42,60,34,.12)'
      : 'none';
  }, { passive: true });

  /* Burger toggle */
  if (burger && mobileMenu) {
    burger.addEventListener('click', () => {
      const isOpen = !mobileMenu.hidden;
      mobileMenu.hidden = isOpen;
      burger.setAttribute('aria-expanded', String(!isOpen));
      /* Animate burger lines */
      burger.classList.toggle('is-open', !isOpen);
    });
  }

  /* Close on outside click */
  document.addEventListener('click', e => {
    if (mobileMenu && !mobileMenu.hidden &&
        !navbar.contains(e.target)) {
      closeMobileMenu();
    }
  });
}

function closeMobileMenu() {
  const mobileMenu = document.getElementById('mobileMenu');
  const burger     = document.getElementById('burgerBtn');
  if (mobileMenu) mobileMenu.hidden = true;
  if (burger) {
    burger.setAttribute('aria-expanded', 'false');
    burger.classList.remove('is-open');
  }
}

/* ════════════════════════════════════════════════════
   3. SCROLL REVEAL
   ════════════════════════════════════════════════════ */
function initReveal() {
  /* Add .reveal to animatable elements */
  const selectors = [
    '.problem-card', '.solution-card', '.how-step',
    '.pricing-card', '.menu-card', '.proof-card',
    '.benefit__image', '.benefit__content',
    '.faq-item', '.addon-card',
  ];
  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach((el, i) => {
      el.classList.add('reveal');
      el.style.transitionDelay = `${(i % 4) * 0.08}s`;
    });
  });

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

/* ════════════════════════════════════════════════════
   4. FAQ ACCORDION
   ════════════════════════════════════════════════════ */
function initFAQ() {
  document.querySelectorAll('.faq-item__q').forEach(btn => {
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      const answerId = btn.getAttribute('aria-controls');
      const answer   = document.getElementById(answerId);

      /* Close all others */
      document.querySelectorAll('.faq-item__q').forEach(other => {
        if (other !== btn) {
          other.setAttribute('aria-expanded', 'false');
          const oid = other.getAttribute('aria-controls');
          const oa  = document.getElementById(oid);
          if (oa) oa.hidden = true;
        }
      });

      /* Toggle current */
      btn.setAttribute('aria-expanded', String(!expanded));
      if (answer) answer.hidden = expanded;
    });
  });
}

/* ════════════════════════════════════════════════════
   5. LEAD FORM — validation + submission
   ════════════════════════════════════════════════════ */
function initForm() {
  const form      = document.getElementById('orderForm');
  const successEl = document.getElementById('formSuccess');
  const submitBtn = document.getElementById('submitBtn');
  const nameInput = document.getElementById('name');
  const igInput   = document.getElementById('instagram');
  const nameError = document.getElementById('nameError');
  const igError   = document.getElementById('igError');

  if (!form) return;

  /* Live clear errors */
  nameInput.addEventListener('input', () => clearErr(nameInput, nameError));
  igInput.addEventListener('input', () => {
    igInput.value = igInput.value.replace(/^@+/, '').replace(/\s/g, '');
    clearErr(igInput, igError);
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    const data = {
      name:      nameInput.value.trim(),
      instagram: igInput.value.trim(),
      timestamp: new Date().toISOString(),
      source:    window.location.href,
    };

    /* #3 Send to Google Sheets */
    await sendToSheet(data);

    /* #7 Fire all conversion events */
    trackConversion(data);

    setLoading(false);

    /* Show Thank You popup (#2 checklist) */
    openModal('thankYouModal');

    /* Also update inline success state */
    form.hidden      = true;
    successEl.hidden = false;
  });

  /* ── Validation ── */
  function validate() {
    let ok = true;
    const name = nameInput.value.trim();
    const ig   = igInput.value.trim();

    if (!name) {
      showErr(nameInput, nameError, 'Nama tidak boleh kosong.');
      ok = false;
    } else if (name.length < 2) {
      showErr(nameInput, nameError, 'Nama minimal 2 karakter.');
      ok = false;
    }

    if (!ig) {
      showErr(igInput, igError, 'Username Instagram tidak boleh kosong.');
      ok = false;
    } else if (!/^[a-zA-Z0-9_.]{1,30}$/.test(ig)) {
      showErr(igInput, igError, 'Username tidak valid (huruf, angka, titik, underscore, maks 30 karakter).');
      ok = false;
    }

    if (!ok) {
      [nameInput, igInput].forEach(inp => {
        if (inp.classList.contains('is-error')) shake(inp);
      });
    }
    return ok;
  }

  function clearErr(input, errEl) {
    input.classList.remove('is-error');
    errEl.classList.remove('visible');
  }
  function showErr(input, errEl, msg) {
    errEl.textContent = msg;
    input.classList.add('is-error');
    errEl.classList.add('visible');
  }

  function setLoading(on) {
    submitBtn.disabled = on;
    submitBtn.querySelector('.btn-text').hidden    = on;
    submitBtn.querySelector('.btn-loading').hidden = !on;
  }

  function shake(el) {
    el.animate([
      { transform: 'translateX(0)' },
      { transform: 'translateX(-6px)' },
      { transform: 'translateX(6px)' },
      { transform: 'translateX(-4px)' },
      { transform: 'translateX(4px)' },
      { transform: 'translateX(0)' },
    ], { duration: 320, easing: 'ease-in-out' });
  }

  /* Close success btn */
  document.getElementById('closeSuccessBtn')
    ?.addEventListener('click', () => {
      successEl.hidden = true;
      form.hidden = false;
      form.reset();
    });
}

/* ════════════════════════════════════════════════════
   6. GOOGLE SHEETS INTEGRATION (#3)
   POST ke Apps Script Web App endpoint (no-cors)
   ════════════════════════════════════════════════════ */
async function sendToSheet(data) {
  if (SHEET_ENDPOINT === 'YOUR_APPS_SCRIPT_DEPLOYMENT_URL') {
    /* DEV MODE: log only — endpoint not yet configured */
    console.log('%c📬 [DEV] Lead data (connect endpoint to go live):', 'color:#677333;font-weight:bold', data);
    return new Promise(r => setTimeout(r, 800));
  }
  try {
    await fetch(SHEET_ENDPOINT, {
      method:  'POST',
      mode:    'no-cors', /* Apps Script requires no-cors */
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    });
  } catch (err) {
    /* Non-blocking — don't break the UX */
    console.warn('Sheet POST error (non-blocking):', err.message);
  }
}

/* ════════════════════════════════════════════════════
   7. EVENT TRACKING — GA4 + Meta Pixel + Google Ads
   ════════════════════════════════════════════════════ */
function trackConversion(data) {
  /* ── GA4 ── */
  if (typeof gtag === 'function') {
    /* generate_lead */
    gtag('event', 'generate_lead', {
      event_category: 'Lead Form',
      event_label:    'Early Access Registration',
      value:          1,
    });
    /* form_submit */
    gtag('event', 'form_submit', {
      form_id:   'orderForm',
      form_name: 'Early Access Form',
    });
    /* Google Ads conversion */
    gtag('event', 'conversion', {
      send_to: `${GADS_ID}/${GADS_LABEL}`,
    });
  }

  /* ── Meta Pixel ── */
  if (typeof fbq === 'function') {
    fbq('track', 'Lead', {
      content_name:     'Early Access Registration',
      content_category: 'Catering',
    });
  }

  console.log('%c✅ Conversion tracked:', 'color:#677333;font-weight:bold', data.instagram);
}

function trackCTAClick(label) {
  /* GA4 cta_click */
  if (typeof gtag === 'function') {
    gtag('event', 'cta_click', {
      event_category: 'CTA',
      event_label:    label,
    });
  }
  /* Meta Pixel */
  if (typeof fbq === 'function') {
    fbq('trackCustom', 'CTAClick', { label });
  }
}

/* ════════════════════════════════════════════════════
   8. CTA CLICK TRACKING — all [data-track="cta_click"]
   ════════════════════════════════════════════════════ */
function initCTATracking() {
  document.querySelectorAll('[data-track="cta_click"]').forEach(el => {
    el.addEventListener('click', () => {
      const label = el.dataset.label ?? el.textContent.trim().slice(0, 40);
      trackCTAClick(label);
    });
  });
}

/* ════════════════════════════════════════════════════
   9. MODALS — privacy + thank you
   ════════════════════════════════════════════════════ */
function initPrivacyModal() {
  /* Privacy triggers */
  ['openPrivacy', 'openPrivacy2'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => openModal('privacyModal'));
  });
  document.getElementById('closePrivacyX')?.addEventListener('click',  () => closeModal('privacyModal'));
  document.getElementById('closePrivacyOk')?.addEventListener('click', () => closeModal('privacyModal'));

  /* Thank You close */
  document.getElementById('closeThankYou')?.addEventListener('click', () => closeModal('thankYouModal'));

  /* Click outside to close */
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  /* ESC key */
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.modal-overlay:not([hidden])').forEach(m => closeModal(m.id));
  });
}

function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.hidden = false;
  document.body.style.overflow = 'hidden';
  /* Focus trap — focus first focusable */
  const first = el.querySelector('button, [href], input');
  first?.focus();
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.hidden = true;
  /* Restore scroll only if no other modal is open */
  const anyOpen = document.querySelector('.modal-overlay:not([hidden])');
  if (!anyOpen) document.body.style.overflow = '';
}
