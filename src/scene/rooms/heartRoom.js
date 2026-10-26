import * as THREE from 'three';
import gsap from 'gsap';
import { matrix, archRingGeometry, archPanelGeometry, addColumn, addWallTrim } from '../architecture.js';
import { glowTexture, coneTexture, ringTexture } from '../textures.js';

function heartPoints(n = 120) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    pts.push(new THREE.Vector2(x / 17, (y + 2.4) / 17));
  }
  return pts;
}

/** Room C — the heart sculpture on a dais, with a rotating rose-gold armature. */
export function buildHeartRoom(ctx, L) {
  const { batch: b, mats, lights, q } = ctx;
  const C = L.heart;
  const half = C.half;
  const len = Math.abs(C.z1 - C.z0);
  const zc = C.zc;
  const cast = { cast: true };
  const noRecv = { receive: false };

  b.plane(half * 2, len, 0, 0, zc, mats.floor, { tile: 2 });
  b.plane(half * 2, len, 0, C.h, zc, mats.ceiling, { flip: true, tile: 4 });
  for (const s of [-1, 1]) {
    b.box(0.5, C.h, len, s * (half + 0.25), C.h / 2, zc, mats.plaster, cast);
    addWallTrim(b, mats, { x: s * half, z0: C.z0, z1: C.z1, h: C.h, side: -s });
    // tall blind arches
    for (const dz of [-4.2, 4.2]) {
      b.add(archRingGeometry({ innerHalf: 1.6, spring: 4.2, border: 0.2, depth: 0.07 }), mats.trim, matrix(s * half, 0.3, zc + dz, 0, (-s * Math.PI) / 2, 0));
      b.add(archPanelGeometry({ half: 1.6, spring: 4.2, depth: 0.01 }), mats.stone, matrix(s * (half - 0.01), 0.3, zc + dz, 0, (-s * Math.PI) / 2, 0));
    }
  }
  // end-wall cornices (the partitions are built by museum.js)
  b.box(half * 2, 0.22, 0.2, 0, C.h - 0.11, C.z0 - 0.35, mats.trim);
  b.box(half * 2, 0.22, 0.2, 0, C.h - 0.11, C.z1 + 0.35, mats.trim);

  // ceiling cove ring + oculus glow
  b.add(new THREE.TorusGeometry(5.6, 0.07, 8, 72), mats.cove, matrix(0, C.h - 0.2, zc, Math.PI / 2), noRecv);
  b.add(new THREE.TorusGeometry(5.8, 0.18, 8, 72), mats.trim, matrix(0, C.h - 0.1, zc, Math.PI / 2), noRecv);
  b.add(new THREE.CircleGeometry(2.6, 48), mats.cove, matrix(0, C.h - 0.01, zc, Math.PI / 2), noRecv);

  // floor inlays
  b.box(0.07, 0.01, len, 0, 0.006, zc, mats.roseGold, noRecv);
  for (const [r0, r1, m] of [[2.55, 2.62, mats.roseGold], [4.2, 4.24, mats.champagne], [6.2, 6.24, mats.champagne]]) {
    b.add(new THREE.RingGeometry(r0, r1, 96), m, matrix(0, 0.009, zc, -Math.PI / 2), noRecv);
  }
  // ring of columns (kept off the door axis)
  const nCol = 8;
  for (let i = 0; i < nCol; i++) {
    const a = (i / nCol) * Math.PI * 2 + Math.PI / nCol;
    addColumn(b, mats, Math.sin(a) * 7, zc + Math.cos(a) * 7, { h: C.h - 0.3, r: 0.36 });
  }

  // dais + pedestal
  b.cyl(2.4, 2.5, 0.2, 64, 0, 0.1, zc, mats.marble, cast);
  b.cyl(2.1, 2.15, 0.08, 64, 0, 0.24, zc, mats.champagne, cast);
  b.cyl(0.52, 0.62, 1.05, 40, 0, 0.77, zc, mats.marble, cast);
  b.cyl(0.66, 0.58, 0.1, 40, 0, 1.33, zc, mats.champagne, cast);
  b.cyl(0.7, 0.7, 0.06, 40, 0, 1.4, zc, mats.roseGold, cast);

  // ── the sculpture ──
  const sculpture = new THREE.Group();
  sculpture.position.set(0, 2.55, zc);
  ctx.root.add(sculpture);

  const outline = heartPoints(140);
  const coreShape = new THREE.Shape(outline);
  const coreGeo = new THREE.ExtrudeGeometry(coreShape, {
    depth: 0.34,
    bevelEnabled: true,
    bevelThickness: 0.2,
    bevelSize: 0.12,
    bevelSegments: q.lite ? 3 : 6,
    curveSegments: 1,
  });
  coreGeo.center();
  coreGeo.scale(0.78, 0.78, 0.78);
  const coreMat = new THREE.MeshPhysicalMaterial({
    color: 0xc88a7c,
    roughness: 0.3,
    metalness: 0.15,
    clearcoat: 1,
    clearcoatRoughness: 0.18,
    emissive: 0xff9a78,
    emissiveIntensity: 0.34,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.castShadow = true;
  sculpture.add(core);

  // concentric, slowly turning outline frames
  const ringGeos = [];
  const rings = [];
  const ringCount = q.lite ? 3 : 4;
  for (let i = 0; i < ringCount; i++) {
    const k = 1.28 + i * 0.2;
    const outer = new THREE.Shape(heartPoints(120).map((p) => p.clone().multiplyScalar(k * 0.78)));
    const inner = new THREE.Path(heartPoints(120).map((p) => p.clone().multiplyScalar((k - 0.045) * 0.78)).reverse());
    outer.holes.push(inner);
    const g = new THREE.ExtrudeGeometry(outer, { depth: 0.045, bevelEnabled: false, curveSegments: 1 });
    g.center();
    ringGeos.push(g);
    const m = new THREE.Mesh(g, i % 2 ? mats.champagne : mats.roseGold);
    m.castShadow = true;
    const holder = new THREE.Group();
    holder.add(m);
    holder.rotation.y = (i * Math.PI) / ringCount;
    holder.userData.speed = (i % 2 ? -1 : 1) * (0.13 - i * 0.018);
    sculpture.add(holder);
    rings.push(holder);
  }
  ctx.disposables.push(coreGeo, coreMat, ...ringGeos);

  // soft inner glow
  const glowMat = new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffb48a, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending });
  const glow = new THREE.Sprite(glowMat);
  glow.scale.set(4.4, 4.4, 1);
  glow.position.z = -0.35;
  sculpture.add(glow);

  // light cone from above (very subtle)
  const coneMat = new THREE.MeshBasicMaterial({ map: coneTexture(), transparent: true, opacity: 0.06, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 2.3, C.h - 1.4, 40, 1, true), coneMat);
  cone.position.set(0, (C.h - 1.4) / 2 + 1.4, zc);
  ctx.root.add(cone);
  ctx.disposables.push(cone.geometry, coneMat, coneMat.map, glowMat, glowMat.map);

  // touch marker
  const hotMat = new THREE.SpriteMaterial({ map: ringTexture(), transparent: true, opacity: 0.65, depthWrite: false, blending: THREE.AdditiveBlending });
  const hot = new THREE.Sprite(hotMat);
  hot.position.set(0, 1.6, zc + 0.9);
  hot.scale.set(0.34, 0.34, 1);
  ctx.root.add(hot);
  ctx.disposables.push(hotMat, hotMat.map);

  // hit sphere
  const hit = new THREE.Mesh(new THREE.SphereGeometry(1.25, 14, 10), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hit.position.copy(sculpture.position);
  ctx.root.add(hit);
  const item = {
    id: 'heart',
    kind: 'heart',
    index: 0,
    meshes: [hit],
    focus: { center: sculpture.position.clone(), normal: new THREE.Vector3(0, 0.08, 1).normalize(), w: 3.4, h: 3.2 },
    hover: 0,
    hoverTarget: 0,
    setHover(on) {
      this.hoverTarget = on ? 1 : 0;
    },
  };
  hit.userData.item = item;
  ctx.items.push(item);
  ctx.disposables.push(hit.geometry, hit.material);

  let pulse = 0;
  const base = 0.34;
  ctx.updaters.push((dt, t) => {
    const calm = ctx.reduced();
    if (!calm) rings.forEach((r) => (r.rotation.y += r.userData.speed * dt));
    const beat = calm ? 0 : Math.sin(t * 1.5) * 0.5 + 0.5;
    item.hover += (item.hoverTarget - item.hover) * Math.min(1, dt * 8);
    const s = 1 + beat * 0.018 + pulse * 0.12 + item.hover * 0.025;
    core.scale.setScalar(s);
    coreMat.emissiveIntensity = base + beat * 0.08 + pulse * 0.55 + item.hover * 0.12;
    glowMat.opacity = 0.28 + beat * 0.06 + pulse * 0.3;
    sculpture.position.y = 2.55 + (calm ? 0 : Math.sin(t * 0.7) * 0.05);
    hotMat.opacity = calm ? 0.55 : 0.4 + Math.sin(t * 2.2) * 0.25;
    const hs = 0.3 + (calm ? 0 : (Math.sin(t * 2.2) * 0.5 + 0.5) * 0.06);
    hot.scale.set(hs, hs, 1);
  });

  ctx.refs.heart = {
    item,
    pulse() {
      const o = { v: 0 };
      gsap.killTweensOf(o);
      gsap.to(o, {
        v: 1,
        duration: ctx.reduced() ? 0.01 : 0.45,
        ease: 'power2.out',
        onUpdate: () => (pulse = o.v),
        onComplete: () => gsap.to(o, { v: 0, duration: ctx.reduced() ? 0.01 : 1.4, ease: 'power2.inOut', onUpdate: () => (pulse = o.v) }),
      });
    },
  };

  // embers rising around the sculpture
  ctx.addEmbers(new THREE.Vector3(0, 0, zc));

  // light slots
  lights.addSlot({ room: 'heart', pos: [0, C.h - 0.5, zc + 0.5], target: [0, 2.4, zc], intensity: 300, angle: 0.34, penumbra: 0.9, distance: 16, color: 0xffe0bd });
  lights.addSlot({ room: 'heart', pos: [-5, C.h - 0.8, zc + 4], target: [-8.5, 3, zc + 1], intensity: 160, angle: 0.8, penumbra: 1, distance: 16 });
  lights.addSlot({ room: 'heart', pos: [5, C.h - 0.8, zc + 4], target: [8.5, 3, zc + 1], intensity: 160, angle: 0.8, penumbra: 1, distance: 16 });
  lights.addSlot({ room: 'heart', pos: [0, C.h - 0.8, zc - 6], target: [0, 5, C.z1], intensity: 190, angle: 0.7, penumbra: 1, distance: 18, color: 0xffd9b0 });
  lights.addSlot({ room: 'heart', pos: [0, C.h - 0.8, zc + 6.5], target: [0, 0, zc + 5], intensity: 150, angle: 0.9, penumbra: 1, distance: 16 });
}
