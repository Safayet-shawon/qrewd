import * as THREE from 'three';
import { addWallTrim } from '../architecture.js';
import { canvasTexture, glowTexture, SERIF, SANS } from '../textures.js';

/**
 * Room F — the finale. A marble pedestal with a three-tier cake and sixteen candles,
 * and a wall plate that reads the message. The cake is picked like any other piece.
 */
export function buildFinale(ctx, L) {
  const { batch: b, mats, content, lights } = ctx;
  const F = L.finale;
  const half = F.half;
  const len = Math.abs(F.z1 - F.z0);
  const zc = F.zc;
  const cast = { cast: true };
  const noRecv = { receive: false };
  const pz = F.pedestalZ;

  b.plane(half * 2, len, 0, 0, zc, mats.floor, { tile: 2 });
  b.plane(half * 2, len, 0, F.h, zc, mats.ceiling, { flip: true, tile: 4 });
  for (const s of [-1, 1]) {
    b.box(0.5, F.h, len, s * (half + 0.25), F.h / 2, zc, mats.plaster, cast);
    addWallTrim(b, mats, { x: s * half, z0: F.z0, z1: F.z1, h: F.h, side: -s });
  }
  b.box(half * 2 + 1, F.h, 0.5, 0, F.h / 2, F.z1 - 0.25, mats.plaster, cast);
  // a soft rose carpet from the threshold to the pedestal
  b.plane(2.2, len, 0, 0.006, zc, mats.carpet, { tile: 4 });
  // marble plinth
  b.cyl(0.95, 1.0, 0.9, 48, 0, 0.45, pz, mats.marble, cast);
  b.cyl(1.1, 1.1, 0.08, 48, 0, 0.94, pz, mats.champagne, cast);
  // warm pools of light
  lights.addSlot({ room: 'finale', pos: [0, F.h - 0.4, pz + 1.6], target: [0, 1.0, pz], intensity: 150, angle: 0.5, penumbra: 0.9, distance: 14, color: 0xffe6c4 });
  lights.addSlot({ room: 'finale', pos: [0, F.h - 0.4, F.z1 + 3], target: [0, 2.4, F.z1], intensity: 90, angle: 0.8, penumbra: 1, distance: 14 });
  for (const s of [-1, 1]) lights.addSlot({ room: 'finale', pos: [s * (half - 1.2), F.h - 0.5, zc], target: [s * half, 2.2, zc], intensity: 70, angle: 0.8, penumbra: 1, distance: 12 });

  /* ───────────── the cake (its own meshes, so it can be picked) ───────────── */
  const cake = new THREE.Group();
  cake.position.set(0, 0.98, pz);
  ctx.root.add(cake);
  const cream = new THREE.MeshStandardMaterial({ color: 0xfbf3ea, roughness: 0.5 });
  const rose = new THREE.MeshStandardMaterial({ color: 0xd98c8c, roughness: 0.45 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd9bb7a, roughness: 0.3, metalness: 0.8 });
  const wax = new THREE.MeshStandardMaterial({ color: 0xf4e6c8, roughness: 0.6 });
  const tiers = [
    { r: 0.56, h: 0.34, y: 0 },
    { r: 0.42, h: 0.3, y: 0.34 },
    { r: 0.28, h: 0.26, y: 0.64 },
  ];
  for (const t of tiers) {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(t.r, t.r * 1.02, t.h, 56), cream);
    body.position.y = t.y + t.h / 2;
    body.castShadow = true;
    cake.add(body);
    // rose band and a piped frosting rim along the top edge
    const band = new THREE.Mesh(new THREE.TorusGeometry(t.r * 1.01, 0.02, 10, 72), rose);
    band.rotation.x = Math.PI / 2;
    band.position.y = t.y + 0.06;
    cake.add(band);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(t.r * 0.97, 0.035, 12, 72), cream);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = t.y + t.h;
    cake.add(rim);
    // little roses of frosting around each rim
    const n = Math.round(t.r * 22);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 10), rose);
      dot.position.set(Math.cos(a) * t.r * 0.97, t.y + t.h + 0.02, Math.sin(a) * t.r * 0.97);
      cake.add(dot);
    }
  }
  // gold base
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.02, 56), gold);
  base.position.y = -0.01;
  cake.add(base);
  // sixteen candles around the top tier, each with a soft flame
  const flameTex = glowTexture(64, [[0, 'rgba(255,236,190,1)'], [0.35, 'rgba(255,190,110,0.7)'], [1, 'rgba(255,160,80,0)']]);
  const flames = [];
  const flameMat = new THREE.SpriteMaterial({ map: flameTex, color: 0xffd9a0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const x = Math.cos(a) * 0.17;
    const z = Math.sin(a) * 0.17;
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.1, 10), wax);
    candle.position.set(x, 0.9 + 0.05, z);
    cake.add(candle);
    const f = new THREE.Sprite(flameMat);
    f.scale.set(0.06, 0.09, 1);
    f.position.set(x, 1.04, z);
    cake.add(f);
    flames.push(f);
  }
  ctx.updaters.push((dt, t) => {
    flameMat.opacity = 0.8 + Math.sin(t * 9) * 0.12;
    flames.forEach((f, i) => (f.scale.y = 0.085 + Math.sin(t * 11 + i) * 0.012));
  });
  ctx.disposables.push(cream, rose, gold, wax, flameMat, flameTex);
  ctx.disposables.push(...cake.children.map((c) => c.geometry).filter(Boolean));

  /* ───────────── the message, on the wall in front of the cake ───────────── */
  const plate = canvasTexture(1536, 768, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = 'rgba(251,246,236,0.94)';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(190,150,110,0.8)';
    c.lineWidth = 4;
    c.strokeRect(26, 26, w - 52, h - 52);
    c.textAlign = 'center';
    c.fillStyle = '#7a3a44';
    c.font = `italic 500 170px ${SERIF}`;
    c.fillText(content.finale.cakeTitle, w / 2, h * 0.46);
    c.fillStyle = '#9a7556';
    c.font = `500 58px ${SANS}`;
    c.letterSpacing = '14px';
    c.fillText(content.finale.cakeSubtitle.toUpperCase(), w / 2, h * 0.7);
  });
  const plateMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 1.7),
    new THREE.MeshStandardMaterial({ map: plate, roughness: 0.6, emissive: 0xffffff, emissiveMap: plate, emissiveIntensity: 0.15 }),
  );
  plateMesh.position.set(0, 2.5, F.z1 + 0.02);
  ctx.root.add(plateMesh);
  ctx.disposables.push(plateMesh.geometry, plateMesh.material, plate);

  /* ───────────── the cake as an item (picked, read, then the question) ───────────── */
  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.9, 14, 10), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hit.position.set(0, 1.35, pz);
  ctx.root.add(hit);
  ctx.disposables.push(hit.geometry, hit.material);
  const normal = new THREE.Vector3(0, 0.25, 0.97).normalize();
  const item = {
    id: 'cake',
    kind: 'cake',
    index: 0,
    meshes: [hit],
    focus: { center: new THREE.Vector3(0, 1.3, pz), normal, w: 1.6, h: 1.4 },
    hover: 0,
    hoverTarget: 0,
    setHover(on) {
      this.hoverTarget = on ? 1 : 0;
    },
  };
  hit.userData.item = item;
  ctx.items.push(item);
  ctx.refs.cake = { item };

  ctx.updaters.push((dt) => {
    item.hover += (item.hoverTarget - item.hover) * Math.min(1, dt * 8);
    cake.scale.setScalar(1 + item.hover * 0.02);
  });
  void noRecv;
}
