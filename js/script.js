/* =========================================================
   悠紀建設株式会社 LP - script.js
   1. Mobile nav (hamburger) toggle
      + header shadow on scroll
   ========================================================= */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    initMobileNav();
    initHeaderScroll();
    initFaqAccordion();
    initSmoothScroll();
    initContactForm();
  });

  /* ---------------------------------------------------------
     1-1. Mobile navigation toggle
     --------------------------------------------------------- */
  function initMobileNav() {
    const toggle = document.getElementById('navToggle');
    const nav = document.getElementById('siteNav');
    if (!toggle || !nav) return;

    const closeNav = () => {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'メニューを開く');
    };

    const openNav = () => {
      nav.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'メニューを閉じる');
    };

    toggle.addEventListener('click', () => {
      const isOpen = nav.classList.contains('is-open');
      isOpen ? closeNav() : openNav();
    });

    // Close when a nav link is clicked
    nav.addEventListener('click', (e) => {
      const target = e.target;
      if (target instanceof HTMLAnchorElement) closeNav();
    });

    // Close when window is resized to desktop width
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (window.innerWidth > 768) closeNav();
      }, 120);
    });

    // Close on ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        closeNav();
        toggle.focus();
      }
    });
  }

  /* ---------------------------------------------------------
     1-2. Header shadow on scroll
     --------------------------------------------------------- */
  function initHeaderScroll() {
    const header = document.getElementById('siteHeader');
    if (!header) return;

    const update = () => {
      if (window.scrollY > 8) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  /* ---------------------------------------------------------
     1-4. Smooth scroll for in-page anchor links
     - Offsets the fixed header height so the target is not
       hidden underneath.
     --------------------------------------------------------- */
  function initSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');
    if (!links.length) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    links.forEach((link) => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (!href || href === '#' || href.length < 2) return;

        const target = document.querySelector(href);
        if (!target) return;

        e.preventDefault();

        const header = document.getElementById('siteHeader');
        const headerH = header ? header.offsetHeight : 0;
        const offset = headerH + 16;

        const top = target.getBoundingClientRect().top + window.scrollY - offset;

        window.scrollTo({
          top,
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
        });

        // Update URL without jumping
        if (history.pushState) {
          history.pushState(null, '', href);
        }
      });
    });
  }

  /* ---------------------------------------------------------
     1-3. FAQ accordion (exclusive open)
     - Uses native <details>/<summary> and enforces that
       only one item can be open at a time.
     --------------------------------------------------------- */
  function initFaqAccordion() {
    const items = document.querySelectorAll('.faq-item');
    if (!items.length) return;

    items.forEach((item) => {
      item.addEventListener('toggle', () => {
        if (!item.open) return;
        items.forEach((other) => {
          if (other !== item && other.open) {
            other.open = false;
          }
        });
      });
    });
  }

  /* ---------------------------------------------------------
     1-5. Contact form dummy submit
     - Front-end only: no actual submission to a server.
     - Performs basic validation, shows an alert, displays a
       success panel, and resets the form.
     --------------------------------------------------------- */
  function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    const result = document.getElementById('formResult');

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      // Basic HTML5 validation
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      // Require at least one "ご相談内容" checkbox
      const inquiries = form.querySelectorAll('input[name="inquiry"]:checked');
      if (inquiries.length === 0) {
        window.alert('ご相談内容を1つ以上お選びください。');
        const firstCheckbox = form.querySelector('input[name="inquiry"]');
        if (firstCheckbox) firstCheckbox.focus();
        return;
      }

      // Disable submit button to prevent double submit
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.6';
        submitBtn.style.cursor = 'not-allowed';
      }

      // Dummy "submission" — show alert + success panel
      window.alert(
        'お問合せを受け付けました。\n\n' +
        'ご入力ありがとうございます。\n' +
        '最短翌営業日以内にご連絡いたします。\n\n' +
        '※ こちらはデモ画面です。実際の送信は行われません。'
      );

      if (result) {
        result.hidden = false;
        // Scroll the result into view
        const header = document.getElementById('siteHeader');
        const headerH = header ? header.offsetHeight : 0;
        const top = result.getBoundingClientRect().top + window.scrollY - headerH - 16;
        window.scrollTo({ top, behavior: 'smooth' });
      }

      // Reset after a short delay so the user can see the change
      setTimeout(() => {
        form.reset();
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.style.opacity = '';
          submitBtn.style.cursor = '';
        }
      }, 400);
    });
  }
})();
