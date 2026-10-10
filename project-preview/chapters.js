/* Preview-only chapter names follow the visible H2, including unlocked sections. */
(() => {
  function syncChapterTitles() {
    document.querySelectorAll('[data-project-section]').forEach(section => {
      const heading = section.querySelector('h2');
      if (!heading) return;
      const copy = heading.cloneNode(true);
      copy.querySelectorAll('br').forEach(br => br.replaceWith(' '));
      const title = (heading.getAttribute('aria-label') || copy.textContent).replace(/\s+/g, ' ').trim();
      if (!title) return;
      section.dataset.projectSection = title;
      document.querySelectorAll('.project-toc a').forEach(link => {
        if (link.hash !== '#' + section.id) return;
        const label = link.querySelector('span:last-child');
        if (label) label.textContent = title;
      });
    });
  }
  syncChapterTitles();
  document.addEventListener('project-content-updated', syncChapterTitles);
})();
