/* BMS preview: only ciphertext is published for the protected content. */
(() => {
  const page = document.body;
  if (!page.hasAttribute('data-project-access')) return;
  const config = JSON.parse(document.getElementById('project-access-config').textContent);
  const storageKey = 'project-access:bms';
  const gate = document.getElementById('project-access');
  const form = gate.querySelector('form');
  const input = form.querySelector('input');
  const submit = form.querySelector('[type="submit"]');
  const status = document.getElementById('access-status');
  const relock = document.querySelector('.access-relock-bar');
  const assetBase = new URL('./encrypted/', document.currentScript.src);
  const sheet = gate.closest('.access-sheet');
  const publicContext = document.getElementById('context');
  const chapterNav = document.querySelector('.project-chapter-nav');
  const readingControls = [chapterNav, document.querySelector('.project-back-to-top')].filter(Boolean);
  let layerFrame = 0;
  function measureLayers() {
    if (!sheet || page.dataset.projectAccess !== 'locked') return;
    // Keep the final viewport of the public context underneath the incoming paper sheet.
    page.style.setProperty('--access-context-top', Math.min(0, innerHeight - publicContext.offsetHeight) + 'px');

  }
  // The fixed control never participates in article layout.
  function updateChapterNav() {
    layerFrame = 0;
    const sections = [...document.querySelectorAll('[data-project-section]')];
    const first = sections[0];
    const last = sections[sections.length - 1];
    const hero = document.querySelector('.hero07');
    let visible = false;
    if (page.dataset.projectAccess === 'unlocked' && first && last) {
      const start = first.getBoundingClientRect().top + scrollY;
      const end = last.getBoundingClientRect().bottom + scrollY;
      const readingRange = Math.max(0, end - start - innerHeight);
      visible = (!hero || hero.getBoundingClientRect().bottom <= 0) &&
        scrollY >= start + readingRange * 0.15;
    }
    readingControls.forEach(control => {
      if (!visible && control.contains(document.activeElement)) document.activeElement.blur();
      control.inert = !visible;
      control.setAttribute('aria-hidden', String(!visible));
      control.classList.toggle('is-reading-visible', visible);
    });
  }
  function queueChapterNav() {
    if (!layerFrame) layerFrame = requestAnimationFrame(updateChapterNav);
  }
  addEventListener('scroll', queueChapterNav, { passive: true });
  addEventListener('resize', queueChapterNav);
  document.addEventListener('project-content-updated', queueChapterNav);
  addEventListener('pageshow', queueChapterNav);
  new ResizeObserver(queueChapterNav).observe(document.querySelector('.project-main'));
  updateChapterNav();
  const contextResize = new ResizeObserver(measureLayers);
  if (sheet) {
    page.classList.add('access-layers');
    contextResize.observe(publicContext);
    addEventListener('resize', measureLayers);
    document.fonts.ready.then(measureLayers);
    measureLayers();
  }
  function releaseLayers() {
    if (!sheet) return;
    contextResize.disconnect();
    removeEventListener('resize', measureLayers);
    page.classList.remove('access-layers');
    // The same recommendation nodes return to the end of the unlocked article.
    document.querySelector('[data-access-navigation-home]').before(document.getElementById('project-navigation-container'));
    sheet.hidden = true;
  }

  let busy = false, pendingHash = '', objectURLs = [];
  const decode = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));
  const encode = value => btoa(String.fromCharCode(...new Uint8Array(value)));
  function message(text, error = false) {
    status.textContent = text;
    status.dataset.error = String(error);
    input.setAttribute('aria-invalid', String(error));
  }
  function forget() { try { sessionStorage.removeItem(storageKey); } catch {} }
  function revoke() { objectURLs.forEach(url => URL.revokeObjectURL(url)); objectURLs = []; }
  async function fetchBytes(file) {
    try {
      const response = await fetch(new URL(file, assetBase), { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return await response.arrayBuffer();
    } catch { throw new Error('The case study could not be loaded. Please check your connection and try again.'); }
  }
  async function decrypt(key, file) {
    const bytes = new Uint8Array(await fetchBytes(file));
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, key, bytes.slice(12));
  }
  async function derive(password) {
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: decode(config.salt), iterations: config.iterations }, material, 256);
    // Older cached single-password pages can still use this script.
    if (!config.slots) return bits;
    const wrappingKey = await crypto.subtle.importKey('raw', bits, 'AES-GCM', false, ['decrypt']);
    new Uint8Array(bits).fill(0);
    for (const slot of config.slots) {
      const envelope = decode(slot);
      try {
        return await crypto.subtle.decrypt({
          name: 'AES-GCM', iv: envelope.slice(0, 12),
          additionalData: new TextEncoder().encode(config.version)
        }, wrappingKey, envelope.slice(12));
      } catch (error) {
        if (error.name !== 'OperationError') throw error;
      }
    }
    throw new Error('That access code is incorrect. Please try again.');
  }
  function makeFragment(html, urls) {
    const template = document.createElement('template');
    template.innerHTML = html;
    template.content.querySelectorAll('[src], [href]').forEach(node => {
      for (const attr of ['src', 'href']) {
        const value = node.getAttribute(attr);
        if (value?.startsWith('protected-asset:')) {
          const url = urls.get(value.slice('protected-asset:'.length));
          if (!url) throw new Error('A protected image is missing. Please reload and try again.');
          node.setAttribute(attr, url);
        }
      }
    });
    return template.content;
  }
  function focusTarget(hash) {
    const target = hash && document.getElementById(hash.slice(1));
    const destination = target || document.querySelector('[data-protected-context] h3');
    if (!destination) return;
    destination.tabIndex = -1;
    destination.scrollIntoView({ block: 'start', behavior: 'instant' });
    destination.focus({ preventScroll: true });
  }
  async function unlock(rawKey, restoring) {
    const key = await crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['decrypt']);
    let content;
    try {
      content = JSON.parse(new TextDecoder().decode(await decrypt(key, config.payload)));
    } catch (error) {
      if (error.name === 'OperationError') throw new Error(restoring ? 'Your saved access has expired. Please enter the access code again.' : 'That access code is incorrect. Please try again.');
      throw error;
    }
    message('Opening the full case study…');
    const urls = new Map();
    // Finish every worker before cleanup, so failed requests cannot leave late Blob URLs.
    let cursor = 0;
    const workers = Array.from({ length: Math.min(4, content.assets.length) }, async () => {
      while (cursor < content.assets.length) {
        const asset = content.assets[cursor++];
        let bytes;
        try { bytes = await decrypt(key, asset.file); }
        catch (error) {
          if (error.name === 'OperationError') throw new Error('A protected image could not be opened. Please reload and try again.');
          throw error;
        }
        const url = URL.createObjectURL(new Blob([bytes], { type: asset.mime }));
        objectURLs.push(url);
        urls.set(asset.id, url);
      }
    });
    const results = await Promise.allSettled(workers);
    const failure = results.find(result => result.status === 'rejected');
    if (failure) throw failure.reason;
    const context = makeFragment(content.context, urls);
    const chapters = makeFragment(content.chapters, urls);
    releaseLayers();
    document.querySelector('[data-protected-context]').replaceChildren(context);
    document.querySelector('[data-protected-chapters-anchor]').before(chapters);
    document.querySelector('.project-toc').innerHTML = content.toc;
    page.dataset.projectAccess = 'unlocked';
    gate.hidden = true;
    relock.hidden = false;
    input.value = '';
    input.type = 'password';
    try { sessionStorage.setItem(storageKey, JSON.stringify({ version: config.version, key: encode(rawKey) })); } catch {}
    document.dispatchEvent(new CustomEvent('project-content-updated'));
    const destinationHash = pendingHash;
    if (!restoring || destinationHash) requestAnimationFrame(() => focusTarget(destinationHash));
    pendingHash = '';
  }
  async function attempt(rawKey, restoring = false) {
    if (busy) return;
    busy = true;
    submit.disabled = true;
    input.disabled = true;
    form.setAttribute('aria-busy', 'true');
    message(restoring ? 'Restoring your access…' : 'Checking access code…');
    try {
      await unlock(rawKey || await derive(input.value), restoring);
    } catch (error) {
      forget();
      revoke();
      message(error.message || 'The case study could not be opened. Please reload and try again.', true);
    } finally {
      busy = false;
      submit.disabled = false;
      input.disabled = false;
      form.removeAttribute('aria-busy');
      if (!gate.hidden && !restoring) { input.focus({ preventScroll: true }); input.select(); }
    }
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!input.value) { message('Enter the access code to continue.', true); input.focus(); return; }
    attempt();
  });
  function routeLockedHash(hash, focus = true) {
    if (page.dataset.projectAccess !== 'locked' || !hash || document.getElementById(hash.slice(1))) return;
    pendingHash = hash;
    gate.scrollIntoView({ block: 'start', behavior: 'instant' });
    if (focus) input.focus({ preventScroll: true });
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || page.dataset.projectAccess !== 'locked' || document.getElementById(link.hash.slice(1))) return;
    event.preventDefault();
    history.replaceState(null, '', link.hash);
    routeLockedHash(link.hash);
  });
  addEventListener('hashchange', () => routeLockedHash(location.hash));
  relock.querySelector('button').addEventListener('click', () => {
    forget();
    revoke();
    history.replaceState(null, '', '#project-access');
    location.reload();
  });
  // A back/forward cache entry must not restore access after it was explicitly cleared.
  addEventListener('pageshow', event => {
    if (!event.persisted || page.dataset.projectAccess !== 'unlocked') return;
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
      if (saved?.version === config.version && saved.key) return;
    } catch {}
    location.reload();
  });
  if (!window.isSecureContext || !window.crypto?.subtle) {
    message('Unlocking requires a secure connection and a current browser.', true);
    submit.disabled = true;
    return;
  }
  routeLockedHash(location.hash, false);
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    if (saved?.version === config.version && saved.key) attempt(decode(saved.key), true);
    else if (saved) { forget(); message('The case study has been updated. Please enter the access code again.'); }
  } catch { forget(); }
})();
