(() => {
    if (!document.querySelector('.page-title')) return;
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:10001;max-width:calc(100vw - 40px)';
    const root = host.attachShadow({mode: 'open'});
    root.innerHTML = `
        <style>
            :host { font:14px/1.5 system-ui,sans-serif; color:#1e1e1e; }
            section { box-sizing:border-box; width:300px; max-width:calc(100vw - 40px); padding:18px; background:#fff; border:1px solid #1e1e1e; box-shadow:0 4px 20px #0002; }
            header { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
            h2 { font:600 16px/1.4 system-ui,sans-serif; margin:0; }
            button { font:inherit; cursor:pointer; background:#fff; border:1px solid #aaa; padding:4px 10px; }
            input { display:block; width:100%; margin:14px 0; accent-color:#1e1e1e; }
            output { display:block; font-variant-numeric:tabular-nums; font-weight:600; }
            p { color:#666; margin:10px 0 14px; font-size:12px; }
        </style>
        <section aria-label="页面标题字号预览">
            <header><h2>页面标题 · 字号预览</h2><button type="button" id="close" aria-label="关闭预览面板">×</button></header>
            <label for="size">桌面字号</label>
            <input id="size" type="range" min="3" max="5.5" step="0.01" value="4.5">
            <output for="size" aria-live="polite"></output>
            <p>只预览 ≥963px 的标题，不会保存到网站。手机和平板保持原样。</p>
            <button type="button" id="reset">恢复 4.5</button>
        </section>`;
    const preview = document.createElement('style');
    const slider = root.querySelector('input');
    const output = root.querySelector('output');
    function update() {
        const size = Number(slider.value);
        const cap = (64 * size / 5.263).toFixed(2);
        preview.textContent = `@media (min-width:963px) {
            body.homepage-v2 { --page-title-size:${size}cqw; }
            body.subpage { --page-title-size:calc((100vw - 140px) * ${size / 100}); }
            body.subpage:not(.project-page) { --page-title-size:clamp(32px, calc((100vw - 140px) * ${size / 100}), ${cap}px); }
        }`;
        requestAnimationFrame(() => {
            const px = parseFloat(getComputedStyle(document.querySelector('.page-title')).fontSize).toFixed(1);
            output.textContent = `${size.toFixed(2)} · 当前标题 ${px}px${innerWidth < 963 ? '（非桌面，未调整）' : ''}`;
        });
    }
    slider.addEventListener('input', update);
    root.querySelector('#reset').addEventListener('click', () => { slider.value = '4.5'; update(); });
    root.querySelector('#close').addEventListener('click', () => {
        window.removeEventListener('resize', update);
        preview.remove();
        host.remove();
    });
    window.addEventListener('resize', update);
    document.head.appendChild(preview);
    document.body.appendChild(host);
    update();
})();
