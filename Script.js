


/* 
   UTILITY
─ */
/**
 * Throttle: calls fn at most once per `limit` ms.
 * @param {Function} fn
 * @param {number} limit
 */
function throttle(fn, limit) {
  let inThrottle = false;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => { inThrottle = false; }, limit);
    }
  };
}

/* 
   1. STICKY HEADER
   - */
(function initStickyHeader() {
  const stickyHeader = document.getElementById('stickyHeader');
  const mainNav      = document.getElementById('mainNav');
  if (!stickyHeader || !mainNav) return;

  const THRESHOLD        = 120;   
  const BANNER_H_PX      = 38;    
  let lastScrollY        = 0;
  let isVisible          = false;

  function updateStickyHeader() {
    const currentY  = window.scrollY;
    const scrollDir = currentY > lastScrollY ? 'down' : 'up';

    if (currentY > THRESHOLD && scrollDir === 'down' && !isVisible) {
      // Show banner
      stickyHeader.classList.add('is-visible');
      stickyHeader.setAttribute('aria-hidden', 'false');
      mainNav.classList.add('with-banner');
      mainNav.style.top = BANNER_H_PX + 'px';
      isVisible = true;
    } else if ((currentY < THRESHOLD || scrollDir === 'up') && isVisible) {
      // Hide banner
      stickyHeader.classList.remove('is-visible');
      stickyHeader.setAttribute('aria-hidden', 'true');
      mainNav.classList.remove('with-banner');
      mainNav.style.top = '';
      isVisible = false;
    }

    lastScrollY = currentY;
  }

  window.addEventListener('scroll', throttle(updateStickyHeader, 50), { passive: true });
})();


/* 
   2 & 3. IMAGE CAROUSEL WITH ZOOM
    */
(function initCarousel() {
  const track     = document.getElementById('carouselTrack');
  const prevBtn   = document.getElementById('carouselPrev');
  const nextBtn   = document.getElementById('carouselNext');
  const dots      = document.querySelectorAll('.carousel__dot');
  const slides    = document.querySelectorAll('.carousel__slide');
  const section   = document.querySelector('.carousel-section');

  if (!track || !slides.length) return;

  const TOTAL     = slides.length;
  let currentIdx  = 0;
  let autoTimer   = null;

  /* Determine how many slides are visible at once  */
  function visibleCount() {
    const w = window.innerWidth;
    if (w <= 768)  return 1;
    if (w <= 1024) return 2;
    return 3;
  }

  /* Calculate slide width as a fraction of track  */
  function slideWidth() {
    const count = visibleCount();
    return track.parentElement.offsetWidth / count;
  }

  /* Go to index */
  function goTo(idx, animate = true) {
    const maxIdx = TOTAL - visibleCount();
    currentIdx = Math.max(0, Math.min(idx, maxIdx));

    if (!animate) {
      track.style.transition = 'none';
    } else {
      track.style.transition = 'transform 0.5s cubic-bezier(0.25,0.46,0.45,0.94)';
    }

    track.style.transform = `translateX(-${currentIdx * slideWidth()}px)`;

    // Update dots
    dots.forEach((dot, i) => {
      const isActive = i === currentIdx;
      dot.classList.toggle('carousel__dot--active', isActive);
      dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  }

  /* Recalculate on resize (no animation) */
  window.addEventListener('resize', throttle(() => {
    goTo(currentIdx, false);
    // Restore animation after a frame
    requestAnimationFrame(() => {
      track.style.transition = '';
    });
  }, 100));

  /* ── Prev / Next ── */
  prevBtn.addEventListener('click', () => {
    goTo(currentIdx - 1);
    resetAutoPlay();
  });
  nextBtn.addEventListener('click', () => {
    goTo(currentIdx + 1);
    resetAutoPlay();
  });

  /* Dots*/
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const idx = parseInt(dot.dataset.index, 10);
      goTo(idx);
      resetAutoPlay();
    });
  });

  /* Auto-play */
  function startAutoPlay() {
    autoTimer = setInterval(() => {
      const maxIdx = TOTAL - visibleCount();
      const nextIdx = currentIdx >= maxIdx ? 0 : currentIdx + 1;
      goTo(nextIdx);
    }, 5000);
  }

  function stopAutoPlay()  { clearInterval(autoTimer); }
  function resetAutoPlay() { stopAutoPlay(); startAutoPlay(); }

  // Pause on hover / focus within carousel section
  if (section) {
    section.addEventListener('mouseenter', stopAutoPlay);
    section.addEventListener('focusin',    stopAutoPlay);
    section.addEventListener('mouseleave', startAutoPlay);
    section.addEventListener('focusout',   (e) => {
      if (!section.contains(e.relatedTarget)) startAutoPlay();
    });
  }

  startAutoPlay();

  /* Touch / Mouse drag*/
  let isDragging   = false;
  let dragStartX   = 0;
  let dragDeltaX   = 0;
  const DRAG_THRESHOLD = 40; // px

  function onDragStart(x) {
    isDragging  = true;
    dragStartX  = x;
    dragDeltaX  = 0;
    track.style.transition = 'none';
    stopAutoPlay();
  }

  function onDragMove(x) {
    if (!isDragging) return;
    dragDeltaX = x - dragStartX;
    const baseOffset = currentIdx * slideWidth();
    track.style.transform = `translateX(${-baseOffset + dragDeltaX}px)`;
  }

  function onDragEnd() {
    if (!isDragging) return;
    isDragging = false;

    if (dragDeltaX < -DRAG_THRESHOLD) {
      goTo(currentIdx + 1);
    } else if (dragDeltaX > DRAG_THRESHOLD) {
      goTo(currentIdx - 1);
    } else {
      goTo(currentIdx); // snap back
    }

    resetAutoPlay();
  }

  // Mouse events
  track.addEventListener('mousedown',  e => onDragStart(e.clientX));
  window.addEventListener('mousemove', e => onDragMove(e.clientX));
  window.addEventListener('mouseup',   onDragEnd);

  // Touch events
  track.addEventListener('touchstart', e => onDragStart(e.touches[0].clientX), { passive: true });
  track.addEventListener('touchmove',  e => onDragMove(e.touches[0].clientX),  { passive: true });
  track.addEventListener('touchend',   onDragEnd);

  // Prevent image drag-ghost
  track.addEventListener('dragstart', e => e.preventDefault());

  /* Keyboard navigation */
  section && section.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  { goTo(currentIdx - 1); resetAutoPlay(); }
    if (e.key === 'ArrowRight') { goTo(currentIdx + 1); resetAutoPlay(); }
  });

  /* Initial render */
  goTo(0, false);


  /* ── ZOOM: .*/
  const cards = document.querySelectorAll('.carousel__card');

  cards.forEach(card => {
    const zoom = card.querySelector('.carousel__zoom');
    if (!zoom) return;

    card.addEventListener('mouseenter', () => {
      const rect = card.getBoundingClientRect();
      const viewportH = window.innerHeight;

      // If not enough space above, show below
      if (rect.top < 260) {
        zoom.style.bottom = 'auto';
        zoom.style.top    = 'calc(100% + 10px)';
      } else {
        zoom.style.top    = '';
        zoom.style.bottom = 'calc(100% + 12px)';
      }

      // If near right edge, shift left
      const zoomW = 320;
      const rightSpace = window.innerWidth - rect.right;
      if (rightSpace < zoomW / 2) {
        zoom.style.left      = 'auto';
        zoom.style.right     = '0';
        zoom.style.transform = 'translateX(0) scale(0.88)';
      } else if (rect.left < zoomW / 2) {
        zoom.style.left      = '0';
        zoom.style.right     = 'auto';
        zoom.style.transform = 'translateX(0) scale(0.88)';
      } else {
        zoom.style.left      = '50%';
        zoom.style.right     = '';
        zoom.style.transform = 'translateX(-50%) scale(0.88)';
      }
    });

    // The actual show/hide is handled by CSS :hover on .carousel__card
    card.addEventListener('mouseleave', () => {
      // Reset inline transforms so CSS takes over
      zoom.style.transform = '';
    });
  });
})();


/* ──────────────────────────────────────────────────────
   4. MOBILE MENU — hamburger toggle
────────────────────────────────────────────────────── */
(function initMobileMenu() {
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const mobileMenu   = document.getElementById('mobileMenu');
  if (!hamburgerBtn || !mobileMenu) return;

  hamburgerBtn.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('is-open');
    hamburgerBtn.classList.toggle('is-open', isOpen);
    hamburgerBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    mobileMenu.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  });

  // Close on outside click
  document.addEventListener('click', e => {
    if (!hamburgerBtn.contains(e.target) && !mobileMenu.contains(e.target)) {
      mobileMenu.classList.remove('is-open');
      hamburgerBtn.classList.remove('is-open');
      hamburgerBtn.setAttribute('aria-expanded', 'false');
      mobileMenu.setAttribute('aria-hidden', 'true');
    }
  });
})();


/* ──────────────────────────────────────────────────────
   5. SCROLL ANIMATIONS  */
(function initScrollAnimations() {
  // Wrap animatable elements
  const STAGGER_PARENTS = [
    '.how__steps',
    '.features__grid',
    '.testimonials__grid',
    '.stats__grid',
  ];

  // Add .fade-up to individual non-staggered elements
  const singleTargets = [
    '.hero__badge',
    '.hero__heading',
    '.hero__sub',
    '.hero__cta-group',
    '.hero__proof',
    '.section-label',
    '.section-heading',
    '.section-sub',
    '.cta-card',
  ];

  singleTargets.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      el.classList.add('fade-up');
    });
  });

  // Add .fade-up-stagger class to grid parents
  STAGGER_PARENTS.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      el.classList.add('fade-up-stagger');
    });
  });

  // Observe all .fade-up elements
  const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        fadeObserver.unobserve(entry.target); // animate once
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px',
  });

  document.querySelectorAll('.fade-up').forEach(el => fadeObserver.observe(el));

  // Observe stagger children with delay
  const staggerObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const children = Array.from(entry.target.children);
        children.forEach((child, i) => {
          child.style.transitionDelay = `${i * 80}ms`;
          child.classList.add('is-visible');
        });
        staggerObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -30px 0px',
  });

  document.querySelectorAll('.fade-up-stagger').forEach(el => staggerObserver.observe(el));
})();


/* ──────────────────────────────────────────────────────
   6. NAV DROPDOWN*/
(function initNavDropdowns() {
  const dropdownTriggers = document.querySelectorAll('.nav__item--dropdown > button');

  dropdownTriggers.forEach(btn => {
    btn.addEventListener('keydown', e => {
      const parentLi = btn.closest('.nav__item--dropdown');
      const dropdown = parentLi ? parentLi.querySelector('.dropdown') : null;
      if (!dropdown) return;

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const isExpanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
        dropdown.style.opacity    = isExpanded ? '' : '1';
        dropdown.style.visibility = isExpanded ? '' : 'visible';
        dropdown.style.transform  = isExpanded ? '' : 'translateY(0)';
        dropdown.style.pointerEvents = isExpanded ? '' : 'auto';
      }

      if (e.key === 'Escape') {
        btn.setAttribute('aria-expanded', 'false');
        dropdown.style.opacity = '';
        dropdown.style.visibility = '';
        dropdown.style.transform = '';
        dropdown.style.pointerEvents = '';
        btn.focus();
      }
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', e => {
    dropdownTriggers.forEach(btn => {
      const parentLi = btn.closest('.nav__item--dropdown');
      if (parentLi && !parentLi.contains(e.target)) {
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  });
})();


/* ──────────────────────────────────────────────────────
   7. HERO EMAIL INPUT — basic validation feedback
────────────────────────────────────────────────────── */
(function initHeroForm() {
  const wrap  = document.querySelector('.hero__input-wrap');
  const input = document.querySelector('.hero__input');
  const btn   = document.querySelector('.hero__submit');
  if (!input || !btn) return;

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  btn.addEventListener('click', e => {
    e.preventDefault();
    const val = input.value.trim();

    if (!val) {
      shakeInput();
      input.setAttribute('aria-invalid', 'true');
      input.focus();
      return;
    }

    if (!EMAIL_RE.test(val)) {
      shakeInput();
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('placeholder', 'Please enter a valid email');
      input.value = '';
      input.focus();
      return;
    }

    // Success state
    input.setAttribute('aria-invalid', 'false');
    btn.textContent = '✓ Booked!';
    btn.style.background = '#22c55e';
    btn.style.borderColor = '#22c55e';
    input.disabled = true;
    btn.disabled = true;

    // Reset after 4s
    setTimeout(() => {
      btn.textContent = 'Book a Demo';
      btn.style.background = '';
      btn.style.borderColor = '';
      input.disabled = false;
      btn.disabled = false;
      input.value = '';
    }, 4000);
  });

  // Shake animation
  function shakeInput() {
    if (!wrap) return;
    wrap.style.animation = 'none';
    wrap.offsetHeight; // reflow
    wrap.style.animation = 'shake 0.4s ease';
    wrap.addEventListener('animationend', () => {
      wrap.style.animation = '';
    }, { once: true });
  }

  // Inject shake keyframes
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shake {
      0%,100% { transform: translateX(0); }
      20%      { transform: translateX(-6px); }
      40%      { transform: translateX(6px); }
      60%      { transform: translateX(-4px); }
      80%      { transform: translateX(4px); }
    }
  `;
  document.head.appendChild(style);
})();