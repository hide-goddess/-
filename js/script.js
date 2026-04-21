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
})();
