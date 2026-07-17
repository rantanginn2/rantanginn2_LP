/* ════════════════════════════════════════════════════
   RANTANGINN – Landing Page Script
   Checklist compliance:
   #1  Form above the fold (handled in HTML/CSS)
   #2  2 fields only: name + instagram
   #3  Google Sheets via Apps Script endpoint
   #6  Privacy Policy modal
   #7  GA4 + Meta Pixel + Google Ads event tracking
   ════════════════════════════════════════════════════ */

/* ── #3 Google Sheets Apps Script URL ──────────────────
   Steps to set up:
   1. Go to script.google.com → New Project
   2. Paste the Apps Script code from google-sheet-script.gs
   3. Deploy → New Deployment → Web App
      (Execute as: Me | Who has access: Anyone)
   4. Copy the deployment URL and paste it below
   ──────────────────────────────────────────────────── */
const SHEET_ENDPOINT = 'YOUR_APPS_SCRIPT_DEPLOYMENT_URL';

document.addEventListener('DOMContentLoaded', () => {

  /* ─── Smooth scroll for anchor links ─── */
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const offset = 72;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  /* ─── Navbar shadow on scroll ─── */
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    navbar.style.boxShadow = window.scrollY > 10
      ? '0 4px 20px rgba(45,61,30,.12)'
      : 'none';
  }, { passive: true });

  /* ─── Scroll-reveal animation ─── */
  const revealEls = document.querySelectorAll(
    '.feature-card, .step, .testi-card, .packaging__image, .packaging__text'
  );
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealEls.forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(28px)';
    el.style.transition = `opacity .5s ease ${i * 0.07}s, transform .5s ease ${i * 0.07}s`;
    revealObserver.observe(el);
  });
  document.head.insertAdjacentHTML('beforeend',
    '<style>.revealed{opacity:1!important;transform:translateY(0)!important}</style>'
  );

  /* ════════════════════════════════════════════════════
     #6 PRIVACY POLICY MODAL
     ════════════════════════════════════════════════════ */
  const modal        = document.getElementById('privacyModal');
  const openBtns     = [document.getElementById('openPrivacy'), document.getElementById('openPrivacy2')];
  const closeBtnX    = document.getElementById('closePrivacy');
  const closeBtnOk   = document.getElementById('closePrivacyBtn');

  function openModal()  { modal.hidden = false; document.body.style.overflow = 'hidden'; }
  function closeModal() { modal.hidden = true;  document.body.style.overflow = ''; }

  openBtns.forEach(btn => btn && btn.addEventListener('click', openModal));
  closeBtnX  && closeBtnX.addEventListener('click', closeModal);
  closeBtnOk && closeBtnOk.addEventListener('click', closeModal);

  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  /* ════════════════════════════════════════════════════
     LEAD FORM — Validation + Submission
     ════════════════════════════════════════════════════ */
  const form      = document.getElementById('orderForm');
  const successEl = document.getElementById('formSuccess');
  const submitBtn = document.getElementById('submitBtn');

  if (!form) return;

  const nameInput = document.getElementById('name');
  const igInput   = document.getElementById('instagram');
  const nameError = document.getElementById('nameError');
  const igError   = document.getElementById('igError');

  /* Live validation */
  nameInput.addEventListener('input', () => clearError(nameInput, nameError));
  igInput.addEventListener('input', () => {
    igInput.value = igInput.value.replace(/^@+/, '');
    clearError(igInput, igError);
  });

  function clearError(input, errorEl) {
    input.classList.remove('is-error');
    errorEl.classList.remove('visible');
  }
  function showError(input, errorEl, msg) {
    if (msg) errorEl.textContent = msg;
    input.classList.add('is-error');
    errorEl.classList.add('visible');
  }

  function validateForm() {
    let valid = true;
    if (!nameInput.value.trim()) {
      showError(nameInput, nameError, 'Nama tidak boleh kosong.');
      valid = false;
    }
    const igVal = igInput.value.trim();
    if (!igVal) {
      showError(igInput, igError, 'Username Instagram tidak boleh kosong.');
      valid = false;
    } else if (!/^[a-zA-Z0-9_.]{1,30}$/.test(igVal)) {
      showError(igInput, igError, 'Username tidak valid (huruf, angka, titik, underscore saja).');
      valid = false;
    }
    return valid;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      [nameInput, igInput].forEach(input => {
        if (input.classList.contains('is-error')) shakeEl(input);
      });
      return;
    }

    /* Loading state */
    const btnText    = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    submitBtn.disabled = true;
    btnText.hidden     = true;
    btnLoading.hidden  = false;

    const payload = {
      name:      nameInput.value.trim(),
      instagram: igInput.value.trim(),
      timestamp: new Date().toISOString(),
    };

    /* #3 Submit to Google Sheets */
    await submitToSheet(payload);

    /* #7 Fire conversion events */
    fireConversionEvents(payload);

    /* Show success popup */
    form.hidden      = true;
    successEl.hidden = false;
    successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  /* ─── #3 Google Sheets submission ─── */
  async function submitToSheet(data) {
    if (SHEET_ENDPOINT === 'YOUR_APPS_SCRIPT_DEPLOYMENT_URL') {
      /* Dev mode: log only */
      console.log('📬 [DEV] Form data (connect Google Sheets endpoint):', data);
      return new Promise(resolve => setTimeout(resolve, 900));
    }
    try {
      await fetch(SHEET_ENDPOINT, {
        method: 'POST',
        mode:   'no-cors', /* Apps Script requires no-cors */
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch (err) {
      console.warn('Sheet submission error (non-blocking):', err);
    }
  }

  /* ─── #7 Conversion event tracking ─── */
  function fireConversionEvents(data) {
    /* GA4 */
    if (typeof gtag === 'function') {
      gtag('event', 'generate_lead', {
        event_category: 'Lead Form',
        event_label:    'Early Access Registration',
        name:           data.name,
        instagram:      data.instagram,
      });
      /* Google Ads conversion — replace AW-XXXXXXXXXX/CONVERSION_LABEL */
      gtag('event', 'conversion', {
        send_to: 'AW-XXXXXXXXXX/CONVERSION_LABEL',
      });
    }

    /* Meta Pixel */
    if (typeof fbq === 'function') {
      fbq('track', 'Lead', {
        content_name: 'Early Access Registration',
      });
    }

    console.log('✅ Conversion events fired for:', data.instagram);
  }

  /* ─── Shake animation helper ─── */
  function shakeEl(el) {
    el.animate([
      { transform: 'translateX(0)' },
      { transform: 'translateX(-6px)' },
      { transform: 'translateX(6px)' },
      { transform: 'translateX(-4px)' },
      { transform: 'translateX(4px)' },
      { transform: 'translateX(0)' },
    ], { duration: 320, easing: 'ease-in-out' });
  }

});
