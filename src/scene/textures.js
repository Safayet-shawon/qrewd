import * as THREE from 'three';

export const SERIF = '"Cormorant Garamond", "Cormorant", Georgia, "Times New Roman", serif';
export const SANS = 'Jost, "Helvetica Neue", Arial, sans-serif';

/** Make sure the web fonts exist before they are drawn into canvases. */
export async function loadFonts() {
  if (!document.fonts?.load) return;
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('400 40px "Cormorant Garamond"'),
        document.fonts.load('italic 400 40px "Cormorant Garamond"'),
        document.fonts.load('500 40px "Cormorant Garamond"'),
        document.fonts.load('400 24px Jost'),
        document.fonts.load('500 24px Jost'),
      ]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch {
    /* fall back to system fonts */
  }
}

export function canvasTexture(w, h, draw, { srgb = true, repeat = false, aniso = 4 } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso;
  return t;
}

/** Deterministic pseudo-random so textures look the same on every load. */
export function rng(seed = 1) {
  let s = seed * 9301 + 49297;
  return () => (s = (s * 9301 + 49297) % 233280) / 233280;
}

export function wrapLines(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** Pale tiled stone: 2×2 slabs with grout and faint veining. */
export function floorTexture() {
  return canvasTexture(
    1024,
    1024,
    (ctx, w, h) => {
      const r = rng(7);
      ctx.fillStyle = '#d9cfbf';
      ctx.fillRect(0, 0, w, h);
      const n = 2;
      const s = w / n;
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          const v = 214 + Math.floor(r() * 14);
          ctx.fillStyle = `rgb(${v},${v - 8},${v - 20})`;
          ctx.fillRect(i * s, j * s, s, s);
          ctx.save();
          ctx.beginPath();
          ctx.rect(i * s, j * s, s, s);
          ctx.clip();
          for (let k = 0; k < 7; k++) {
            ctx.strokeStyle = `rgba(150,128,104,${0.04 + r() * 0.07})`;
            ctx.lineWidth = 0.6 + r() * 1.6;
            ctx.beginPath();
            let x = i * s + r() * s;
            let y = j * s;
            ctx.moveTo(x, y);
            for (let t = 0; t < 6; t++) {
              x += (r() - 0.5) * 120;
              y += s / 6;
              ctx.lineTo(x, y);
            }
            ctx.stroke();
          }
          ctx.restore();
        }
      ctx.strokeStyle = 'rgba(112,94,76,0.55)';
      ctx.lineWidth = 3;
      for (let i = 0; i <= n; i++) {
        ctx.beginPath();
        ctx.moveTo(i * s, 0);
        ctx.lineTo(i * s, h);
        ctx.moveTo(0, i * s);
        ctx.lineTo(w, i * s);
        ctx.stroke();
      }
    },
    { repeat: true, aniso: 8 },
  );
}

/** Subtle plaster grain, used as a bump map. */
export function plasterBump() {
  return canvasTexture(
    256,
    256,
    (ctx, w, h) => {
      const r = rng(3);
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 5200; i++) {
        const v = 100 + Math.floor(r() * 56);
        ctx.fillStyle = `rgba(${v},${v},${v},0.5)`;
        const s = 1 + r() * 4;
        ctx.fillRect(r() * w, r() * h, s, s);
      }
    },
    { srgb: false, repeat: true },
  );
}

export function glowTexture(size = 128, stops = [[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']]) {
  return canvasTexture(size, size, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

/** Thin ring used as the gentle "you can touch this" marker. */
export function ringTexture() {
  return canvasTexture(128, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,236,204,0.0)');
    g.addColorStop(0.55, 'rgba(255,236,204,0.0)');
    g.addColorStop(0.7, 'rgba(255,236,204,0.28)');
    g.addColorStop(1, 'rgba(255,236,204,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,240,215,0.95)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w * 0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,240,215,0.9)';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w * 0.05, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** Dusk backdrop for the opening. Muted slate to warm horizon, a few faint stars. */
export function skyTexture() {
  return canvasTexture(16, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1d222b');
    g.addColorStop(0.45, '#3a3b40');
    g.addColorStop(0.72, '#6d5c52');
    g.addColorStop(0.9, '#b69477');
    g.addColorStop(1, '#d6b896');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

/** A vertical alpha ramp used by the soft light-cone meshes. */
export function coneTexture() {
  return canvasTexture(8, 128, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,226,180,0.0)');
    g.addColorStop(0.15, 'rgba(255,226,180,0.55)');
    g.addColorStop(1, 'rgba(255,226,180,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

/**
 * Abstract artwork shown when a photograph is missing or has not loaded —
 * an intentional "frame waiting for its picture", never a broken image.
 */
export function placeholderArt(label, w = 640, h = 640, seed = 1) {
  return canvasTexture(w, h, (ctx) => {
    const r = rng(seed);
    const g = ctx.createLinearGradient(0, 0, w * 0.3, h);
    g.addColorStop(0, '#ece0cf');
    g.addColorStop(1, '#cdb49a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const rg = ctx.createRadialGradient(w * 0.3, h * 0.3, 0, w * 0.3, h * 0.3, Math.max(w, h) * 0.6);
    rg.addColorStop(0, 'rgba(255,248,232,0.9)');
    rg.addColorStop(1, 'rgba(255,248,232,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(122,92,76,0.35)';
    ctx.lineWidth = Math.max(2, w / 260);
    const cx = w / 2;
    const cy = h * 0.46;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, Math.min(w, h) * (0.1 + i * 0.07), Math.PI, 0);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx - Math.min(w, h) * 0.31, cy);
    ctx.lineTo(cx + Math.min(w, h) * 0.31, cy);
    ctx.stroke();
    for (let i = 0; i < 1400; i++) {
      ctx.fillStyle = `rgba(90,60,50,${r() * 0.035})`;
      ctx.fillRect(r() * w, r() * h, 2, 2);
    }
    ctx.fillStyle = 'rgba(86,62,52,0.78)';
    ctx.textAlign = 'center';
    ctx.font = `italic 400 ${Math.round(Math.min(w, h) * 0.058)}px ${SERIF}`;
    ctx.fillText(label || 'Add a photograph', cx, h * 0.74);
    ctx.font = `500 ${Math.round(Math.min(w, h) * 0.028)}px ${SANS}`;
    ctx.fillStyle = 'rgba(86,62,52,0.55)';
    ctx.fillText('A PHOTOGRAPH WILL LIVE HERE', cx, h * 0.8);
  });
}

/** Engraved-style label for under a frame or milestone. */
export function labelTexture(title, date, { w = 640, h = 200, dark = false } = {}) {
  return canvasTexture(w, h, (ctx) => {
    ctx.fillStyle = dark ? '#2c241f' : '#f1e9db';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = dark ? 'rgba(201,178,139,0.7)' : 'rgba(150,120,92,0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.textAlign = 'center';
    ctx.fillStyle = dark ? '#f2e8d6' : '#3a2e27';
    let size = 54;
    ctx.font = `500 ${size}px ${SERIF}`;
    while (ctx.measureText(title).width > w - 70 && size > 26) {
      size -= 2;
      ctx.font = `500 ${size}px ${SERIF}`;
    }
    ctx.fillText(title, w / 2, h * 0.5);
    ctx.fillStyle = dark ? 'rgba(232,210,176,0.85)' : 'rgba(110,84,66,0.9)';
    ctx.font = `400 ${Math.round(h * 0.13)}px ${SANS}`;
    ctx.letterSpacing = '4px';
    ctx.fillText(String(date).toUpperCase(), w / 2, h * 0.77);
  });
}
