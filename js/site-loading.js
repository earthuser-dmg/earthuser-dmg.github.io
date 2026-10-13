document.addEventListener('DOMContentLoaded', async () => {
  'use strict';
  const gate = window.siteLoading;
  const overlay = document.querySelector('#opening-loader');
  if (!gate || gate.done || !overlay) return;
  [...document.body.children].forEach(element => {
    if (element !== overlay && element.tagName !== 'SCRIPT' && !element.inert) {
      element.inert = true;
      element.setAttribute('data-opening-inert', '');
    }
  });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width:600px)');
  const ns = 'http://www.w3.org/2000/svg';
  const element = (tag, attrs = {}) => {
    const node = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
  };
  try {
    const responses = await Promise.all([
      fetch('/assets/loading-illustration/12305-813.svg'),
      fetch('/assets/loading-illustration/motion-paths.json')
    ]);
    if (responses.some(response => !response.ok)) throw new Error('Loading artwork unavailable');
    const [source, paths] = await Promise.all([responses[0].text(), responses[1].json()]);
    if (gate.done) return;
    const exported = new DOMParser().parseFromString(source, 'image/svg+xml');
    const layers = [...exported.documentElement.firstElementChild.children];
    const panels = element('svg', {id:'opening-panels', 'aria-hidden':'true'});
    const defs = element('defs');
    const clip = element('clipPath', {id:'opening-clip'});
    const clipRect = element('rect', {x:0, y:-10000, width:0, height:20000});
    clip.append(clipRect); defs.append(clip); panels.append(defs);
    const lineData = paths[0];
    const matrix = n => { const m=n.transform; return `matrix(${m[0][0]} ${m[1][0]} ${m[0][1]} ${m[1][1]} ${m[0][2]} ${m[1][2]})`; };
    const upper = element('g', {id:'opening-upper'}), lower = element('g', {id:'opening-lower'});
    const d = lineData.paths[0].data;
    // Both paper halves share the Figma center path. The original textured
    // stroke travels with each edge, preserving the exported hand-drawn line.
    [upper, lower].forEach((group, i) => {
      group.append(element('path', {d:`${d} L 1500 ${i ? 10000 : -10000} L -100 ${i ? 10000 : -10000} Z`, transform:matrix(lineData), fill:'white'}));
      group.append(layers[1].cloneNode(true));
    });
    panels.append(upper, lower);
    const paper = element('rect', {x:-10000,y:-10000,width:20000,height:20000,fill:'white',id:'opening-paper'});
    const line = element('g', {id:'opening-line', 'clip-path':'url(#opening-clip)'});
    line.append(layers[1].cloneNode(true)); panels.append(paper,line); overlay.append(panels);
    const art = element('svg', {id:'opening-badge',viewBox:'535 285 210 230','aria-hidden':'true'});
    const artDefs = element('defs'); art.append(artDefs);
    const wobble = element('filter', {id:'opening-illustration-wobble',x:'-15%',y:'-15%',width:'130%',height:'130%'});
    const noise = element('feTurbulence', {type:'fractalNoise',baseFrequency:'.018',numOctaves:2,seed:1,result:'noise'});
    noise.append(element('animate', {attributeName:'seed',values:'1;7;13;1',dur:'.48s',calcMode:'discrete',repeatCount:'indefinite'}));
    wobble.append(noise,element('feDisplacementMap',{in:'SourceGraphic',in2:'noise',scale:2.5,xChannelSelector:'R',yChannelSelector:'G'}));
    artDefs.append(wobble);
    const figure=element('g',{id:'opening-illustration-figure'});
    layers.slice(3,21).forEach(layer => figure.append(layer.cloneNode(true)));
    art.append(figure);
    const syncWobble=()=>figure.setAttribute('filter',reduced.matches?'none':'url(#opening-illustration-wobble)');
    syncWobble(); reduced.addEventListener('change',syncWobble);
    const draws = [];
    paths.slice(1).forEach((data, i) => {
      const mask = element('mask', {id:`grow-${i}`,maskUnits:'userSpaceOnUse',x:530,y:285,width:220,height:230});
      const trace = element('path',{d:data.paths[0].data,transform:matrix(data),fill:'none',stroke:'white','stroke-width':5,'stroke-linecap':'round','stroke-linejoin':'round'});
      mask.append(trace); artDefs.append(mask);
      const symbol=layers[24-i].cloneNode(true);
      symbol.setAttribute('mask',`url(#grow-${i})`); art.append(symbol); draws.push(trace);
    });
    artDefs.append(element('path',{id:'opening-percent-arc',d:'M 562 378.5 A 80.5 80.5 0 0 1 723 378.5'}));
    const text = element('text', {fill:'black','font-family':'Manrope,sans-serif','font-size':18,'font-weight':700,'text-anchor':'middle'});
    const percentage = element('textPath', {id:'opening-percent',href:'#opening-percent-arc',startOffset:'50%','dominant-baseline':'central'});
    text.append(percentage); art.append(text); overlay.append(art);
    const lengths=draws.map(trace => trace.getTotalLength());
    draws.forEach((trace,i) => {trace.style.strokeDasharray=lengths[i];});
  let target = 0;
  let progress = 0;
  let closing = false;
  let timeline;
  let previous;
    function fit() {
      const height=1280*innerHeight/innerWidth;
      panels.setAttribute('viewBox',`0 ${416-height/2} 1280 ${height}`);
      panels.style.visibility=mobile.matches ? 'hidden' : 'visible';
      // Desktop follows the same Figma scale as its supporting line.
      art.style.marginTop=mobile.matches ? '0px' : `${(400-416)*innerWidth/1280}px`;
      art.style.width=`${210*(mobile.matches?1:innerWidth/1280)}px`;
      art.style.height=`${230*(mobile.matches?1:innerWidth/1280)}px`;
      return height/2+120;
    }
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
  const pageLoaded = new Promise(resolve => {
    if (document.readyState === 'complete') resolve();
    else window.addEventListener('load', resolve, {once:true});
  });
  const images = [...document.images].filter(image => image.loading !== 'lazy');
  const jobs = [...images.map(settleImage), pageLoaded,
    pageLoaded.then(() => document.fonts.ready)];
  let completed = 0;
  jobs.forEach(job => Promise.resolve(job).catch(() => {}).then(() => {
    target = ++completed / jobs.length;
    overlay.dataset.resourceProgress = target;
  }));
    function exit() {
      if(closing || gate.done) return;
      closing=true;
      if(reduced.matches || !window.gsap) {gate.finish();return;}
      overlay.classList.add('exiting');
      paper.style.visibility='hidden'; line.style.visibility='hidden';
      gate.reveal();
      if(mobile.matches) {
        // No progress line on phones; two white sheets reveal the page.
        panels.style.visibility='visible'; upper.style.visibility='hidden'; lower.style.visibility='hidden';
        const height=1280*innerHeight/innerWidth, top=416-height/2;
        const a=element('rect',{x:0,y:top,width:1280,height:height/2+1,fill:'white',class:'mobile-paper'});
        const b=element('rect',{x:0,y:416,width:1280,height:height/2+1,fill:'white',class:'mobile-paper'});
        panels.append(a,b);
        timeline=gsap.timeline({onComplete:gate.finish}).to(a,{y:-height/2-2,duration:1.15,ease:'power2.inOut'},0).to(b,{y:height/2+2,duration:1.15,ease:'power2.inOut'},0);
      } else {
        const distance=fit();
        timeline=gsap.timeline({onComplete:gate.finish}).to(upper,{y:-distance,duration:1.15,ease:'power2.inOut'},0).to(lower,{y:distance,duration:1.15,ease:'power2.inOut'},0);
      }
      timeline.to(art,{opacity:0,duration:.16},.22);
    }
  const tick = now => {
    if (gate.done) return;
    const dt = previous === undefined ? 0 : Math.min(now - previous, 50);
    previous = now;
    // Real resource progress is the ceiling. The 900ms full-span catch-up
    // makes cached loads visibly grow instead of flashing a completed line.
    progress = reduced.matches ? target : Math.min(target, progress + dt / 900);
    const percent = Math.floor(progress * 100);
    percentage.textContent = `${percent}%`;
    clipRect.setAttribute('width', progress * 1280);
    draws.forEach((trace, i) => {
      const fraction = Math.max(0, Math.min(1, (progress - i * .2) / .2));
      trace.style.strokeDashoffset = lengths[i] * (1 - fraction);
      trace.style.visibility = fraction === 0 ? 'hidden' : 'visible';
    });
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
  } catch (error) {
    // A missing artwork must never block access to the site.
    gate.finish();
    console.warn('Loading illustration unavailable', error);
  }
}, {once:true});
