(() => {
  if (!new URLSearchParams(location.search).has('play-panel')) return;
  const section = document.querySelector('.v2-play');
  if (!section) return;
  const collage = section.querySelector('.play-collage');
  const names = ['coffee', 'cats', 'journal', 'portrait'];
  const labels = ['咖啡', '猫咪', '手帐', '肖像'];
  const photos = names.map(name => section.querySelector(`.play-${name}`));
  const panel = document.createElement('details');
  panel.className = 'play-debug';
  panel.open = true;
  panel.innerHTML = `<summary>Play 手机调试</summary><div class="play-debug-body"><p>勾选保留的照片（至少 1 张）</p><div class="play-debug-choices">${names.map((name, i) => `<label><input type="checkbox" value="${name}" ${i !== 2 ? 'checked' : ''}>${labels[i]}</label>`).join('')}</div><label>作品尺寸 <output>88%</output><input aria-label="作品尺寸" type="range" min="80" max="110" value="88"></label><label><input type="checkbox" name="original"> 对比原版</label><button type="button">恢复三张 · 88%</button><p class="play-debug-status" aria-live="polite"></p></div>`;
  section.querySelector('.play-heading').after(panel);
  const style = document.createElement('style');
  style.textContent = `
    .v2-play:has(.play-debug) { scroll-margin-top:100px; }
    .play-debug { position:relative; z-index:10; margin-top:16px; padding:12px; border:1px solid #aaa; border-radius:8px; background:#f6f6f6; font:13px/1.5 var(--font-sans); }
    .play-debug summary { cursor:pointer; padding:4px; }
    .play-debug-body { display:grid; gap:12px; padding-top:12px; }
    .play-debug-body p { margin:0; }
    .play-debug-choices { display:flex; flex-wrap:wrap; gap:8px 16px; }
    .play-debug label { display:flex; align-items:center; gap:8px; min-height:32px; }
    .play-debug input[type=range] { flex:1; min-width:50px; }
    .play-debug button { font:inherit; padding:8px; cursor:pointer; }
    @media(min-width:601px) { .play-debug { max-width:420px; } }
    @media(max-width:600px) {
      .play-mobile-debug .play-collage { height:var(--debug-height); margin-top:24px; isolation:isolate; }
      .play-mobile-debug .play-dots { inset:-16px -12px 0; z-index:-2; background-size:14px 14px; mask-image:radial-gradient(ellipse closest-side at center, #000 35%, transparent 100%); }
      .play-mobile-debug .view-all { position:relative; inset:auto; translate:none; width:max-content; min-height:44px; margin:16px auto 0; gap:8px; font-size:14px; z-index:3; }
      .play-mobile-debug .view-all img { width:27px; height:28px; }
      .play-mobile-debug .play-item,.play-mobile-debug .play-paint { translate:none; }
      .play-mobile-debug .play-item:has(>img) { left:var(--debug-x); top:var(--debug-y); width:var(--debug-width); transform:translateX(-50%) rotate(var(--debug-angle)); }
      .play-mobile-debug .play-item[data-debug-hidden] { display:none; }
      .play-mobile-debug .play-palette { left:13%; top:var(--debug-star-y); width:12%; z-index:2; transform:rotate(-12deg); }
      .play-mobile-debug .play-label { left:7%; top:var(--debug-label-y); bottom:auto; width:86%; z-index:3; transform:rotate(-5deg); }
      .play-mobile-debug .play-label-art { background:#f6f6f6; border-radius:50%; }
      .play-mobile-debug .play-label-art span { font-size:clamp(9px,2.8vw,16px); }
      .play-mobile-debug .play-clip { left:76%; top:var(--debug-clip-y); width:8%; z-index:3; transform:rotate(12deg); }
      .play-mobile-debug .play-paint { left:12%; top:12px; width:76%; height:calc(100% - 24px); object-fit:fill; z-index:-1; mask-image:radial-gradient(ellipse closest-side at center, #000 45%, transparent 100%); }
    }`;
  document.head.append(style);
  const checks = [...panel.querySelectorAll('.play-debug-choices input')];
  const slider = panel.querySelector('[type=range]');
  const original = panel.querySelector('[name=original]');
  const mobile = matchMedia('(max-width:600px)');
  function update() {
    const selected = checks.map((check, i) => check.checked ? i : -1).filter(i => i >= 0);
    checks.forEach(check => { check.disabled = check.checked && selected.length === 1; });
    section.classList.toggle('play-mobile-debug', !original.checked);
    const w = collage.clientWidth;
    const size = Number(slider.value) / 100;
    let bottom = 0;
    photos.forEach((photo, i) => {
      const slot = selected.indexOf(i);
      photo.toggleAttribute('data-debug-hidden', slot < 0);
      if (slot < 0) return;
      const width = w * (selected.length === 1 ? .72 : .52) * size;
      const height = width * (names[i] === 'cats' ? 352.8 / 284.4 : 1);
      const y = 20 + slot * w * .48 * size;
      photo.style.setProperty('--debug-width', `${width}px`);
      photo.style.setProperty('--debug-x', selected.length === 1 ? '50%' : slot % 2 ? '66%' : '34%');
      photo.style.setProperty('--debug-y', `${y}px`);
      photo.style.setProperty('--debug-angle', `${slot % 2 ? 8 : -6}deg`);
      bottom = Math.max(bottom, y + height + width * .08);
    });
    // Place decorations among the photos, anchored to the first two photo slots.
    const step = w * .48 * size;
    collage.style.setProperty('--debug-label-y', `${20 + step * .78}px`);
    collage.style.setProperty('--debug-star-y', `${20 + step * 1.48}px`);
    collage.style.setProperty('--debug-clip-y', `${selected.length > 1 ? 8 + step : 12}px`);
    collage.style.setProperty('--debug-height', `${Math.max(bottom, 20 + step * 1.48 + w * .12) + 20}px`);
    panel.querySelector('output').value = `${slider.value}%`;
    panel.querySelector('.play-debug-status').textContent = !mobile.matches ? '请在手机宽度（≤600px）查看；当前保持桌面排版。' : original.checked ? '原版：4 张作品，原有尺寸与排布。' : `${selected.length} 张作品 · ${slider.value}% · 仅本次预览生效`;
    window.ScrollTrigger?.refresh();
  }
  panel.addEventListener('input', update);
  panel.querySelector('button').addEventListener('click', () => {
    checks.forEach((check, i) => { check.checked = i !== 2; });
    slider.value = '88'; original.checked = false; update();
  });
  let previousWidth = 0;
  new ResizeObserver(() => { if (collage.clientWidth !== previousWidth) { previousWidth = collage.clientWidth; update(); } }).observe(collage);
  mobile.addEventListener('change', update);
  update();
  window.addEventListener('load', () => section.scrollIntoView(), { once:true });
})();
