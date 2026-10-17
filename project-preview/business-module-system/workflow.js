/* Content lives in the encrypted article; this controller contains no case-study data. */
(() => {
  function init() {
    document.querySelectorAll('[data-workflow]').forEach(root => {
      if (root.dataset.ready) return;
      root.dataset.ready = 'true';
      const tabs = [...root.querySelectorAll('[data-workflow-tab]')];
      const panels = [...root.querySelectorAll('[data-workflow-panel]')];
      tabs.forEach(tab => tab.setAttribute('aria-label', [...tab.querySelectorAll('.wf-number, .wf-standard, .wf-action')].map(part => part.textContent.trim()).join(' · ')));
      let current = 0;
      function select(index, focus = false) {
        current = (index + tabs.length) % tabs.length;
        tabs.forEach((tab, i) => {
          tab.setAttribute('aria-selected', String(i === current));
          tab.tabIndex = i === current ? 0 : -1;
          panels[i].hidden = i !== current;
        });
        root.querySelector('[data-workflow-count]').textContent = `${current + 1} / ${tabs.length}`;
        if (focus) tabs[current].focus({ preventScroll: true });

      }
      tabs.forEach((tab, i) => {
        tab.addEventListener('click', () => select(i));
        tab.addEventListener('keydown', event => {
          const index = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: tabs.length - 1 }[event.key];
          if (index === undefined) return;
          event.preventDefault();
          select(index, true);
        });
      });
      root.querySelector('[data-workflow-prev]').addEventListener('click', () => select(current - 1));
      root.querySelector('[data-workflow-next]').addEventListener('click', () => select(current + 1));
      root.querySelector('[data-workflow-controls]').hidden = false;
      select(0);
    });
  }
  document.addEventListener('project-content-updated', init);
  init();
})();
