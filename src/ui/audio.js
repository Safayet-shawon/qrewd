import gsap from 'gsap';
import { asset } from '../core/assets.js';

/**
 * Optional ambient music. Nothing is created or requested until the visitor
 * switches it on, and a missing file only produces a polite message.
 */
export function createAudio(path, { onChange, onError }) {
  let el = null;
  let on = false;
  let failed = false;
  const VOLUME = 0.32;

  function ensure() {
    if (el) return el;
    el = new Audio();
    el.loop = true;
    el.preload = 'none';
    el.volume = 0;
    el.src = asset(path);
    el.addEventListener('error', () => fail());
    return el;
  }

  function fail() {
    if (failed) return;
    failed = true;
    on = false;
    onChange?.(false);
    onError?.('No music file found yet. See the README to add a track.');
  }

  async function start() {
    if (!path) return fail();
    const a = ensure();
    on = true;
    onChange?.(true);
    try {
      await a.play();
      if (!on) return a.pause();
      gsap.to(a, { volume: VOLUME, duration: 2.2, ease: 'power1.inOut' });
    } catch {
      fail();
    }
  }

  function stop() {
    on = false;
    onChange?.(false);
    if (!el) return;
    gsap.to(el, { volume: 0, duration: 0.8, onComplete: () => !on && el.pause() });
  }

  const onVis = () => {
    if (!el) return;
    if (document.hidden) el.pause();
    else if (on) el.play().catch(() => {});
  };
  document.addEventListener('visibilitychange', onVis);

  return {
    get on() {
      return on;
    },
    toggle() {
      if (on) stop();
      else {
        failed = false;
        start();
      }
    },
    dispose() {
      document.removeEventListener('visibilitychange', onVis);
      if (el) {
        gsap.killTweensOf(el);
        el.pause();
        el.removeAttribute('src');
        el.load();
      }
    },
  };
}
