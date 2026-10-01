(() => {
  'use strict';
  const main = document.querySelector('.v2-main');
  const knot = document.querySelector('.knot');
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

  // Track the shared header height for the homepage layout.
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
    knot.style.visibility = 'hidden';
    return;
  }
  gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin);
  if (window.InertiaPlugin) gsap.registerPlugin(InertiaPlugin);
  if (window.ScrambleTextPlugin) gsap.registerPlugin(ScrambleTextPlugin);
  if (window.SplitText) gsap.registerPlugin(SplitText);
  main.classList.add('has-scroll-layers');
  if (reduce.matches) document.querySelectorAll('.desk-date > svg, .animated-art > svg').forEach(svg => svg.pauseAnimations());

  const canvas = document.querySelector('.knot-ink');
  const ctx = canvas.getContext('2d');
  const knotSvg = knot.querySelector('.knot-growth');
  const knotPaths = knotSvg.querySelectorAll('path');
  const bracketPaths = document.querySelectorAll('.hero-bracket path');
  let inkReady = false;
  let drag = null;
  let previousBrush = null;
  const ink = new Image();
  // Serialize before DrawSVG changes the strokes; use the same bounds for both layers.
  const inkSource = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(knotSvg));
  const inkLoaded = new Promise(resolve => {
    ink.onload = () => {
      if (ctx) ctx.drawImage(ink, 0, 0, canvas.width, canvas.height);
      resolve(Boolean(ctx));
    };
    ink.onerror = () => resolve(false);
    ink.src = inkSource;
  });
  const handoffInk = ready => {
    inkReady = ready;
    knot.dataset.state = ready ? 'ready' : 'unavailable';
    knot.classList.toggle('is-ready', ready);
    knotSvg.style.visibility = 'hidden';
  };

  const tokens = document.querySelectorAll('.headline-token, .hero-company p');
  const bottomObjects = document.querySelectorAll('.desk-letter, .desk-brush, .desk-lamp');
  const updateCard = document.querySelector('.desk-date');
  let intro;
  if (!reduce.matches) {
    gsap.set('.desk-object', {autoAlpha: 0});
    gsap.set(tokens, { yPercent: 110, opacity: 0 });
    gsap.set([...knotPaths, ...bracketPaths], {drawSVG: '0%'});
  }
  Promise.all([document.fonts.ready, inkLoaded, window.homepageLoading?.ready]).then(([, ready]) => {
    if (reduce.matches) {
      gsap.set(tokens, {yPercent: 0, opacity: 1});
      gsap.set('.desk-object', {autoAlpha: 1, clearProps: 'transform'});
      gsap.set(bracketPaths, {drawSVG: '100%'});
      handoffInk(ready);
      return;
    }
    intro = gsap.timeline();
    intro.addLabel('text')
      .to(tokens, { yPercent: 0, opacity: 1, duration: .65, ease: 'power3.out' }, 'text')
      .addLabel('deskObjects')
      .fromTo(bottomObjects, { y: 48, scale: .88, autoAlpha: 0 }, { y: -7, scale: 1.055, autoAlpha: 1, duration: .55, ease: 'power3.out' }, 'deskObjects')
      .to(bottomObjects, { y: 0, scale: 1, duration: .9, ease: 'elastic.out(1, .65)', clearProps: 'transform' }, '-=.2')
      .addLabel('strokes')
      .to(bracketPaths, {drawSVG: '100%', duration: .4, ease: 'none'}, 'strokes');
    if (ready) {
      intro.set(knot, {attr: {'data-state': 'growing'}}, 'strokes')
        .to(knotPaths, {drawSVG: '100%', duration: .2, ease: 'none', onComplete: () => handoffInk(true)}, 'strokes');
    } else handoffInk(false);
    intro.addLabel('updateCard', 'strokes+=.4')
      .fromTo(updateCard, { y: 48, scale: .88, autoAlpha: 0 }, { y: -7, scale: 1.055, autoAlpha: 1, duration: .55, ease: 'power3.out' }, 'updateCard')
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
  });

  function hideBrush() {
    const pointerId = drag?.id;
    drag = null;
    previousBrush = null;
    if (pointerId !== undefined && brush.hasPointerCapture(pointerId)) brush.releasePointerCapture(pointerId);
    brush.classList.remove('is-dragging');
    brush.style.removeProperty('--brush-grab-transform');
    gsap.to(brush, { x: 0, y: 0, duration: reduce.matches ? 0 : .35, ease: 'power2.out', overwrite: true });
  }

  // Keep the exported 588 × 440 artwork at its native geometry; scale its canvas only.
  function layoutDesignerArtwork() {
    const designer = stage.closest('.designer');
    if (!designer.classList.contains('is-animated')) return;
    const navHeight = parseFloat(getComputedStyle(main).getPropertyValue('--top-nav-height')) || 0;
    const bodyWidth = stage.querySelector('.designer-body').clientWidth;
    const stacked = designer.clientWidth <= 1010;
    const gap = stacked ? gsap.utils.clamp(12, 45, (innerHeight - navHeight - 600) * .12) : 32;
    designer.style.setProperty('--designer-gap', `${gap}px`);
    let width = bodyWidth - 260 - 24;
    if (stacked) {
      const copyHeight = stage.querySelector('.designer-copy-window').offsetHeight;
      const availableHeight = innerHeight - navHeight - 24 - stage.querySelector('.designer-intro').offsetHeight - copyHeight - gap - parseFloat(getComputedStyle(stage.querySelector('.designer-intro')).marginBottom);
      width = Math.min(588, bodyWidth, Math.max(100, availableHeight) * 588 / 440);
    }
    designer.style.setProperty('--designer-art-width', `${width}px`);
    designer.style.setProperty('--designer-art-scale', width / 588);
  }

  function animateDesigner() {
    const designer = stage.closest('.designer');
    const panels = [...designer.querySelectorAll('.designer-copy')];
    let animationContext;
    let timeline;
    let splits = [];
    let pendingBuild = false;
    let renderedKey = '';
    let savedProgress = 0;
    let rebuilding = false;
    const dimensions = () => `${designer.clientWidth}:${innerHeight}:${getComputedStyle(main).getPropertyValue('--top-nav-height')}`;
    let frame;
    let disposed = false;

    const build = () => {
      if (disposed) return;
      const previousTrigger = timeline?.scrollTrigger;
      const previousProgress = savedProgress;
      const restorePosition = previousTrigger && previousProgress > 0 && previousProgress < 1;
      rebuilding = true;
      animationContext?.revert();
      splits.forEach(split => split.revert());
      splits = [];
      designer.classList.add('is-animated');
      layoutDesignerArtwork();
      animationContext = gsap.context(() => {
        gsap.fromTo('.designer-juno', { yPercent: 120, autoAlpha: 0 }, {
          yPercent: 0, autoAlpha: 1, ease: 'none', scrollTrigger: {
            trigger: '.designer-intro', start: 'top 80%', end: 'top 55%', scrub: true
          }
        });
        layoutDesignerArtwork();
        const targets = panels.map(panel => {
          const animated = [...panel.querySelectorAll('.designer-motion')];
          if (window.SplitText) {
            panel.querySelectorAll('.designer-split').forEach(text => {
              const split = SplitText.create(text, { type: 'lines', mask: 'lines' });
              splits.push(split);
              animated.push(...split.lines);
            });
          } else {
            animated.push(...panel.querySelectorAll('.designer-split'));
          }
          return animated;
        });
        gsap.set(panels, { autoAlpha: 0 });
        gsap.set(panels[0], { autoAlpha: 1 });
        gsap.set(targets.flat(), { yPercent: 120 });
        const pinTop = () => {
          const navHeight = parseFloat(getComputedStyle(main).getPropertyValue('--top-nav-height')) || 0;
          return designer.clientWidth > 1010 ? 50 : Math.min(navHeight + 24, innerHeight - stage.offsetHeight);
        };
        const folderDistance = () => innerHeight * 2;
        const entranceY = () => {
          const visual = designer.querySelector('.designer-visual');
          const scale = visual.offsetWidth / 588;
          return (innerHeight - pinTop() - (visual.getBoundingClientRect().top - stage.getBoundingClientRect().top) + 2) / scale;
        };
        let active = -1;
        const setFolderState = time => {
          const index = time >= 4.275 ? -1 : time < .95 ? 0 : time < 2.25 ? 1 : 2;
          if (active === index) return;
          active = index;
          stage.dataset.activeFolder = String(index + 1);
          panels.forEach((panel, i) => {
            panel.inert = i !== index;
            panel.setAttribute('aria-hidden', String(i !== index));
          });
        };
        timeline = gsap.timeline({
          onUpdate() {
            setFolderState(this.time());
          },
          scrollTrigger: {
            id: 'v2-folders', refreshPriority: 1, trigger: stage, start: () => `top ${pinTop()}px`,
            end: () => `+=${folderDistance() + innerHeight}`,
            pin: true, scrub: .35, anticipatePin: 1, invalidateOnRefresh: true,
            onUpdate: self => {
              if (!rebuilding && renderedKey === dimensions()) savedProgress = self.progress;
              document.querySelector('.intro-grid').style.setProperty('--grid-bottom', `${self.progress === 0 ? 0 : self.progress === 1 ? innerHeight : Math.max(0, innerHeight - pinTop() - stage.offsetHeight)}px`);
            }
          }
        });
        // Original folder timing: .25 / 1 / .3 / 1 / .3, followed by the Work cover.
        timeline.to({}, { duration: .25 })
          .fromTo(folders[1], { y: entranceY }, { y: 0, duration: 1, ease: 'none' })
          .to({}, { duration: .3 })
          .fromTo(folders[2], { y: entranceY }, { y: 0, duration: 1, ease: 'none' })
          .to({}, { duration: .3 });
        timeline.to(targets[0], { yPercent: 0, duration: .25, ease: 'none' }, 0);
        // Sequential handoffs fit inside each existing slide, so copy never overlaps.
        [[.7, .95], [2, 2.25]].forEach(([out, incoming], i) => {
          timeline.to(targets[i], { yPercent: -120, duration: .25, ease: 'none' }, out)
            .set(panels[i], { autoAlpha: 0 }, incoming)
            .set(panels[i + 1], { autoAlpha: 1 }, incoming)
            .to(targets[i + 1], { yPercent: 0, duration: .3, ease: 'none' }, incoming);
        });
        const coverDuration = 2.85 * innerHeight / folderDistance();
        timeline.to(stage, { scale: .7, opacity: .5, duration: coverDuration * .9, ease: 'none' }, 2.85)
          .to(stage, { opacity: 0, duration: coverDuration * .1, ease: 'none' });
        setFolderState(0);
      }, designer);
      ScrollTrigger.refresh();
      if (restorePosition) {
        const trigger = timeline.scrollTrigger;
        window.scrollTo({ top: trigger.start + previousProgress * (trigger.end - trigger.start), behavior: 'instant' });
        timeline.progress(previousProgress);
        ScrollTrigger.update();
      }
      renderedKey = dimensions();
      savedProgress = timeline.scrollTrigger.progress;
      rebuilding = false;
    };
    const scheduleBuild = () => {
      if (disposed || pendingBuild || dimensions() === renderedKey) return;
      pendingBuild = true;
      frame = requestAnimationFrame(() => document.fonts.ready.then(() => {
        pendingBuild = false;
        if (!disposed && dimensions() !== renderedKey) build();
      }));
    };
    const observer = new ResizeObserver(scheduleBuild);
    observer.observe(designer);
    observer.observe(main);
    window.addEventListener('resize', scheduleBuild);
    document.fonts.ready.then(scheduleBuild);
    document.fonts.addEventListener('loadingdone', scheduleBuild);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', scheduleBuild);
      document.fonts.removeEventListener('loadingdone', scheduleBuild);
      animationContext?.revert();
      splits.forEach(split => split.revert());
      designer.classList.remove('is-animated');
      panels.forEach(panel => { panel.inert = false; panel.removeAttribute('aria-hidden'); });
      delete stage.dataset.activeFolder;
    };
  }

  function brushContactPoint() {
    const tip = brush.querySelector('.brush-tip').getBoundingClientRect();
    const rect = knot.getBoundingClientRect();
    return {x: (tip.left - rect.left) / rect.width * canvas.width, y: (tip.top - rect.top) / rect.height * canvas.height};
  }
  brush.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !inkReady || drag) return;
    event.preventDefault();
    gsap.killTweensOf(brush);
    brush.style.setProperty('--brush-grab-transform', getComputedStyle(brush.querySelector('.brush-visual')).transform);
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, originX: Number(gsap.getProperty(brush, 'x')), originY: Number(gsap.getProperty(brush, 'y')) };
    previousBrush = brushContactPoint();
    brush.setPointerCapture(event.pointerId);
    brush.classList.add('is-dragging');
  });
  brush.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    gsap.set(brush, { x: drag.originX + event.clientX - drag.x, y: drag.originY + event.clientY - drag.y });
    const point = brushContactPoint();
    ctx.globalCompositeOperation = 'destination-out';
    // Diameter follows the short axis of this wide mask; Canvas clips out-of-bounds segments.
    ctx.lineWidth = canvas.height * .58;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(previousBrush.x, previousBrush.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    previousBrush = point;
  });
  brush.addEventListener('pointerup', event => {
    if (!drag || drag.id !== event.pointerId) return;
    hideBrush();
  });
  brush.addEventListener('pointercancel', hideBrush);
  brush.addEventListener('lostpointercapture', () => { if (drag) hideBrush(); });
  brush.addEventListener('click', event => {
    if (event.detail !== 0 || !inkReady) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    knot.dataset.state = 'revealed';
    document.querySelector('#knot-status').textContent = 'Clarity revealed.';
    hideBrush();
  });

  const media = gsap.matchMedia();
  media.add({ motion: '(prefers-reduced-motion: no-preference)', reduced: '(prefers-reduced-motion: reduce)' }, context => {
    const reduced = context.conditions.reduced;
    let cleanupDesigner;
    if (reduced) {
      gsap.set(footerPath, { drawSVG: '100%', visibility: 'visible' });
      gsap.set('.footer-thanks', { autoAlpha: 1 });
    } else {
      const revealTitle = (selector, trigger) => SplitText.create(selector, {type: 'lines', mask: 'lines', autoSplit: true,
        onSplit: split => gsap.from(split.lines, {yPercent: 120, ease: 'none', scrollTrigger: {trigger, start: 'top bottom', end: 'top 65%', scrub: true}})
      });
      cleanupDesigner = animateDesigner();
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
      cleanupDesigner?.();
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

  ScrollTrigger.addEventListener('refresh', layoutDesignerArtwork);
  document.fonts.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
  window.addEventListener('blur', hideBrush);
  window.addEventListener('pageshow', event => { if (event.persisted) { intro?.resume(); ScrollTrigger.refresh(); } });
  window.addEventListener('pagehide', () => { intro?.pause(); impulses.forEach(tl => tl.kill()); });
  layoutDesignerArtwork();
})();
