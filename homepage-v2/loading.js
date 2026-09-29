(() => {
  'use strict';
  const gate = window.homepageLoading;
  const overlay = document.querySelector('#opening-loader');
  if (!gate || gate.done || !overlay) return;
  [...document.body.children].forEach(element => {
    if (element !== overlay && element.tagName !== 'SCRIPT' && !element.inert) {
      element.inert = true;
      element.setAttribute('data-opening-inert', '');
    }
  });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const panels = overlay.querySelector('#opening-panels');
  const line = overlay.querySelector('#opening-progress-width');
  const percentage = overlay.querySelector('#opening-percent');
  let target = 0;
  let progress = 0;
  let artworkReady = false;
  let closing = false;
  let timeline;
  let previous;
  const fit = () => {
    const height = 1280 * innerHeight / innerWidth;
    panels.setAttribute('viewBox', `0 ${416 - height / 2} 1280 ${height}`);
    return height / 2 + 60;
  };
  fit();
  const settleImage = image => new Promise(resolve => {
    const finish = () => {
      image.removeEventListener('load', finish);
      image.removeEventListener('error', finish);
      Promise.resolve(image.decode?.()).catch(() => {}).then(resolve);
    };
    if (image.complete) finish();
    else {
      image.addEventListener('load', finish, {once:true});
      image.addEventListener('error', finish, {once:true});
    }
  });
  const artwork = [...overlay.querySelectorAll('image')].map(element => {
    const image = new Image();
    image.src = element.getAttribute('href');
    return settleImage(image);
  });
  Promise.all(artwork).then(() => { artworkReady = true; });
  const pageLoaded = new Promise(resolve => {
    if (document.readyState === 'complete') resolve();
    else window.addEventListener('load', resolve, {once:true});
  });
  const images = [...document.images].filter(image => image.loading !== 'lazy');
  const jobs = [...artwork, ...images.map(settleImage), pageLoaded,
    pageLoaded.then(() => document.fonts.ready)];
  let completed = 0;
  jobs.forEach(job => Promise.resolve(job).catch(() => {}).then(() => {
    target = ++completed / jobs.length;
    overlay.dataset.resourceProgress = target;
  }));
  const exit = () => {
    if (gate.done) return;
    closing = true;
    if (reduced.matches || !window.gsap) { gate.finish(); return; }
    const distance = fit();
    timeline = gsap.timeline({onComplete:gate.finish})
      .set('#opening-paper, #opening-line', {opacity:0})
      // Start the existing Hero entrance as the split exposes the real page.
      .call(gate.reveal)
      .addLabel('split')
      .to('#opening-upper', {y:-distance, duration:1.15, ease:'power2.inOut'}, 'split')
      .to('#opening-lower', {y:distance, duration:1.15, ease:'power2.inOut'}, 'split')
      // Keep the badge until a narrow strip of the homepage is visible.
      .to('#opening-badge', {opacity:0, duration:.16}, 'split+=0.22');
  };
  const tick = now => {
    if (gate.done) return;
    const dt = previous === undefined ? 0 : Math.min(now - previous, 50);
    previous = now;
    // Real resource progress is the ceiling. The 900ms full-span catch-up
    // makes cached loads visibly grow instead of flashing a completed line.
    if (artworkReady) progress = reduced.matches ? target : Math.min(target, progress + dt / 900);
    const percent = Math.floor(progress * 100);
    percentage.textContent = `${percent}%`;
    line.setAttribute('width', progress * 1280);
    overlay.setAttribute('aria-valuenow', percent);
    if (progress >= 1) {
      requestAnimationFrame(exit);
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  window.addEventListener('resize', () => {
    if (gate.done) return;
    fit();
    if (closing) { timeline?.kill(); gate.finish(); }
  });
  reduced.addEventListener('change', () => {
    if (reduced.matches && closing) { timeline?.kill(); gate.finish(); }
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted) { timeline?.kill(); gate.finish(); }
  });
})();
