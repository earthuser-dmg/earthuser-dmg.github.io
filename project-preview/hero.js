/* Subtle entry motion for the approved preview Hero. */
(() => {
  const hero = document.querySelector('.hero07');
  if (!hero || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    const easing = 'cubic-bezier(.22,1,.36,1)';
    hero.querySelector('.hero07-media').animate([
      { opacity: 0, transform: 'translateY(-20px)', filter: 'blur(8px)' },
      { opacity: 1, transform: 'translateY(0)', filter: 'blur(0)' }
    ], { duration: 320, easing });
    hero.querySelector('.hero07-heading').animate([
      { opacity: 0, transform: 'translateY(12px)', filter: 'blur(6px)' },
      { opacity: 1, transform: 'translateY(0)', filter: 'blur(0)' }
    ], { duration: 280, delay: 50, easing, fill: 'backwards' });
    observer.disconnect();
  }, { threshold: .15 });
  observer.observe(hero.querySelector('.hero07-copy'));
})();
