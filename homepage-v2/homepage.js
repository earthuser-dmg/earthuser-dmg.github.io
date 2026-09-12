(() => {
  'use strict';
  const main = document.querySelector('.v2-main');
  const knot = document.querySelector('.knot');
  const heroThread = document.querySelector('.hero-thread');
  const heroPath = document.querySelector('.hero-draw');
  const footerPath = document.querySelector('.footer-draw');
  const stage = document.querySelector('.designer-stage');
  const folders = [...document.querySelectorAll('.folder')];
  const brush = document.querySelector('.desk-brush');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  const lamp = document.querySelector('.desk-lamp');
  const lampPull = lamp.querySelector('.lamp-pull');
  const lampOn = lamp.querySelector('.lamp-on-art svg');
  lampOn.pauseAnimations();
  lampOn.setCurrentTime(0);
  let pull = null;
  const setLamp = lit => {
    lamp.classList.toggle('is-lit', lit);
    const loop = lamp.querySelector(':scope > svg');
    if (lit || reduce.matches) loop.pauseAnimations(); else loop.unpauseAnimations();
    lampPull.setAttribute('aria-pressed', String(lit));
    lampPull.setAttribute('aria-label', `Pull the cord to turn ${lit ? 'off' : 'on'} the lamp`);
    lampOn.pauseAnimations();
    lampOn.setCurrentTime(reduce.matches && lit ? .7 : 0);
    if (lit && !reduce.matches) lampOn.unpauseAnimations();
  };
  const toggleLamp = () => {
    setLamp(!lamp.classList.contains('is-lit'));
  };
  lampPull.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault();
    pull = {id: event.pointerId, x: event.clientX, y: event.clientY};
    lampPull.setPointerCapture(event.pointerId);
  });
  lampPull.addEventListener('pointerup', event => {
    if (!pull || pull.id !== event.pointerId) return;
    const distance = Math.hypot(event.clientX - pull.x, event.clientY - pull.y);
    pull = null;
    lampPull.releasePointerCapture(event.pointerId);
    if (distance >= 8) toggleLamp();
  });
  lampPull.addEventListener('pointercancel', () => { pull = null; });
  lampPull.addEventListener('lostpointercapture', () => { pull = null; });
  lampPull.addEventListener('click', event => { if (event.detail === 0) toggleLamp(); });

  // Keep navigation shared. Only the preview's Work link points into this page.
  const navHost = document.querySelector('#left-nav-container');
  const navResize = new ResizeObserver(entries => entries.forEach(({ target }) => {
    main.style.setProperty('--top-nav-height', `${target.getBoundingClientRect().height}px`);
  }));
  const adaptNav = () => {
    const topNav = document.querySelector('#topNav');
    if (topNav && !topNav.dataset.sizeObserved) {
      topNav.dataset.sizeObserved = 'true';
      navResize.observe(topNav);
    }
    document.querySelectorAll('#left-nav-container .work-link, #top-nav-container .work-link').forEach(work => {
      work.href = '#work';
      work.classList.add('active');
      work.setAttribute('aria-current', 'page');
    });
  };
  const navObserver = new MutationObserver(() => requestAnimationFrame(adaptNav));
  navObserver.observe(navHost, { childList: true, subtree: true });
  navObserver.observe(document.querySelector('#top-nav-container'), { childList: true, subtree: true });
  adaptNav();

  const workResize = new ResizeObserver(entries => entries.forEach(({ target }) => {
    target.style.setProperty('--work-image-scale', target.clientWidth / target.querySelector('.work-image').offsetWidth);
  }));
  document.querySelectorAll('.work-card').forEach(card => workResize.observe(card));

  if (!window.gsap || !window.ScrollTrigger || !window.DrawSVGPlugin) {
    // All content remains available even if the animation libraries fail to load.
    folders.forEach(folder => { folder.style.position = 'relative'; folder.style.visibility = 'visible'; folder.style.aspectRatio = '756/606'; });
    document.querySelector('.folder-window').style.overflow = 'visible';
    document.querySelector('.folder-window').style.aspectRatio = 'auto';
    return;
  }
  gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin);
  if (window.InertiaPlugin) gsap.registerPlugin(InertiaPlugin);
  if (window.ScrambleTextPlugin) gsap.registerPlugin(ScrambleTextPlugin);
  if (window.SplitText) gsap.registerPlugin(SplitText);
  main.classList.add('has-scroll-layers');
  if (reduce.matches) document.querySelectorAll('.desk-date > svg, .animated-art > svg').forEach(svg => svg.pauseAnimations());

  if (!reduce.matches) {
    const tokens = document.querySelectorAll('.headline-token:not(.knot)');
    const closure = document.querySelector('.knot-closure');
    const bottomObjects = document.querySelectorAll('.desk-letter, .desk-brush, .desk-lamp');
    const updateCard = document.querySelector('.desk-date');
    gsap.set('.desk-object', {autoAlpha: 0});
    gsap.set(closure, {autoAlpha: 0});
    gsap.set(tokens, { yPercent: 110, opacity: 0 });
    gsap.set('.clarity img', { clipPath: 'inset(0 100% 0 0)' });
    document.fonts.ready.then(() => {
      const intro = gsap.timeline();
      intro.to(tokens, { yPercent: 0, opacity: 1, duration: .65, stagger: .085, ease: 'power3.out' })
        .fromTo(closure, {yPercent: 110, autoAlpha: 0}, {yPercent: 0, autoAlpha: 1, duration: .65, ease: 'power3.out'}, .085 * 6)
        .addLabel('deskObjects')
        .call(() => { heroIntroComplete = true; revealClew(); }, [], 'deskObjects')
        .fromTo(bottomObjects, { y: 48, scale: .88, autoAlpha: 0 }, { y: -7, scale: 1.055, autoAlpha: 1, duration: .55, ease: 'power3.out' }, 'deskObjects')
        .to(bottomObjects, { y: 0, scale: 1, duration: .9, ease: 'elastic.out(1, .65)', clearProps: 'transform' }, '-=.2')
        .to('.clarity img', { clipPath: 'inset(0 0% 0 0)', duration: .8, ease: 'power2.inOut' }, 'deskObjects')
        .addLabel('bluePathComplete', 'deskObjects+=.8')
        .fromTo(updateCard, { y: 48, scale: .88, autoAlpha: 0 }, { y: -7, scale: 1.055, autoAlpha: 1, duration: .55, ease: 'power3.out' }, 'bluePathComplete')
        .to(updateCard, { y: 0, scale: 1, duration: .9, ease: 'elastic.out(1, .65)', clearProps: 'transform' }, '-=.2')
        .addLabel('finalAccent');
      if (window.ScrambleTextPlugin) {
        const proxy = document.createElement('span');
        proxy.className = 'sr-only';
        proxy.setAttribute('aria-hidden', 'true');
        proxy.textContent = '8/30/2026';
        document.querySelector('.desk-date').append(proxy);
        const dates = document.querySelectorAll('.desk-date text[font-family="Finger Paint"] tspan');
        intro.call(() => {
          const scramble = gsap.to(proxy, { duration: 1.3, repeat: -1, repeatDelay: 4,
            scrambleText: { text: '8/30/2026', chars: '0123456789/', revealDelay: .2, speed: .4 },
            onUpdate: () => dates.forEach(text => { text.textContent = proxy.textContent; }) });
          ScrollTrigger.create({trigger: '.desk-date', start: 'top bottom', end: 'bottom top', onToggle: self => self.isActive ? scramble.resume() : scramble.pause()});
        });
      }
      if (window.SplitText) {
        document.querySelectorAll('.hero-company a').forEach(link => link.setAttribute('aria-label', link.textContent));
        const split = SplitText.create('.hero-company p', {type: 'chars'});
        gsap.set('.hero-company p', {perspective: 700});
        intro.fromTo(split.chars, {rotationX: -90, autoAlpha: 0}, {rotationX: 0, autoAlpha: 1, duration: .9, stagger: .014, transformOrigin: '50% 50% -8px', ease: 'power2.out'}, 0);
      }

    });
  }

  let unravelled = false;
  let growth;
  let previousBrush = null;
  let drag = null;
  let clewReady = false;
  let heroIntroComplete = reduce.matches;
  const canvas = document.querySelector('.knot-ink');
  const ctx = canvas.getContext('2d');
  let clewSvg;
  let clewRevealStarted = false;
  let clewComplete = false;
  let heroPathRevealed = false;
  const ink = new Image();
  knot.classList.add('is-preparing');
  Promise.all([
    new Promise((resolve, reject) => {
      ink.onload = resolve;
      ink.onerror = reject;
      ink.src = '/homepage-v2/assets/latest/11852-21121.svg';
    }),
    fetch('/homepage-v2/assets/latest/clew-growth.svg?v=33').then(response => {
      if (!response.ok) throw new Error('Could not load the clew trace');
      return response.text();
    })
  ]).then(([, markup]) => {
    clewSvg = new DOMParser().parseFromString(markup, 'image/svg+xml').documentElement;
    knot.append(clewSvg);
    if (!heroIntroComplete) gsap.set(clewSvg, {autoAlpha: 0});
    gsap.set(clewSvg.querySelector('.clew-trace'), { drawSVG: '0%' });
    ctx.drawImage(ink, 0, 0, canvas.width, canvas.height);
    clewReady = true;
    revealClew();
  }).catch(error => {
    console.warn('Clew drawing unavailable:', error);
    knot.classList.remove('is-preparing');
    clewReady = clewComplete = true;
    if (ink.complete && ink.naturalWidth) {
      ctx.drawImage(ink, 0, 0, canvas.width, canvas.height);
      knot.classList.add('is-ready');
    }
  });
  gsap.set(heroPath, { drawSVG: '0%' });

  function revealClew() {
    if (!clewReady || clewRevealStarted || !heroIntroComplete) return;
    clewRevealStarted = true;
    gsap.set(clewSvg, {autoAlpha: 1});
    knot.dataset.state = 'growing';
    const complete = () => {
      knot.classList.add('is-ready');
      knot.classList.remove('is-preparing');
      clewSvg.remove();
      clewComplete = true;
      knot.dataset.state = 'ready';
    };
    if (reduce.matches) complete();
    else gsap.to(clewSvg.querySelector('.clew-trace'), {
      drawSVG: '100%', duration: .4, ease: 'none', onComplete: complete
    });
  }

  function hideBrush() {
    if (drag && brush.hasPointerCapture(drag.id)) brush.releasePointerCapture(drag.id);
    drag = null;
    previousBrush = null;
    brush.classList.remove('is-dragging');
    brush.style.removeProperty('--brush-grab-transform');
    gsap.to(brush, { x: 0, y: 0, duration: reduce.matches ? 0 : .35, ease: 'power2.out', overwrite: true });
  }

  // The curve and closure share the pinned parent, so the browser moves them
  // together. Only measure on layout changes, never chase pinning on scroll.
  function alignHeroThread() {
    const source = knot.querySelector('.knot-closure').getBoundingClientRect();
    // The 71px export uses object-fit: contain inside the knot box.
    const scale = Math.min(source.width, source.height) / 71;
    const centerX = source.left + (source.width - 71 * scale) / 2 + 35.6455 * scale;
    const centerY = source.top + (source.height - 71 * scale) / 2 + 35.3062 * scale;
    const stageRect = stage.getBoundingClientRect();
    const folderWindow = document.querySelector('.folder-window');
    folderWindow.style.setProperty('--folder-clip-height', `${stage.offsetHeight - folderWindow.offsetTop - 2}px`);
    // Exported 11852:21115 circle center: (43.5, 36.3982).
    // Anchor both axes to the closure, never the rotated clew bounds.
    heroThread.style.left = `${centerX - stageRect.left - 43.5 * scale}px`;
    heroThread.style.top = `${centerY - stageRect.top - 36.3982 * scale}px`;
    heroThread.style.width = `${346 * scale}px`;
    heroThread.style.height = `${954 * scale}px`;
  }

  function revealHeroPath() {
    if (heroPathRevealed) return;
    heroPathRevealed = true;
    alignHeroThread();
    gsap.set(heroThread, { visibility: 'visible' });
    gsap.fromTo(heroPath, {drawSVG: '0%', autoAlpha: 1}, { drawSVG: '100%', duration: 3.2, ease: 'power1.inOut' });
  }

  function unravel() {
    if (unravelled || !clewComplete) return;
    unravelled = true;
    knot.dataset.state = 'unravelled';
    brush.classList.add('is-disabled');
    brush.disabled = true;
    brush.blur();
    hideBrush();
    growth = gsap.timeline();
    growth.set('.knot-closure', {visibility: 'hidden'})
      .to(canvas, { autoAlpha: 0, duration: reduce.matches ? 0 : .35 })
      .call(revealHeroPath);
    document.querySelector('#knot-status').textContent = 'Complexity, unravelled. A thread connects to the designer folders below.';
  }
  function brushContactPoint() {
    const tip = brush.querySelector('.brush-tip').getBoundingClientRect();
    return { x: tip.left, y: tip.top };
  }
  function brushOverKnot() {
    const target = knot.getBoundingClientRect();
    const contact = brushContactPoint();
    const contains = (px, py) => px >= target.left && px <= target.right && py >= target.top && py <= target.bottom;
    return contains(contact.x, contact.y);
  }
  brush.addEventListener('pointerdown', event => {
    if (event.button !== 0 || unravelled || !clewComplete) return;
    event.preventDefault();
    gsap.killTweensOf(brush);
    brush.style.setProperty('--brush-grab-transform', getComputedStyle(brush.querySelector('.brush-visual')).transform);
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, originX: Number(gsap.getProperty(brush, 'x')), originY: Number(gsap.getProperty(brush, 'y')), moved: false, touched: false };
    brush.setPointerCapture(event.pointerId);
    brush.classList.add('is-dragging');
  });
  brush.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const x = event.clientX - drag.x;
    const y = event.clientY - drag.y;
    drag.moved ||= Math.hypot(x, y) > 5;
    gsap.set(brush, { x: drag.originX + x, y: drag.originY + y });
    if (!brushOverKnot()) { previousBrush = null; return; }
    drag.touched = true;
    const rect = knot.getBoundingClientRect();
    const contact = brushContactPoint();
    const point = { x: gsap.utils.clamp(0, canvas.width, (contact.x - rect.left) / rect.width * canvas.width), y: gsap.utils.clamp(0, canvas.height, (contact.y - rect.top) / rect.height * canvas.height) };
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = canvas.width * .58;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(previousBrush?.x ?? point.x, previousBrush?.y ?? point.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    previousBrush = point;
  });
  brush.addEventListener('pointerup', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const dropped = drag.moved && drag.touched;
    hideBrush();
    if (dropped) unravel();
  });
  brush.addEventListener('pointercancel', hideBrush);
  brush.addEventListener('lostpointercapture', () => { if (drag) hideBrush(); });
  brush.addEventListener('click', event => { if (event.detail === 0) unravel(); });
  knot.addEventListener('click', event => { if (event.detail === 0) unravel(); });

  const media = gsap.matchMedia();
  media.add({ motion: '(prefers-reduced-motion: no-preference)', reduced: '(prefers-reduced-motion: reduce)' }, context => {
    const reduced = context.conditions.reduced;
    if (reduced) {
      folders.forEach(folder => {
        gsap.set(folder, { position: 'relative', visibility: 'visible', aspectRatio: '756/606' });
      });
      gsap.set('.folder-window', { aspectRatio: 'auto', overflow: 'visible' });
      gsap.set('.folder-placeholder', { display: 'none' });
      gsap.set(footerPath, { drawSVG: '100%', visibility: 'visible' });
      gsap.set('.footer-thanks', { autoAlpha: 1 });
    } else {
      const revealTitle = (selector, trigger) => SplitText.create(selector, {type: 'lines', mask: 'lines', autoSplit: true,
        onSplit: split => gsap.from(split.lines, {yPercent: 120, ease: 'none', scrollTrigger: {trigger, start: 'top bottom', end: 'top 65%', scrub: true}})
      });
      if (window.SplitText) revealTitle('#designer-title', '.designer');
      const pinTop = () => innerHeight - stage.offsetHeight;
      const folderDistance = () => innerHeight * 2;
      const entranceY = () => innerHeight - pinTop() - document.querySelector('.folder-window').offsetTop + 2;
      gsap.set(folders.slice(1), { visibility: 'visible' });
      let active = -1;
      const setFolderState = index => {
        if (active === index) return;
        active = index;
        stage.dataset.activeFolder = String(index + 1);
        folders.forEach((folder, i) => {
          folder.inert = i !== index;
          folder.setAttribute('aria-hidden', String(i !== index));
        });
      };
      const tl = gsap.timeline({
        scrollTrigger: {
          id: 'v2-folders', trigger: stage, start: () => `top ${innerHeight - stage.offsetHeight}px`,
          end: () => `+=${folderDistance() + innerHeight}`,
          pin: true, scrub: .35, anticipatePin: 1, invalidateOnRefresh: true,
          onUpdate: self => {
            document.querySelector('.intro-grid').style.setProperty('--grid-bottom', `${self.progress === 0 ? 0 : self.progress === 1 ? innerHeight : Math.max(0, innerHeight - pinTop() - stage.offsetHeight)}px`);
            const folderProgress = self.progress * (folderDistance() + innerHeight) / folderDistance();
            setFolderState(folderProgress < .35 ? 0 : folderProgress < .77 ? 1 : 2);
          }
        }
      });
      tl.to({}, { duration: .25 }).fromTo(folders[1], { y: entranceY }, { y: 0, duration: 1, ease: 'none' })
        .to({}, { duration: .3 }).fromTo(folders[2], { y: entranceY }, { y: 0, duration: 1, ease: 'none' })
        .to({}, { duration: .3 });
      // Leave the finished folders pinned while the next opaque layer covers them.
      const coverDuration = 2.85 * innerHeight / folderDistance();
      tl.to(stage, { scale: .7, opacity: .5, duration: coverDuration * .9, ease: 'none' })
        .to(stage, { opacity: 0, duration: coverDuration * .1, ease: 'none' });
      setFolderState(0);
      if (window.SplitText) { revealTitle('#work-title', '#work-title'); revealTitle('#play-title', '#play-title'); }
      gsap.set(footerPath, { drawSVG: '0%' });
      gsap.timeline({ scrollTrigger: {
        id: 'v2-footer', trigger: '.v2-footer', start: 'top 80%', end: 'clamp(bottom bottom)', scrub: true
      } }).to(footerPath, { drawSVG: '100%', duration: 1.12, ease: 'none' });
      if (window.SplitText) {
        document.querySelectorAll('.footer-thanks > p, .footer-thanks > span').forEach(text => {
          SplitText.create(text, {
            type: 'words,lines', mask: 'lines', autoSplit: true,
            onSplit: instance => gsap.from(instance.lines, {
              yPercent: 120, stagger: .1, ease: 'none',
              scrollTrigger: { trigger: '.footer-thanks', start: 'clamp(top bottom)', end: () => ScrollTrigger.maxScroll(window) - 1, scrub: true }
            })
          });
        });
      }

    }
    return () => {
      folders.forEach(folder => { folder.inert = false; folder.removeAttribute('aria-hidden'); });
    };
  });

  // MWG effect 001: pointer velocity displaces each image and returns it to zero.
  const collage = document.querySelector('.play-collage');
  let pointer = null;
  let velocity = { x: 0, y: 0 };
  let zIndex = 3;
  const impulses = new Map();
  collage.addEventListener('pointermove', event => {
    const now = performance.now();
    if (pointer) {
      const dt = Math.max(8, now - pointer.time);
      velocity = { x: gsap.utils.clamp(-1600, 1600, (event.clientX - pointer.x) / dt * 1000), y: gsap.utils.clamp(-1600, 1600, (event.clientY - pointer.y) / dt * 1000) };
    }
    pointer = { x: event.clientX, y: event.clientY, time: now };
  }, { capture: true });
  collage.addEventListener('pointerleave', () => { pointer = null; velocity = { x: 0, y: 0 }; });
  document.querySelectorAll('.play-item').forEach(item => {
    const target = item.querySelector('.play-motion');
    item.addEventListener('pointerenter', event => {
      if (event.pointerType !== 'mouse' || reduce.matches) return;
      impulses.get(item)?.kill();
      item.style.zIndex = String(++zIndex);
      const fresh = pointer && performance.now() - pointer.time < 120;
      const vx = fresh ? velocity.x * .65 : 0;
      const vy = fresh ? velocity.y * .65 : 0;
      const tl = gsap.timeline({ onComplete: () => { item.style.zIndex = ''; impulses.delete(item); } });
      if (window.InertiaPlugin) {
        tl.to(target, { inertia: { x: { velocity: vx, end: 0 }, y: { velocity: vy, end: 0 }, duration: { min: .65, max: 1.15 } } });
      } else {
        tl.to(target, { x: vx * .035, y: vy * .035, duration: .2 }).to(target, { x: 0, y: 0, duration: .65, ease: 'power2.out' });
      }
      tl.to(target, { rotation: gsap.utils.clamp(-12, 12, vx * .012), duration: .3, ease: 'power1.out' }, 0)
        .to(target, { rotation: 0, duration: .55, ease: 'power2.out' }, .3);
      impulses.set(item, tl);
    });
  });

  ScrollTrigger.addEventListener('refresh', alignHeroThread);
  document.fonts.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
  window.addEventListener('blur', hideBrush);
  window.addEventListener('pageshow', event => { if (event.persisted) ScrollTrigger.refresh(); });
  window.addEventListener('pagehide', () => { growth?.kill(); impulses.forEach(tl => tl.kill()); });
  alignHeroThread();
})();
