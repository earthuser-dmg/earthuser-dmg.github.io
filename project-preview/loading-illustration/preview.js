(async () => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const ns = 'http://www.w3.org/2000/svg';
  const loader = $('#loader');
  const frame = $('#homepage');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width:600px)');
  let progress = 0, target = 0, manual = false, closing = false, raf, timeline;
  const element = (tag, attrs = {}) => {
    const node = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
  };
  try {
    const [source, paths, home, common] = await Promise.all([
      fetch('assets/12305-813.svg').then(r => r.text()),
      fetch('assets/motion-paths.json').then(r => r.json()),
      fetch('/index.html').then(r => r.text()),
      fetch('/js/common.js').then(r => r.text())
    ]);
    const exported = new DOMParser().parseFromString(source, 'image/svg+xml');
    const layers = [...exported.documentElement.firstElementChild.children];
    const panels = element('svg', {id:'panels', 'aria-hidden':'true'});
    const defs = element('defs');
    const clip = element('clipPath', {id:'line-clip'});
    const clipRect = element('rect', {x:0, y:-10000, width:0, height:20000});
    clip.append(clipRect); defs.append(clip); panels.append(defs);
    const lineData = paths[0];
    const matrix = n => { const m=n.transform; return `matrix(${m[0][0]} ${m[1][0]} ${m[0][1]} ${m[1][1]} ${m[0][2]} ${m[1][2]})`; };
    const upper = element('g', {id:'upper'}), lower = element('g', {id:'lower'});
    const d = lineData.paths[0].data;
    // Both paper halves share the Figma center path. The original textured
    // stroke travels with each edge, preserving the exported hand-drawn line.
    [upper, lower].forEach((group, i) => {
      group.append(element('path', {d:`${d} L 1500 ${i ? 10000 : -10000} L -100 ${i ? 10000 : -10000} Z`, transform:matrix(lineData), fill:'white'}));
      group.append(layers[1].cloneNode(true));
    });
    panels.append(upper, lower);
    const paper = element('rect', {x:-10000,y:-10000,width:20000,height:20000,fill:'white',id:'paper'});
    const line = element('g', {id:'line', 'clip-path':'url(#line-clip)'});
    line.append(layers[1].cloneNode(true)); panels.append(paper,line); loader.append(panels);
    const art = element('svg', {id:'art',viewBox:'535 285 210 230','aria-hidden':'true'});
    const artDefs = element('defs'); art.append(artDefs);
    const wobble = element('filter', {id:'illustration-wobble',x:'-15%',y:'-15%',width:'130%',height:'130%'});
    const noise = element('feTurbulence', {type:'fractalNoise',baseFrequency:'.018',numOctaves:2,seed:1,result:'noise'});
    noise.append(element('animate', {attributeName:'seed',values:'1;7;13;1',dur:'.48s',calcMode:'discrete',repeatCount:'indefinite'}));
    wobble.append(noise,element('feDisplacementMap',{in:'SourceGraphic',in2:'noise',scale:2.5,xChannelSelector:'R',yChannelSelector:'G'}));
    artDefs.append(wobble);
    const figure=element('g',{id:'illustration-figure'});
    layers.slice(3,21).forEach(layer => figure.append(layer.cloneNode(true)));
    art.append(figure);
    const syncWobble=()=>figure.setAttribute('filter',reduced.matches?'none':'url(#illustration-wobble)');
    syncWobble(); reduced.addEventListener('change',syncWobble);
    const draws = [];
    paths.slice(1).forEach((data, i) => {
      const mask = element('mask', {id:`grow-${i}`,maskUnits:'userSpaceOnUse',x:530,y:285,width:220,height:230});
      const trace = element('path',{d:data.paths[0].data,transform:matrix(data),fill:'none',stroke:'white','stroke-width':5,'stroke-linecap':'round','stroke-linejoin':'round'});
      mask.append(trace); artDefs.append(mask);
      const symbol=layers[24-i].cloneNode(true);
      symbol.setAttribute('mask',`url(#grow-${i})`); art.append(symbol); draws.push(trace);
    });
    artDefs.append(element('path',{id:'percent-arc',d:'M 562 378.5 A 80.5 80.5 0 0 1 723 378.5'}));
    const text = element('text', {fill:'black','font-family':'Manrope,sans-serif','font-size':18,'font-weight':700,'text-anchor':'middle'});
    const percentage = element('textPath', {href:'#percent-arc',startOffset:'50%','dominant-baseline':'central'});
    text.append(percentage); art.append(text); loader.append(art);
    const lengths=draws.map(trace => trace.getTotalLength());
    draws.forEach((trace,i) => {trace.style.strokeDasharray=lengths[i];});
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
    function render(value) {
      progress=Math.max(0,Math.min(1,value));
      const number=Math.floor(progress*100+1e-7);
      percentage.textContent=`${number}%`; $('#value').value=`${number}%`; $('#progress').value=number;
      loader.setAttribute('aria-valuenow',number);
      clipRect.setAttribute('width',1280*progress);
      draws.forEach((trace,i) => {
        const fraction=Math.max(0,Math.min(1,(progress-i*.2)/.2));
        trace.style.strokeDashoffset=lengths[i]*(1-fraction);
        trace.style.visibility=fraction===0?'hidden':'visible';
        trace.dataset.drawn=fraction;
      });
    }
    const reveal=()=>frame.contentWindow.homepageLoading?.reveal();
    function complete() { closing=true; cancelAnimationFrame(raf); timeline?.kill(); loader.hidden=true; frame.inert=false; reveal(); }
    function exit() {
      if(closing) return;
      closing=true;
      if(reduced.matches || !window.gsap) {complete();return;}
      loader.classList.add('exiting');
      paper.style.visibility='hidden'; line.style.visibility='hidden';
      reveal();
      if(mobile.matches) {
        // No progress line on phones; two white sheets reveal the page.
        panels.style.visibility='visible'; upper.style.visibility='hidden'; lower.style.visibility='hidden';
        const height=1280*innerHeight/innerWidth, top=416-height/2;
        const a=element('rect',{x:0,y:top,width:1280,height:height/2+1,fill:'white',class:'mobile-paper'});
        const b=element('rect',{x:0,y:416,width:1280,height:height/2+1,fill:'white',class:'mobile-paper'});
        panels.append(a,b);
        timeline=gsap.timeline({onComplete:complete}).to(a,{y:-height/2-2,duration:1.15,ease:'power2.inOut'},0).to(b,{y:height/2+2,duration:1.15,ease:'power2.inOut'},0);
      } else {
        const distance=fit();
        timeline=gsap.timeline({onComplete:complete}).to(upper,{y:-distance,duration:1.15,ease:'power2.inOut'},0).to(lower,{y:distance,duration:1.15,ease:'power2.inOut'},0);
      }
      timeline.to(art,{opacity:0,duration:.16},.22);
    }
    function reset() {
      cancelAnimationFrame(raf); timeline?.kill(); closing=false; loader.hidden=false; loader.classList.remove('exiting'); frame.inert=true;
      if(window.gsap) gsap.set([upper,lower],{clearProps:'transform'});
      upper.style.visibility=''; lower.style.visibility=''; art.style.opacity=1; paper.style.visibility=''; line.style.visibility='';
      panels.querySelectorAll('.mobile-paper').forEach(n=>n.remove()); fit(); render(0);
    }
    function play() {
      reset(); manual=false; let previous;
      const tick=now=>{
        if(manual||closing) return;
        const dt=previous===undefined?0:Math.min(50,now-previous); previous=now;
        render(reduced.matches?target:Math.min(target,progress+dt/($('#slow').checked?5000:900)));
        if(progress>=1) {raf=requestAnimationFrame(exit);return;} raf=requestAnimationFrame(tick);
      }; raf=requestAnimationFrame(tick);
    }
    $('#replay').onclick=play;
    $('#progress').oninput=e=>{const value=Number(e.target.value)/100; manual=true; reset(); render(value);};
    $('#finish').onclick=()=>{manual=true;cancelAnimationFrame(raf);render(1);exit();};
    $('#hide').onclick=()=>{$('#controls').hidden=true;$('#show').hidden=false;};
    $('#show').onclick=()=>{$('#controls').hidden=false;$('#show').hidden=true;};
    window.addEventListener('resize',()=>{if(closing) complete();else fit();});
    reduced.addEventListener('change',()=>{if(closing&&reduced.matches){timeline?.kill();complete();}});
    // Monitor only this isolated preview's resources. Never touch site-entry-seen.
    window.trackPreviewResources = win => {
      const settle=image=>new Promise(resolve=>{
        const done=()=>Promise.resolve(image.decode?.()).catch(()=>{}).then(resolve);
        if(image.complete)done();else {image.addEventListener('load',done,{once:true});image.addEventListener('error',done,{once:true});}
      });
      const loaded=new Promise(resolve=>win.addEventListener('load',resolve,{once:true}));
      const jobs=[...Array.from(win.document.images).filter(i=>i.loading!=='lazy').map(settle),loaded,document.fonts.ready,loaded.then(()=>win.document.fonts.ready)];
      let count=0; jobs.forEach(job=>Promise.resolve(job).catch(()=>{}).then(()=>{target=++count/jobs.length; loader.dataset.resourceProgress=target;}));
    };
    const doc=new DOMParser().parseFromString(home,'text/html');
    doc.querySelectorAll('script[src*="site-loading"],link[href*="site-loading"],script[src*="googletagmanager"]').forEach(n=>n.remove());
    doc.querySelectorAll('script:not([src])').forEach(n=>{if(n.textContent.includes('gtag('))n.remove();});
    // srcdoc has no navigable location URL; adapt the preview copy only.
    const commonScript=doc.querySelector('script[src*="/js/common.js"]');
    const commonUrl=URL.createObjectURL(new Blob([common.replaceAll('window.location.href','document.baseURI').replaceAll('window.location.pathname',"new URL(document.baseURI).pathname")],{type:'text/javascript'}));
    commonScript.src=commonUrl; frame.addEventListener('load',()=>URL.revokeObjectURL(commonUrl),{once:true});
    const base=doc.createElement('base');base.href=location.origin+'/';doc.head.prepend(base);
    const gate=doc.createElement('script');gate.textContent="window.homepageLoading={ready:new Promise(r=>{window.revealPreviewHome=r})};window.homepageLoading.reveal=()=>window.revealPreviewHome();document.addEventListener('DOMContentLoaded',()=>parent.trackPreviewResources(window),{once:true});";
    doc.head.prepend(gate); frame.srcdoc='<!doctype html>'+doc.documentElement.outerHTML;
    fit();play();window.resolvePreviewReady();
    setTimeout(()=>{if(!manual&&!closing&&!loader.hidden) complete();},15000);
  } catch(error) {
    $('#error').hidden=false;$('#error').textContent=`预览资源读取失败：${error.message}`;
    console.error(error);
  }
})();
