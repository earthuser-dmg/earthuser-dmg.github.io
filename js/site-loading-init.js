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
  document.body.insertAdjacentHTML('afterbegin', '  <div id="opening-loader" role="progressbar" aria-label="Loading website" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">\n    <svg id="opening-panels" viewBox="0 0 1280 832" aria-hidden="true">\n      <g id="opening-upper" transform="translate(0 40)">\n        <rect x="0" y="-10000" width="1280" height="10001" fill="white"/>\n        <image href="/homepage-v2/assets/loading-split/12019-491.svg" width="1280" height="415"/>\n      </g>\n      <g id="opening-lower" transform="translate(0 -40)">\n        <image href="/homepage-v2/assets/loading-split/12014-590.svg" y="410" width="1280" height="422"/>\n        <rect x="0" y="831" width="1280" height="10000" fill="white"/>\n      </g>\n      <rect id="opening-paper" y="-10000" width="1280" height="20000" fill="white"/>\n      <defs><clipPath id="opening-clip"><rect id="opening-progress-width" y="-10000" width="0" height="20000"/></clipPath></defs>\n      <image id="opening-line" href="/homepage-v2/assets/loading-split/12019-496.svg" y="370.5" width="1280" height="85" clip-path="url(#opening-clip)"/>\n    </svg>\n    <svg id="opening-badge" viewBox="0 0 110 110" aria-hidden="true">\n      <defs><path id="opening-percent-arc" d="M 0 55 A 55 55 0 0 1 110 55"/></defs>\n      <image href="/homepage-v2/assets/loading-split/12014-532.svg" x="19.68" y="19.68" width="71" height="71"/>\n      <text fill="black" font-family="Manrope,sans-serif" font-size="18" font-weight="700" text-anchor="middle"><textPath href="#opening-percent-arc" startOffset="50%" dominant-baseline="central" id="opening-percent">0%</textPath></text>\n    </svg>\n  </div>');
}, {once:true});
