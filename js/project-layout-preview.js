(() => {
  if (!new URLSearchParams(location.search).has('layout-panel')) return;
  const section = document.querySelector('.project-v2 .project-section');
  if (!section) return;
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:10002;max-width:calc(100vw - 40px)';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <style>
      :host { font:14px/1.5 system-ui,sans-serif;color:#1e1e1e; }
      details { box-sizing:border-box;width:310px;max-width:calc(100vw - 40px);padding:16px;background:white;border:1px solid #aaa;max-height:70dvh;overflow:auto; }
      summary { cursor:pointer;font-weight:600; }
      label { display:block;margin-top:16px; }
      input { display:block;width:100%;accent-color:#532889; }
      output { display:block;font-variant-numeric:tabular-nums; }
      p { font-size:12px;color:#666; }
      button { font:inherit;padding:6px 12px;background:white;border:1px solid #aaa;cursor:pointer; }
    </style>
    <details open><summary>Project page · 布局调试</summary>
      <label for="ratio">标题占比（不含栏间距）</label>
      <input id="ratio" type="range" min="15" max="50" step="0.1" value="33.3333">
      <output id="ratio-value" for="ratio"></output>
      <label for="gap">栏间距</label>
      <input id="gap" type="range" min="0" max="100" step="1">
      <output id="gap-value" for="gap"></output>
      <p id="measure" aria-live="polite"></p>
      <p>≥601px 实时调整所有章节。手机保持单栏。调节仅在本次页面生效，刷新恢复；可点击标题收起面板。</p>
      <button id="reset" type="button">恢复原布局</button>
    </details>`;
  const style = document.createElement('style');
  document.head.append(style);
  document.body.append(host);
  const ratio = root.querySelector('#ratio');
  const gap = root.querySelector('#gap');
  const comparisonMedia = document.querySelector('#comparison > .project-section-body');
  if (comparisonMedia) {
    const label = document.createElement('label');
    label.htmlFor = 'media-layout';
    label.textContent = 'Before / After 媒体布局';
    const select = document.createElement('select');
    select.id = 'media-layout';
    select.style.cssText = 'display:block;width:100%;margin-top:8px;padding:6px;font:inherit';
    select.innerHTML = '<option value="wide">通栏 · 跨越标题与内容栏</option><option value="right">右栏 · 与正文对齐</option>';
    select.value = comparisonMedia.classList.contains('project-media--wide') ? 'wide' : 'right';
    const initialLayout = select.value;
    const applyMediaLayout = () => {
      comparisonMedia.classList.toggle('project-media--wide', select.value === 'wide');
      comparisonMedia.classList.toggle('project-media--right', select.value === 'right');
      window.ScrollTrigger?.refresh();
    };
    select.addEventListener('change', applyMediaLayout);
    root.querySelector('#measure').before(label, select);
    root.querySelector('#reset').addEventListener('click', () => {
      select.value = initialLayout;
      applyMediaLayout();
    });
  }
  let adjusted = false;
  function measure() {
    const columns = getComputedStyle(section).gridTemplateColumns.split(' ');
    const actualGap = parseFloat(getComputedStyle(section).columnGap);
    root.querySelector('#measure').textContent = innerWidth <= 600
      ? '当前为手机单栏，双栏参数暂不生效。'
      : `当前标题 ${parseFloat(columns[0]).toFixed(1)}px · 内容 ${parseFloat(columns[1]).toFixed(1)}px · 间距 ${actualGap.toFixed(1)}px`;
    if (!adjusted) gap.value = actualGap;
    root.querySelector('#ratio-value').textContent = adjusted ? `标题 ${Number(ratio.value).toFixed(1)}% : 内容 ${(100 - Number(ratio.value)).toFixed(1)}%` : '标题 33.3% : 内容 66.7%（1 : 2）';
    root.querySelector('#gap-value').textContent = adjusted ? `${gap.value}px` : `${actualGap.toFixed(1)}px · 原响应式间距`;
  }
  function update() {
    adjusted = true;
    style.textContent = `@media(min-width:601px){.project-v2 .project-section{grid-template-columns:minmax(0,${ratio.value}fr) minmax(0,${100 - Number(ratio.value)}fr);column-gap:${gap.value}px;}}`;
    measure();
    window.ScrollTrigger?.refresh();
  }
  ratio.addEventListener('input', update);
  gap.addEventListener('input', update);
  root.querySelector('#reset').addEventListener('click', () => {
    adjusted = false;
    ratio.value = '33.3333';
    style.textContent = '';
    measure();
    window.ScrollTrigger?.refresh();
  });
  new ResizeObserver(measure).observe(section);
  measure();
})();
