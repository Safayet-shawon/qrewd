import * as THREE from 'three';
import { addColumn, addWallTrim } from '../architecture.js';
import { glowTexture } from '../textures.js';
import { createFrame } from '../frames.js';
import { asset } from '../../core/assets.js';

/** Room B — a long corridor with one framed photograph per memory. */
export function buildGallery(ctx, L) {
  const { batch: b, mats, content, lights } = ctx;
  const B = L.memories;
  const half = B.half;
  const len = Math.abs(B.z1 - B.z0);
  const zc = (B.z0 + B.z1) / 2;
  const cast = { cast: true };
  const noRecv = { receive: false };

  b.plane(half * 2, len, 0, 0, zc, mats.floor, { tile: 2 });
  b.plane(half * 2, len, 0, B.h, zc, mats.ceiling, { flip: true, tile: 4 });
  for (const s of [-1, 1]) {
    b.box(0.5, B.h, len, s * (half + 0.25), B.h / 2, zc, mats.plaster, cast);
    addWallTrim(b, mats, { x: s * half, z0: B.z0, z1: B.z1, h: B.h, side: -s });
    b.box(0.1, 0.05, len - 1, s * (half - 0.1), B.h - 0.38, zc, mats.cove, noRecv);
  }
  b.box(0.07, 0.01, len, 0, 0.006, zc, mats.roseGold, noRecv);
  // ceiling ribs
  for (let z = B.z0 - 2.9; z > B.z1 + 1; z -= 2.9) b.box(half * 2, 0.22, 0.26, 0, B.h - 0.11, z, mats.trim);

  const washTex = glowTexture(128, [[0, 'rgba(255,214,160,0.6)'], [0.6, 'rgba(255,214,160,0.16)'], [1, 'rgba(255,214,160,0)']]);
  const washMat = new THREE.MeshBasicMaterial({ map: washTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.3 });
  ctx.disposables.push(washTex, washMat);

  const sideZs = { '-1': [], 1: [] };
  content.memories.forEach((m, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const z = B.z0 - 3.4 - i * B.spacing;
    sideZs[side].push(z);
    const wallX = side * (half - 0.0);
    const item = createFrame(
      ctx,
      { kind: 'memory', index: i, title: m.title, date: m.date, image: m.image, url: asset(m.image), orientation: m.orientation || 'landscape' },
      { pos: [wallX, 1.72, z], rotY: side === -1 ? Math.PI / 2 : -Math.PI / 2 },
    );
    item.data = m;
    ctx.items.push(item);

    const wash = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.8), washMat);
    wash.position.set(side * (half - 0.012), 1.9, z);
    wash.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;
    ctx.root.add(wash);

    lights.addSlot({
      room: 'memories',
      pos: [side * (half - 1.5), B.h - 0.4, z + 0.6],
      target: [wallX, 1.6, z],
      intensity: 62,
      angle: 0.52,
      penumbra: 0.85,
      distance: 12,
    });
    // Floor-level fill so the corridor reads between pictures.
    if (i % 2 === 0) {
      lights.addSlot({ room: 'memories', pos: [0, B.h - 0.4, z - 1.4], target: [0, 0, z - 1.4], intensity: 40, angle: 0.9, penumbra: 1, distance: 10 });
    }
  });

  // pilasters between pictures on each wall
  for (const side of [-1, 1]) {
    const zs = sideZs[side];
    const marks = [];
    if (zs.length) {
      marks.push(zs[0] + B.spacing);
      for (let i = 0; i < zs.length; i++) marks.push(zs[i] - B.spacing);
    } else marks.push(zc);
    marks.forEach((z) => {
      if (z < B.z0 - 0.5 && z > B.z1 + 0.5) addColumn(b, mats, side * (half - 0.22), z, { h: B.h - 0.3, r: 0.17, seg: 14 });
    });
  }
}
