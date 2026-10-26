import * as THREE from 'three';
import gsap from 'gsap';
import { addWallTrim, addColumn } from '../architecture.js';
import { canvasTexture, coneTexture, glowTexture, ringTexture, rng } from '../textures.js';

/**
 * Room E — a quiet room with one pedestal. The envelope on it can be opened:
 * the flap lifts and the letter rises, then the reader takes over.
 */
export function buildLetterRoom(ctx, L) {
  const { batch: b, mats, lights } = ctx;
  const E = L.letter;
  const half = E.half;
  const len = Math.abs(E.z1 - E.z0);
  const zc = (E.z0 + E.z1) / 2;
  const cast = { cast: true };
  const noRecv = { receive: false };
  const pz = E.pedestalZ;

  b.plane(half * 2, len, 0, 0, zc, mats.floor, { tile: 2 });
  b.plane(half * 2, len, 0, E.h, zc, mats.ceiling, { flip: true, tile: 4 });
  for (const s of [-1, 1]) {
    b.box(0.5, E.h, len, s * (half + 0.25), E.h / 2, zc, mats.plaster, cast);
    addWallTrim(b, mats, { x: s * half, z0: E.z0, z1: E.z1, h: E.h, side: -s });
  }
  // closed end wall
  b.box(half * 2 + 1, E.h, 0.5, 0, E.h / 2, E.z1 - 0.25, mats.plaster, cast);
  b.box(half * 2, 0.22, 0.2, 0, E.h - 0.11, E.z1 + 0.1, mats.trim);
  b.box(half * 2, 0.34, 0.14, 0, 0.17, E.z1 + 0.07, mats.trim);
  b.box(0.07, 0.01, len, 0, 0.006, zc, mats.roseGold, noRecv);
  b.add(new THREE.RingGeometry(1.45, 1.5, 64), mats.roseGold, new THREE.Matrix4().makeRotationX(-Math.PI / 2).setPosition(0, 0.009, pz), noRecv);
  for (const s of [-1, 1]) addColumn(b, mats, s * (half - 0.8), pz, { h: E.h - 0.3, r: 0.28 });

  // soft glow on the end wall
  const washTex = glowTexture(128, [[0, 'rgba(255,214,160,0.5)'], [1, 'rgba(255,214,160,0)']]);
  const washMat = new THREE.MeshBasicMaterial({ map: washTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.32 });
  const wash = new THREE.Mesh(new THREE.PlaneGeometry(7, 5), washMat);
  wash.position.set(0, 2.4, E.z1 - 0.01);
  wash.rotation.y = Math.PI;
  ctx.root.add(wash);
  ctx.disposables.push(washTex, washMat, wash.geometry);

  // pedestal
  b.cyl(0.62, 0.7, 0.14, 40, 0, 0.07, pz, mats.marble, cast);
  b.cyl(0.46, 0.52, 0.88, 40, 0, 0.58, pz, mats.marble, cast);
  b.cyl(0.58, 0.5, 0.08, 40, 0, 1.06, pz, mats.champagne, cast);
  b.cyl(0.6, 0.6, 0.05, 40, 0, 1.12, pz, mats.marble, cast);

  // envelope (centre of its underside sits on the pedestal at y ≈ 1.145)
  const env = new THREE.Group();
  env.position.set(0, 1.158, pz);
  env.rotation.y = 0;
  ctx.root.add(env);
  const EW = 0.9;
  const ED = 0.6;
  const body = new THREE.Mesh(new THREE.BoxGeometry(EW, 0.022, ED), mats.paper);
  body.castShadow = true;
  env.add(body);
  const lining = new THREE.Mesh(new THREE.PlaneGeometry(EW - 0.03, ED - 0.03), new THREE.MeshStandardMaterial({ color: 0xcfa797, roughness: 0.8 }));
  lining.rotation.x = -Math.PI / 2;
  lining.position.y = 0.0115;
  env.add(lining);
  // front pocket (V-shaped folds drawn on the body)
  const folds = canvasTexture(512, 342, (c, w, h) => {
    c.fillStyle = '#f4ecda';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(150,120,95,0.35)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(0, h);
    c.lineTo(w / 2, h * 0.38);
    c.lineTo(w, h);
    c.moveTo(0, 0);
    c.lineTo(w / 2, h * 0.58);
    c.lineTo(w, 0);
    c.stroke();
    const r = rng(5);
    for (let i = 0; i < 1600; i++) {
      c.fillStyle = `rgba(120,90,70,${r() * 0.04})`;
      c.fillRect(r() * w, r() * h, 2, 2);
    }
  });
  const pocket = new THREE.Mesh(new THREE.PlaneGeometry(EW, ED), new THREE.MeshStandardMaterial({ map: folds, roughness: 0.9 }));
  pocket.rotation.x = -Math.PI / 2;
  pocket.position.y = 0.0125;
  env.add(pocket);
  pocket.visible = true;

  // the letter, tucked inside until the flap opens
  const sheetTex = canvasTexture(512, 360, (c, w, h) => {
    c.fillStyle = '#fbf6ea';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(140,110,90,0.25)';
    c.lineWidth = 2;
    const r = rng(11);
    for (let y = 70; y < h - 40; y += 28) {
      c.beginPath();
      c.moveTo(48, y);
      c.lineTo(48 + (w - 96) * (0.55 + r() * 0.45), y);
      c.stroke();
    }
  });
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(EW - 0.12, ED - 0.1), new THREE.MeshStandardMaterial({ map: sheetTex, roughness: 0.85, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: sheetTex, emissiveIntensity: 0.12 }));
  sheet.rotation.x = -Math.PI / 2;
  sheet.position.set(0, 0.0065, 0.01);
  sheet.visible = false;
  env.add(sheet);

  // flap hinged on the far edge
  const flapPivot = new THREE.Group();
  flapPivot.position.set(0, 0.0125, -ED / 2);
  env.add(flapPivot);
  const tri = new THREE.Shape();
  tri.moveTo(-EW / 2, 0);
  tri.lineTo(EW / 2, 0);
  tri.lineTo(0, ED * 0.62);
  tri.closePath();
  const flapGeo = new THREE.ShapeGeometry(tri);
  flapGeo.rotateX(-Math.PI / 2);
  const flapMat = new THREE.MeshStandardMaterial({ color: 0xf7efde, roughness: 0.85, side: THREE.DoubleSide });
  const flap = new THREE.Mesh(flapGeo, flapMat);
  flap.position.y = 0.004;
  flap.castShadow = true;
  flapPivot.add(flap);
  const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.058, 0.018, 24), mats.wax);
  seal.position.set(0, 0.014, ED * 0.5);
  flapPivot.add(seal);
  ctx.disposables.push(body.geometry, lining.geometry, lining.material, pocket.geometry, pocket.material, folds, sheet.geometry, sheet.material, sheetTex, flapGeo, flapMat, seal.geometry);

  // warm cone + marker
  const coneMat = new THREE.MeshBasicMaterial({ map: coneTexture(), transparent: true, opacity: 0.07, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 1.5, E.h - 1.1, 36, 1, true), coneMat);
  cone.position.set(0, (E.h - 1.1) / 2 + 1.1, pz);
  ctx.root.add(cone);
  const hotMat = new THREE.SpriteMaterial({ map: ringTexture(), transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending });
  const hot = new THREE.Sprite(hotMat);
  hot.position.set(0, 1.55, pz + 0.05);
  hot.scale.set(0.3, 0.3, 1);
  ctx.root.add(hot);
  ctx.disposables.push(cone.geometry, coneMat, coneMat.map, hotMat, hotMat.map);

  const hit = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.5, 0.9), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hit.position.set(0, 1.3, pz);
  ctx.root.add(hit);
  ctx.disposables.push(hit.geometry, hit.material);

  const item = {
    id: 'letter',
    kind: 'letter',
    index: 0,
    meshes: [hit],
    focus: { center: new THREE.Vector3(0, 1.25, pz), normal: new THREE.Vector3(0, 0.78, 0.62).normalize(), w: 2.1, h: 1.35 },
    hover: 0,
    hoverTarget: 0,
    setHover(on) {
      this.hoverTarget = on ? 1 : 0;
    },
  };
  hit.userData.item = item;
  ctx.items.push(item);

  const state = { open: false, busy: null };
  ctx.updaters.push((dt, t) => {
    item.hover += (item.hoverTarget - item.hover) * Math.min(1, dt * 8);
    env.position.y = 1.158 + item.hover * 0.012 + (ctx.reduced() || state.open ? 0 : Math.sin(t * 1.1) * 0.004);
    hotMat.opacity = state.open ? 0 : ctx.reduced() ? 0.55 : 0.4 + Math.sin(t * 2.2) * 0.25;
  });

  const dur = (v) => (ctx.reduced() ? 0.01 : v);

  ctx.refs.letter = {
    item,
    /** Lift the flap and raise the letter. Resolves when the sheet is up. */
    open() {
      state.busy?.kill();
      state.open = true;
      sheet.visible = true;
      const tl = gsap.timeline();
      state.busy = tl;
      tl.to(flapPivot.rotation, { x: -2.95, duration: dur(1.0), ease: 'power2.inOut' }, 0.1);
      tl.to(seal.scale, { x: 0.001, y: 0.001, z: 0.001, duration: dur(0.01) }, 0.12);
      tl.to(sheet.position, { y: 0.34, z: 0.1, duration: dur(1.1), ease: 'power2.out' }, 0.9);
      tl.to(sheet.rotation, { x: -Math.PI / 2 + 0.95, duration: dur(1.1), ease: 'power2.out' }, 0.9);
      return new Promise((res) => tl.eventCallback('onComplete', res));
    },
    /** Put the letter back and close the flap. */
    close() {
      state.busy?.kill();
      const tl = gsap.timeline({ onComplete: () => { sheet.visible = false; state.open = false; } });
      state.busy = tl;
      tl.to(sheet.position, { y: 0.0065, z: 0.01, duration: dur(0.6), ease: 'power2.inOut' }, 0);
      tl.to(sheet.rotation, { x: -Math.PI / 2, duration: dur(0.6), ease: 'power2.inOut' }, 0);
      tl.to(flapPivot.rotation, { x: 0, duration: dur(0.7), ease: 'power2.inOut' }, 0.5);
      tl.to(seal.scale, { x: 1, y: 1, z: 1, duration: dur(0.01) }, 1.15);
      return new Promise((res) => tl.eventCallback('onComplete', () => { sheet.visible = false; state.open = false; res(); }));
    },
    reset() {
      state.busy?.kill();
      flapPivot.rotation.x = 0;
      sheet.visible = false;
      sheet.position.set(0, 0.0065, 0.01);
      sheet.rotation.x = -Math.PI / 2;
      seal.scale.set(1, 1, 1);
      state.open = false;
    },
  };

  lights.addSlot({ room: 'letter', pos: [0, E.h - 0.4, pz + 1.0], target: [0, 1.1, pz], intensity: 80, angle: 0.3, penumbra: 0.9, distance: 14, color: 0xffe0b8 });
  lights.addSlot({ room: 'letter', pos: [0, E.h - 0.5, E.z0 - 3.5], target: [0, 0.5, E.z0 - 5.5], intensity: 120, angle: 0.9, penumbra: 1, distance: 14 });
  lights.addSlot({ room: 'letter', pos: [-half + 1.5, E.h - 0.5, pz + 1], target: [-half, 2.2, pz - 1], intensity: 90, angle: 0.8, penumbra: 1, distance: 12 });
  lights.addSlot({ room: 'letter', pos: [half - 1.5, E.h - 0.5, pz + 1], target: [half, 2.2, pz - 1], intensity: 90, angle: 0.8, penumbra: 1, distance: 12 });
}
