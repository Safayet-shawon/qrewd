import * as THREE from 'three';
import { canvasTexture, rng } from '../textures.js';

/*
 * Procedural fabric: each weave is drawn once to a canvas and reused.
 * Colours are multiplied over the base colour in the material, so these
 * textures only carry pattern and weave, not hue.
 */

/** Black shirt: a fine gingham-like check with a faint weave. */
export function shirtCheck() {
  return canvasTexture(256, 256, (c, w, h) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) {
      c.fillStyle = 'rgba(0,0,0,0.12)';
      c.fillRect(i * 32, 0, 6, h);
      c.fillRect(0, i * 32, w, 6);
    }
    const r = rng(9);
    for (let i = 0; i < 3000; i++) {
      c.fillStyle = `rgba(0,0,0,${r() * 0.06})`;
      c.fillRect(r() * w, r() * h, 1, 1);
    }
  }, { repeat: true, aniso: 4 });
}

/** Kurta: small paisley-like motifs in a grid, with a faint sheen. */
export function kurtaEmbroidery() {
  return canvasTexture(256, 256, (c, w, h) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(70,0,10,0.28)';
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        const cx = x * 64 + 32 + (y % 2) * 32;
        const cy = y * 64 + 32;
        c.beginPath();
        c.ellipse(cx, cy, 9, 14, 0.5, 0, Math.PI * 2);
        c.fill();
        c.beginPath();
        c.arc(cx + 22, cy - 10, 3, 0, Math.PI * 2);
        c.fill();
      }
    c.strokeStyle = 'rgba(255,255,255,0.35)';
    c.lineWidth = 1;
    for (let i = 0; i < 40; i++) {
      c.beginPath();
      c.moveTo(0, i * 6.4);
      c.lineTo(256, i * 6.4 + 3);
      c.stroke();
    }
  }, { repeat: true, aniso: 4 });
}

/** Trousers: a diagonal twill. */
export function twill() {
  return canvasTexture(128, 128, (c, w, h) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, w, h);
    for (let i = -h; i < w + h; i += 4) {
      c.strokeStyle = i % 8 === 0 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.05)';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(i, h);
      c.lineTo(i + h, 0);
      c.stroke();
    }
  }, { repeat: true, aniso: 4 });
}

/** Hijab chiffon: soft, faintly sheer weave. */
export function chiffon() {
  return canvasTexture(128, 128, (c, w, h) => {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, w, h);
    const r = rng(4);
    for (let i = 0; i < 1400; i++) {
      c.fillStyle = `rgba(0,0,0,${r() * 0.05})`;
      c.fillRect(r() * w, r() * h, 2, 1);
    }
  }, { repeat: true, aniso: 4 });
}

let cache = null;
/** Shared textures, built once. */
export function fabrics() {
  if (!cache) cache = { shirt: shirtCheck(), kurta: kurtaEmbroidery(), twill: twill(), chiffon: chiffon() };
  return cache;
}
