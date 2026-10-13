(() => {
      let resolve;
      const gate = window.siteLoading = {done:false, ready:new Promise(r => { resolve = r; })};
      window.homepageLoading = gate;
      gate.reveal = () => { resolve(); };
      gate.finish = () => {
        if (gate.done) return;
        gate.done = true;
        clearTimeout(gate.timeout);
        document.documentElement.classList.remove('opening-loading');
        document.querySelector('#opening-loader')?.remove();
        document.querySelectorAll('[data-opening-inert]').forEach(el => { el.inert = false; el.removeAttribute('data-opening-inert'); });
        resolve();
        window.dispatchEvent(new Event("site-loading-finished"));
      };
      // Claim the entry experience before loading so navigating away mid-animation
      // cannot replay it on another page in the same tab session.
      try {
        const sessionKey = 'site-entry-seen';
        if (sessionStorage.getItem(sessionKey)) {
          gate.finish();
          return;
        }
        sessionStorage.setItem(sessionKey, '1');
      } catch {
        // If session storage is unavailable, keep navigation free of repeat loaders.
        gate.finish();
        return;
      }
      document.documentElement.classList.add('opening-loading');
      gate.timeout = setTimeout(gate.finish, 15000);
    })();
document.addEventListener('DOMContentLoaded', () => {
  if (window.siteLoading.done) return;
  document.body.insertAdjacentHTML('afterbegin', '<div id="opening-loader" role="progressbar" aria-label="Loading website" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"></div>');
}, {once:true});
