/* Progressive enhancement for opt-in project pages; no homepage state dependencies. */
(() => {
  if (!document.body.matches('.project-v2')) return;
  let sections = [...document.querySelectorAll('[data-project-section]')];
  const toc = document.querySelector('.project-chapter-nav');
  const backToTop = document.querySelector('.project-back-to-top');
  backToTop?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  const current = document.querySelector('[data-current-section]');
  const currentText = document.createElement('span');
  currentText.className = 'project-current-text';
  currentText.textContent = current.textContent;
  current.replaceChildren(currentText);
  function sizeCurrentTitle() {
    const distance = Math.max(0, currentText.getBoundingClientRect().width - current.clientWidth);
    current.classList.toggle('is-overflowing', distance > 1);
    current.style.setProperty('--title-travel', -distance + 'px');
    current.style.setProperty('--title-duration', Math.max(4, distance / 25 + 2) + 's');
  }
  new ResizeObserver(sizeCurrentTitle).observe(current);
  document.fonts.ready.then(sizeCurrentTitle);
  let tocLinks = [...document.querySelectorAll('.project-toc a')];
  const summary = toc.querySelector('summary');
  let disclosureAnimation, expanded = toc.open;
  let idleCollapseTimer, collapseAfterScroll = false;
  function scheduleIdleCollapse() {
    clearTimeout(idleCollapseTimer);
    if (!expanded || !collapseAfterScroll) return;
    idleCollapseTimer = setTimeout(() => {
      if (toc.contains(document.activeElement) && document.activeElement !== summary) summary.focus({ preventScroll: true });
      setExpanded(false);
    }, 1500);
  }
  function setExpanded(next) {
    if (next === expanded) return;
    clearTimeout(idleCollapseTimer);
    collapseAfterScroll = false;
    expanded = next;
    const from = toc.getBoundingClientRect().height;
    disclosureAnimation?.cancel();
    toc.open = true;
    toc.classList.toggle('is-expanded', next);
    summary.setAttribute('aria-expanded', String(next));
    const to = next ? toc.getBoundingClientRect().height : summary.getBoundingClientRect().height + 16;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { toc.open = next; return; }
    disclosureAnimation = toc.animate({ height: [from + 'px', to + 'px'], overflow: ['hidden', 'hidden'] }, { duration: 260, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'forwards' });
    disclosureAnimation.onfinish = () => {
      toc.open = next;
      disclosureAnimation.cancel();
      disclosureAnimation = null;
    };
  }
  summary.setAttribute('aria-expanded', String(expanded));
  summary.addEventListener('click', event => { event.preventDefault(); setExpanded(!expanded); });
  ['pointermove', 'pointerdown', 'keydown', 'focusin', 'wheel', 'scroll'].forEach(type => {
    toc.addEventListener(type, scheduleIdleCollapse, { passive: true, capture: type === 'scroll' });
  });
  addEventListener('scroll', () => {
    if (!expanded || collapseAfterScroll) return;
    collapseAfterScroll = true;
    scheduleIdleCollapse();
  }, { passive: true });
  let queued = false;
  function updateReading() {
    queued = false;
    // Reading activation stays stable while the top navigation hides during a hash jump.
    const pageStyle = getComputedStyle(document.body);
    const offset = parseFloat(pageStyle.getPropertyValue('--project-reading-offset') || pageStyle.getPropertyValue('--project-sticky-top')) + 30;
    let active;
    sections.forEach(section => { if (section.getBoundingClientRect().top <= offset) active = section; });
    const title = active?.dataset.projectSection.replace(/^\d+ \/ /, '') || 'Overview';
    if (currentText.textContent !== title) {
      currentText.textContent = title;
      sizeCurrentTitle();
    }
    tocLinks.forEach(link => {
      if (link.hash === `#${active?.id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    const range = document.documentElement.scrollHeight - innerHeight;
    const progress = range > 0 ? Math.min(1, Math.max(0, scrollY / range)) : 0;
    toc.style.setProperty('--reading-progress', progress);
    backToTop?.style.setProperty('--reading-progress', progress);
    backToTop?.style.setProperty('--reading-started', progress > 0 ? 1 : 0);
  }
  const queueReading = () => { if (!queued) { queued = true; requestAnimationFrame(updateReading); } };
  addEventListener('scroll', queueReading, { passive: true });
  addEventListener('resize', queueReading);
  updateReading();
  document.addEventListener('click', event => {
    if (!toc.contains(event.target)) setExpanded(false);
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const target = document.getElementById(link.hash.slice(1));
    if (!target) return;
    setExpanded(false);
    // Native hash navigation keeps history, direct links and no-JS behavior intact.
    requestAnimationFrame(() => { target.focus({ preventScroll: true }); queueReading(); });
  });
  toc.addEventListener('keydown', event => {
    if (event.key === 'Escape') { setExpanded(false); toc.querySelector('summary').focus(); }
  });

  // Keep shared recommendations and canonicalize only this preview’s links.
  const navigation = document.getElementById('project-navigation-container');
  const canonical = { '/Business-module-system.html': '/business-module-system/', '/Alibaba-travel.html': '/alibaba-travel/', '/Creating-my-website-with-AI.html': '/creating-my-website-with-ai/' };
  const navObserver = new MutationObserver(() => {
    if (!navigation.querySelector('[data-project-list] .more-project-card')) return;
    navObserver.disconnect();
    navigation.querySelector('.project-back')?.remove();
    navigation.querySelectorAll('.more-project-card-arrow').forEach(arrow => { arrow.innerHTML = '<img src="/project-preview/assets/navigation/12107-1478.svg" width="30" height="30" alt="">'; });
    navigation.querySelectorAll('a').forEach(a => { const route = canonical[a.getAttribute('href')]; if (route) a.href = route; });
  });
  navObserver.observe(navigation, { childList: true, subtree: true });

  // Decrypted sections arrive after the initial page setup. Keep navigation listeners singular.
  let refreshMotion = () => {};
  document.addEventListener('project-content-updated', () => {
    setExpanded(false);
    sections = [...document.querySelectorAll('[data-project-section]')];
    tocLinks = [...document.querySelectorAll('.project-toc a')];
    refreshMotion();
    queueReading();
  });

  // Media is handled by the shared site preview in common.js.
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  if (window.SplitText) gsap.registerPlugin(SplitText);
  let modes;
  function setupMotion() {
    modes?.revert();
    modes = gsap.matchMedia();
    modes.add('(prefers-reduced-motion: no-preference)', () => {
      const splits = [];
      if (window.SplitText) document.querySelectorAll('[data-project-reveal]').forEach(title => {
        splits.push(SplitText.create(title, { type: 'lines', linesClass: 'projectRevealLine', mask: 'lines', autoSplit: true,
          onSplit: split => gsap.from(split.lines, { yPercent: 105, ease: 'none', scrollTrigger: { trigger: title.closest('.project-section'), start: () => `top+=${parseFloat(getComputedStyle(title.closest('.project-section')).paddingTop)} 95%`, end: () => `top+=${parseFloat(getComputedStyle(title.closest('.project-section')).paddingTop)} 72%`, scrub: true } })
        }));
      });
      return () => splits.forEach(split => split.revert());
    });
    modes.add('(min-width: 601px) and (prefers-reduced-motion: no-preference)', () => {
      const comparisons = [...document.querySelectorAll('[data-project-comparison]')];
      comparisons.forEach(comparison => {
        comparison.classList.add('is-animated');
        const after = comparison.querySelector('[data-comparison-after]');
        gsap.fromTo(after, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', ease: 'none', scrollTrigger: {
          trigger: comparison, start: () => `top ${parseFloat(getComputedStyle(document.body).getPropertyValue('--project-sticky-top'))}`,
          end: () => `+=${innerHeight}`, scrub: true, invalidateOnRefresh: true
        } });
      });
      return () => comparisons.forEach(comparison => comparison.classList.remove('is-animated'));
    });
  }
  setupMotion();
  refreshMotion = () => {
    setupMotion();
    watchImages();
    refresh();
  };
  const refresh = () => { ScrollTrigger.refresh(); queueReading(); };
  document.fonts.ready.then(refresh);
  const watchedImages = new WeakSet();
  function watchImages() {
    document.querySelectorAll('.project-main img').forEach(img => {
      if (watchedImages.has(img)) return;
      watchedImages.add(img);
      if (!img.complete) {
        img.addEventListener('load', refresh, { once: true });
        img.addEventListener('error', refresh, { once: true });
      }
    });
  }
  watchImages();
  addEventListener('load', refresh, { once: true });
  addEventListener('pageshow', event => { if (event.persisted) refresh(); });
})();
