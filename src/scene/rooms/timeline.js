import * as THREE from 'three';
import { matrix, addColumn, addWallTrim } from '../architecture.js';
import { glowTexture } from '../textures.js';
import { createFrame } from '../frames.js';
import { asset } from '../../core/assets.js';

/**
 * Room D — one installation per milestone: a marble plinth carrying a small
 * rose-gold armillary, and a framed moment on the wall behind it. A thin
 * rose-gold line runs the length of the floor and ties them together.
 */
export function buildTimeline(ctx, L) {
  const { batch: b, mats, content, lights } = ctx;
  const D = L.timeline;
  const half = D.half;
  const len = Math.abs(D.z1 - D.z0);
  const zc = (D.z0 + D.z1) / 2;
  const cast = { cast: true };
  const noRecv = { receive: false };

  b.plane(half * 2, len, 0, 0, zc, mats.floor, { tile: 2 });
  b.plane(half * 2, len, 0, D.h, zc, mats.ceiling, { flip: true, tile: 4 });
  for (const s of [-1, 1]) {
    b.box(0.5, D.h, len, s * (half + 0.25), D.h / 2, zc, mats.plaster, cast);
    addWallTrim(b, mats, { x: s * half, z0: D.z0, z1: D.z1, h: D.h, side: -s });
    b.box(0.1, 0.05, len - 1, s * (half - 0.1), D.h - 0.38, zc, mats.cove, noRecv);
  }
  // timeline spine on the floor
  b.box(0.1, 0.012, len, 0, 0.007, zc, mats.roseGold, noRecv);

  const washTex = glowTexture(128, [[0, 'rgba(255,214,160,0.55)'], [0.6, 'rgba(255,214,160,0.14)'], [1, 'rgba(255,214,160,0)']]);
  const washMat = new THREE.MeshBasicMaterial({ map: washTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.3 });
  ctx.disposables.push(washTex, washMat);

  const rings = [];
  const ringGeo = new THREE.TorusGeometry(1, 0.025, 8, 48);
  const sphereGeo = new THREE.SphereGeometry(0.075, 20, 14);
  ctx.disposables.push(ringGeo, sphereGeo);
  const coreMat = new THREE.MeshStandardMaterial({ color: 0xe8d4b0, roughness: 0.25, metalness: 0.8, emissive: 0xffb27a, emissiveIntensity: 0.3 });
  ctx.disposables.push(coreMat);

  const sideZs = { '-1': [], 1: [] };
  content.timeline.forEach((m, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const z = D.z0 - 3.6 - i * D.spacing;
    sideZs[side].push(z);

    // node on the spine
    b.cyl(0.26, 0.26, 0.014, 32, 0, 0.009, z, mats.roseGold, noRecv);
    b.cyl(0.19, 0.19, 0.018, 32, 0, 0.011, z, mats.marble, noRecv);
    // connector from the spine to the plinth
    b.box(Math.abs(side * 2.3), 0.01, 0.05, (side * 2.3) / 2, 0.006, z, mats.champagne, noRecv);

    // plinth + armillary
    const px = side * 2.3;
    b.cyl(0.34, 0.4, 0.14, 36, px, 0.07, z, mats.marble, cast);
    b.cyl(0.26, 0.3, 0.86, 36, px, 0.57, z, mats.marble, cast);
    b.cyl(0.33, 0.28, 0.07, 36, px, 1.04, z, mats.champagne, cast);

    const sculpt = new THREE.Group();
    sculpt.position.set(px, 1.5, z);
    const core = new THREE.Mesh(sphereGeo, coreMat);
    sculpt.add(core);
    [0.2, 0.28, 0.36].forEach((r, k) => {
      const ring = new THREE.Mesh(ringGeo, k === 1 ? mats.champagne : mats.roseGold);
      ring.scale.setScalar(r);
      ring.rotation.set(k * 1.0, k * 0.6, k * 0.35);
      ring.castShadow = true;
      ring.userData.spin = [0.28 + k * 0.1, 0.18 - k * 0.07, 0.12];
      sculpt.add(ring);
      rings.push(ring);
    });
    ctx.root.add(sculpt);

    // framed moment on the wall
    const wallX = side * half;
    const item = createFrame(
      ctx,
      { kind: 'milestone', index: i, title: m.title, date: m.date, image: m.image, url: asset(m.image), orientation: 'landscape', scale: 1.1 },
      { pos: [wallX, 1.7, z], rotY: side === -1 ? Math.PI / 2 : -Math.PI / 2 },
    );
    item.data = m;
    item.pedestal = new THREE.Vector3(px, 1.5, z);
    // the plinth sculpture is a second way to open the same milestone
    const hitP = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 8), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    hitP.position.set(px, 1.2, z);
    hitP.userData.item = item;
    ctx.root.add(hitP);
    item.meshes.push(hitP);
    ctx.disposables.push(hitP.geometry, hitP.material);
    ctx.items.push(item);

    const wash = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), washMat);
    wash.position.set(side * (half - 0.012), 1.9, z);
    wash.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;
    ctx.root.add(wash);

    lights.addSlot({ room: 'timeline', pos: [px * 0.3, D.h - 0.4, z + 0.4], target: [px, 1.3, z], intensity: 130, angle: 0.45, penumbra: 0.85, distance: 12, color: 0xffe2bc });
    lights.addSlot({ room: 'timeline', pos: [side * (half - 1.4), D.h - 0.4, z + 0.6], target: [wallX, 1.6, z], intensity: 60, angle: 0.5, penumbra: 0.85, distance: 12 });
  });

  for (const side of [-1, 1]) {
    const zs = sideZs[side];
    const marks = [];
    if (zs.length) {
      marks.push(zs[0] + D.spacing);
      for (const z of zs) marks.push(z - D.spacing);
    }
    marks.forEach((z) => {
      if (z < D.z0 - 0.5 && z > D.z1 + 0.5) addColumn(b, mats, side * (half - 0.22), z, { h: D.h - 0.3, r: 0.17, seg: 14 });
    });
  }

  ctx.updaters.push((dt) => {
    if (ctx.reduced()) return;
    for (const r of rings) {
      r.rotation.x += r.userData.spin[0] * dt;
      r.rotation.y += r.userData.spin[1] * dt;
      r.rotation.z += r.userData.spin[2] * dt;
    }
  });
}
