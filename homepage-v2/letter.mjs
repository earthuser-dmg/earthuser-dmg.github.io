import { Motion, defaults, scene } from './motion.mjs';
const host = document.querySelector('.desk-letter');
const art = host.querySelector('.letter-hover');
const idle = host.querySelector('.letter-default');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let config = defaults();
try { const saved = JSON.parse(localStorage.getItem('cat-mail-lab-v1')); if (saved?.curves && ['open','out','back','close'].every(k => saved[k] > 0 && Array.isArray(saved.curves[k]))) config = saved; } catch {}
const motion = new Motion(config);
let raf = 0, last = 0;
function draw() {
  art.innerHTML = scene(motion, '/homepage-v2/assets/envelope-cat/');
  const blend = Math.min(1, motion.flap / .18);
  const visible = motion.photo > 0 ? 1 : blend * blend * (3 - 2 * blend);
  art.style.opacity = visible;
  idle.style.opacity = 1 - visible;
}
function tick(now) {
  motion.step(Math.min(40, now - last), reduced.matches);
  last = now;
  draw();
  raf = motion.active ? requestAnimationFrame(tick) : 0;
  if (!motion.active && !motion.target && !reduced.matches) idle.querySelector('svg').unpauseAnimations();
}
function target(open) {
  idle.querySelector('svg').pauseAnimations();
  motion.setTarget(open);
  if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
}
host.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') target(true); });
host.addEventListener('pointerleave', () => target(false));
host.addEventListener('focus', () => target(true));
host.addEventListener('blur', () => target(false));
window.addEventListener('blur', () => target(false));
if (reduced.matches) idle.querySelector('svg').pauseAnimations();
draw();
