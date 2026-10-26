const mql = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

/** Live check: honours the OS setting at the moment it is read. */
export const reducedMotion = () => !!(mql && mql.matches) || new URLSearchParams(location.search).has('reduced');

export const isCoarsePointer = () =>
  !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}

/**
 * Pick a rendering budget. `?lite=1` / `?full=1` override the heuristic.
 * The lightweight mode trims lights, shadows, particles and pixel ratio.
 */
export function detectQuality() {
  const params = new URLSearchParams(location.search);
  const coarse = isCoarsePointer();
  const mem = navigator.deviceMemory || 8;
  const cores = navigator.hardwareConcurrency || 8;
  let lite = (coarse && (mem <= 4 || cores <= 6)) || mem <= 2 || cores <= 2;
  if (params.has('lite')) lite = true;
  if (params.has('full')) lite = false;
  const dpr = window.devicePixelRatio || 1;
  return {
    lite,
    antialias: !lite,
    maxDpr: lite ? 1.25 : 2,
    dpr: Math.min(dpr, lite ? 1.25 : 2),
    shadows: !lite,
    lights: lite ? 4 : 6,
    dust: lite ? 110 : 260,
    embers: lite ? 40 : 90,
  };
}
