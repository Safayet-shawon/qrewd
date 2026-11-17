import * as THREE from 'three';
import { addColumn, addWallTrim } from '../architecture.js';
import { glowTexture } from '../textures.js';
import { createFrame } from '../frames.js';
import { asset } from '../../core/assets.js';

/** A video only plays while the visitor is near it, so the room stays light. */
const PLAY_RANGE = 6.5;

/**
 * Room: "Moments in Motion". Each frame holds a short clip that loops, muted.
 * The clips play only when the visitor is close, and pause when they walk away.
 */
export function buildVideos(ctx, L) {
  const { batch: b, mats, content, lights } = ctx;
  const V = L.videos;
  const half = V.half;
  const len = Math.abs(V.z1 - V.z0);
  const zc = (V.z0 + V.z1) / 2;
  const cast = { cast: true };
  const noRecv = { receive: false };

  b.plane(half * 2, len, 0, 0, zc, mats.floor, { tile: 2 });
  b.plane(half * 2, len, 0, V.h, zc, mats.ceiling, { flip: true, tile: 4 });
  for (const s of [-1, 1]) {
    b.box(0.5, V.h, len, s * (half + 0.25), V.h / 2, zc, mats.plaster, cast);
    addWallTrim(b, mats, { x: s * half, z0: V.z0, z1: V.z1, h: V.h, side: -s });
    b.box(0.1, 0.05, len - 1, s * (half - 0.1), V.h - 0.38, zc, mats.cove, noRecv);
  }
  b.box(0.07, 0.01, len, 0, 0.006, zc, mats.roseGold, noRecv);

  const sideZs = { '-1': [], 1: [] };
  content.videos.forEach((m, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const z = V.z0 - 3.4 - i * V.spacing;
    sideZs[side].push(z);
    const wallX = side * half;
    const item = createFrame(
      ctx,
      { kind: 'video', index: i, title: m.title, date: '', image: null, url: null, orientation: 'portrait' },
      { pos: [wallX, 1.72, z], rotY: side === -1 ? Math.PI / 2 : -Math.PI / 2 },
    );
    item.data = m;
    ctx.items.push(item);

    const el = document.createElement('video');
    el.src = asset(m.video);
    el.muted = true;
    el.loop = true;
    el.playsInline = true;
    el.preload = 'metadata';
    const tex = new THREE.VideoTexture(el);
    tex.colorSpace = THREE.SRGBColorSpace;
    el.addEventListener('loadedmetadata', () => {
      if (el.videoWidth && el.videoHeight) item.applyTexture(tex, el.videoWidth / el.videoHeight);
    });
    el.addEventListener('error', () => {
      // a missing clip leaves the frame with its label, never a broken picture
      el.removeAttribute('src');
    });
    item.clip = { el, tex, playing: false };
    ctx.disposables.push(tex, {
      dispose() {
        el.pause();
        el.removeAttribute('src');
        el.load();
      },
    });

    lights.addSlot({
      room: 'videos',
      pos: [side * (half - 1.5), V.h - 0.4, z + 0.6],
      target: [wallX, 1.6, z],
      intensity: 60,
      angle: 0.52,
      penumbra: 0.85,
      distance: 12,
    });
  });

  for (const side of [-1, 1]) {
    const zs = sideZs[side];
    const marks = [];
    if (zs.length) {
      marks.push(zs[0] + V.spacing);
      for (const z of zs) marks.push(z - V.spacing);
    }
    marks.forEach((z) => {
      if (z < V.z0 - 0.5 && z > V.z1 + 0.5) addColumn(b, mats, side * (half - 0.22), z, { h: V.h - 0.3, r: 0.17, seg: 14 });
    });
  }

  // start or pause each clip by how close the visitor is
  const clips = () => ctx.items.filter((i) => i.kind === 'video' && i.clip);
  ctx.updaters.push(() => {
    const p = ctx.player?.();
    if (!p) return;
    for (const item of clips()) {
      const c = item.focus.center;
      const near = Math.hypot(c.x - p.x, c.z - p.z) < PLAY_RANGE;
      const k = item.clip;
      if (near && !k.playing) {
        k.playing = true;
        k.el.play().catch(() => {
          k.playing = false;
        });
      } else if (!near && k.playing) {
        k.playing = false;
        k.el.pause();
      }
    }
  });
}
