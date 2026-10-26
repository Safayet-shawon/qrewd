import * as THREE from 'three';
import { matrix, partitionGeometry, archRingGeometry, archPanelGeometry, addColumn, addWallTrim, DOOR } from '../architecture.js';
import { canvasTexture, glowTexture, wrapLines, SERIF, SANS } from '../textures.js';

/** Facade + dusk plaza (exterior) and Room A, the entrance gallery. */
export function buildEntrance(ctx, L) {
  const { batch: b, mats, content, lights } = ctx;
  const A = L.entrance;
  const half = A.half;
  const cast = { cast: true };
  const noRecv = { receive: false };

  /* ───────────── Facade ───────────── */
  const FW = 34;
  const FH = 9;
  b.add(partitionGeometry({ width: FW, height: FH, thickness: 0.8 }), mats.stone, matrix(0, 0, 0), cast);
  // door architrave (outside + inside)
  for (const z of [0.4, -0.4 - 0.1]) {
    b.add(archRingGeometry({ innerHalf: DOOR.w / 2, spring: DOOR.spring, border: 0.26, depth: 0.1 }), mats.trim, matrix(0, 0, z), cast);
  }
  // plinth
  b.box(FW + 0.4, 0.7, 1.3, 0, 0.35, 0.25, mats.trim, cast);
  // pilasters
  for (const x of [-15.8, -3.7, 3.7, 15.8]) addColumn(b, mats, x, 0.85, { h: 7.4, r: 0.4, y0: 0.7 });
  // entablature, cornice
  b.box(FW + 0.4, 0.95, 1.7, 0, 8.55, 0.15, mats.trim, cast);
  b.box(FW + 0.9, 0.3, 2.1, 0, 9.2, 0.25, mats.trim, cast);
  b.box(FW + 0.5, 0.06, 1.75, 0, 8.08, 0.15, mats.champagne, cast);
  // pediment
  const ped = new THREE.Shape();
  ped.moveTo(-5.2, 0);
  ped.lineTo(5.2, 0);
  ped.lineTo(0, 1.7);
  ped.closePath();
  b.add(new THREE.ExtrudeGeometry(ped, { depth: 1.4, bevelEnabled: false }), mats.trim, matrix(0, 9.35, -0.55), cast);
  const pedIn = new THREE.Shape();
  pedIn.moveTo(-4.3, 0.18);
  pedIn.lineTo(4.3, 0.18);
  pedIn.lineTo(0, 1.38);
  pedIn.closePath();
  b.add(new THREE.ExtrudeGeometry(pedIn, { depth: 0.04, bevelEnabled: false }), mats.stone, matrix(0, 9.35, 0.85));
  // roof-line fascia behind pediment
  b.box(FW, 0.5, 1.4, 0, 9.55, 0, mats.trim, cast);

  // arched windows with a warm glow
  for (const x of [-12.4, -7, 7, 12.4]) {
    b.add(archRingGeometry({ innerHalf: 1.05, spring: 3.4, border: 0.22, depth: 0.12 }), mats.trim, matrix(x, 1.9, 0.4), cast);
    b.add(archPanelGeometry({ half: 1.05, spring: 3.4, depth: 0.02 }), mats.windowGlass, matrix(x, 1.9, 0.4));
    b.box(0.05, 4.4, 0.05, x, 1.9 + 2.2, 0.46, mats.trim);
    b.box(2.1, 0.05, 0.05, x, 1.9 + 2.2, 0.46, mats.trim);
    b.box(2.1, 0.05, 0.05, x, 1.9 + 3.3, 0.46, mats.trim);
    b.box(2.5, 0.12, 0.34, x, 1.84, 0.55, mats.trim);
  }

  // steps (top landing is level with the interior floor)
  const steps = [
    [9.2, 0, 0.4, 1.5],
    [9.9, -0.17, 1.5, 2.1],
    [10.6, -0.34, 2.1, 2.7],
  ];
  for (const [w, top, z0, z1] of steps) b.box(w, top + 0.51, z1 - z0, 0, (top - 0.51) / 2, (z0 + z1) / 2, mats.stone, cast);
  // ground + approach path
  b.plane(160, 160, 0, -0.51, 40, mats.ground, { tile: 6, receive: true });
  b.plane(8, 60, 0, -0.5, 32.5, mats.path, { tile: 3 });
  b.plane(24, 3.2, 0, -0.5, 4.3, mats.path, { tile: 3 });

  // urns on plinths flanking the landing
  const urnPts = [[0.001, 0], [0.26, 0], [0.3, 0.06], [0.2, 0.3], [0.33, 0.7], [0.4, 0.92], [0.32, 1.02], [0.36, 1.1], [0.001, 1.1]].map(([x, y]) => new THREE.Vector2(x, y));
  for (const x of [-4.9, 4.9]) {
    b.box(0.8, 0.6, 0.8, x, 0.3, 1.15, mats.trim, cast);
    b.add(new THREE.LatheGeometry(urnPts, 24), mats.trim, matrix(x, 0.6, 1.15), cast);
  }

  // lanterns either side of the doors
  for (const x of [-2.55, 2.55]) {
    b.box(0.06, 0.06, 0.28, x, 3.6, 0.55, mats.champagne);
    b.cyl(0.11, 0.09, 0.34, 10, x, 3.35, 0.7, mats.lamp);
    b.cyl(0.14, 0.14, 0.04, 10, x, 3.55, 0.7, mats.champagne);
    b.cyl(0.14, 0.1, 0.04, 10, x, 3.16, 0.7, mats.champagne);
  }

  // glow behind lanterns (soft sprite halo)
  const halo = new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffcf94, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
  for (const x of [-2.55, 2.55]) {
    const s = new THREE.Sprite(halo);
    s.position.set(x, 3.35, 0.8);
    s.scale.set(1.6, 1.6, 1);
    ctx.root.add(s);
  }

  // museum title carved on the entablature
  const sign = canvasTexture(1400, 160, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.textAlign = 'center';
    c.fillStyle = '#6f5a49';
    c.font = `500 84px ${SERIF}`;
    c.letterSpacing = '22px';
    c.fillText(content.site.title.toUpperCase(), w / 2 + 11, h * 0.68);
  });
  const signMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(8.75, 1),
    new THREE.MeshStandardMaterial({ map: sign, transparent: true, roughness: 0.8, depthWrite: false }),
  );
  signMesh.position.set(0, 8.55, 1.011);
  ctx.root.add(signMesh);
  ctx.disposables.push(signMesh.geometry, signMesh.material, sign);

  /* ───────────── Doors ───────────── */
  const doorGroup = new THREE.Group();
  const leafW = DOOR.w / 2;
  const leafH = DOOR.spring;
  const leaves = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * (DOOR.w / 2), 0, -0.05);
    const leafGeo = new THREE.BoxGeometry(leafW - 0.02, leafH, 0.1);
    const leaf = new THREE.Mesh(leafGeo, mats.walnut);
    leaf.position.set(-side * (leafW / 2), leafH / 2, 0);
    leaf.castShadow = true;
    pivot.add(leaf);
    // raised panels
    for (const [py, ph] of [[0.95, 1.4], [2.45, 0.9]]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(leafW - 0.38, ph, 0.03), mats.walnut);
      p.position.set(-side * (leafW / 2), py, 0.06);
      pivot.add(p);
      const p2 = p.clone();
      p2.position.z = -0.06;
      pivot.add(p2);
    }
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 8), mats.champagne);
    handle.position.set(-side * (leafW - 0.18), 1.5, 0.1);
    pivot.add(handle);
    const handleB = handle.clone();
    handleB.position.z = -0.1;
    pivot.add(handleB);
    doorGroup.add(pivot);
    leaves.push(pivot);
    ctx.disposables.push(leafGeo);
  }
  // fanlight above the doors
  const fan = new THREE.Mesh(archPanelGeometry({ half: DOOR.w / 2, spring: 0.0001, depth: 0.02 }), mats.windowGlass);
  fan.geometry.dispose();
  const fanShape = new THREE.Shape();
  fanShape.absarc(0, 0, DOOR.w / 2, 0, Math.PI, false);
  fanShape.closePath();
  fan.geometry = new THREE.ShapeGeometry(fanShape, 28);
  fan.position.set(0, DOOR.spring, -0.06);
  doorGroup.add(fan);
  for (let i = 1; i < 5; i++) {
    const a = (Math.PI * i) / 5;
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.03, DOOR.w / 2, 0.03), mats.champagne);
    bar.position.set(Math.cos(a) * (DOOR.w / 4), DOOR.spring + Math.sin(a) * (DOOR.w / 4), -0.04);
    bar.rotation.z = a - Math.PI / 2;
    doorGroup.add(bar);
  }
  ctx.root.add(doorGroup);
  ctx.refs.doors = { left: leaves[0], right: leaves[1], fan };

  /* ───────────── Room A interior ───────────── */
  const z0 = A.z0;
  const z1 = A.z1;
  const len = Math.abs(z1 - z0);
  const zc = (z0 + z1) / 2;
  b.plane(half * 2, len, 0, 0, zc, mats.floor, { tile: 2 });
  b.plane(half * 2, len, 0, A.h, zc, mats.ceiling, { flip: true, tile: 4, cast: false });
  for (const s of [-1, 1]) {
    b.box(0.5, A.h, len, s * (half + 0.25), A.h / 2, zc, mats.plaster, cast);
    addWallTrim(b, mats, { x: s * half, z0, z1, h: A.h, side: -s });
    // light coves
    b.box(0.1, 0.05, len - 1, s * (half - 0.1), A.h - 0.38, zc, mats.cove, noRecv);
    // tall blind arches between the columns
    for (const z of [-4, -8, -12]) {
      const zz = z + 2;
      b.add(archRingGeometry({ innerHalf: 1.2, spring: 3.4, border: 0.16, depth: 0.06 }), mats.trim, matrix(s * (half - 0.0), 0.3, zz, 0, (-s * Math.PI) / 2, 0));
    }
  }
  // coffer beams
  for (const z of [-2, -6, -10, -14]) b.box(half * 2, 0.28, 0.34, 0, A.h - 0.14, z, mats.trim);
  // floor inlays: centre line + medallion
  b.box(0.07, 0.01, len, 0, 0.006, zc, mats.roseGold, noRecv);
  b.add(new THREE.RingGeometry(1.5, 1.56, 64), mats.roseGold, matrix(0, 0.008, A.plaque.z, -Math.PI / 2), noRecv);
  b.add(new THREE.RingGeometry(1.2, 1.23, 64), mats.champagne, matrix(0, 0.007, A.plaque.z, -Math.PI / 2), noRecv);
  // columns
  for (const s of [-1, 1]) for (const z of [-4, -8, -12]) addColumn(b, mats, s * 4.6, z, { h: A.h - 0.3, r: 0.34 });

  // wall wash glows
  const washTex = glowTexture(128, [[0, 'rgba(255,214,160,0.55)'], [1, 'rgba(255,214,160,0)']]);
  const washMat = new THREE.MeshBasicMaterial({ map: washTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.32 });
  ctx.disposables.push(washTex, washMat);
  for (const s of [-1, 1]) for (const z of [-4, -8, -12]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 5.4), washMat);
    w.position.set(s * (half - 0.01), 2.9, z + 2);
    w.rotation.y = (-s * Math.PI) / 2;
    ctx.root.add(w);
  }

  /* lectern with the introduction plaque */
  const P = A.plaque;
  b.box(1.7, 0.12, 0.85, 0, 0.06, P.z, mats.marble, cast);
  b.box(1.3, 0.92, 0.5, 0, 0.58, P.z, mats.marble, cast);
  b.box(1.38, 0.04, 0.56, 0, 1.06, P.z, mats.champagne, cast);

  const tex = canvasTexture(1536, 960, (c, w, h) => {
    c.fillStyle = '#f3ebdb';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(160,126,98,0.7)';
    c.lineWidth = 3;
    c.strokeRect(30, 30, w - 60, h - 60);
    c.lineWidth = 1.5;
    c.strokeRect(42, 42, w - 84, h - 84);
    c.textAlign = 'center';
    c.fillStyle = '#8c6c58';
    c.font = `500 30px ${SANS}`;
    c.letterSpacing = '10px';
    c.fillText('THE MUSEUM OF', w / 2, 128);
    c.fillStyle = '#3a2d26';
    c.letterSpacing = '0px';
    c.font = `500 92px ${SERIF}`;
    let y = 250;
    for (const ln of wrapLines(c, content.intro.heading, w - 220)) {
      c.fillText(ln, w / 2, y);
      y += 100;
    }
    c.strokeStyle = 'rgba(170,134,108,0.9)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(w / 2 - 90, y - 30);
    c.lineTo(w / 2 + 90, y - 30);
    c.stroke();
    c.fillStyle = '#5a4a40';
    c.font = `400 italic 52px ${SERIF}`;
    y += 40;
    for (const ln of wrapLines(c, content.intro.message, w - 300)) {
      c.fillText(ln, w / 2, y);
      y += 64;
    }
    c.fillStyle = '#8c6c58';
    c.font = `500 34px ${SANS}`;
    c.letterSpacing = '8px';
    c.fillText(content.site.couple.filter(Boolean).join('  &  ').toUpperCase(), w / 2, h - 96);
  });
  const plaque = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 0.8125),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.06 }),
  );
  plaque.position.set(0, 1.28, P.z + 0.02);
  plaque.rotation.x = -0.62;
  ctx.root.add(plaque);
  plaque.userData.item = {
    id: 'plaque',
    kind: 'plaque',
    index: 0,
    meshes: [plaque],
    focus: { center: new THREE.Vector3(0, 1.3, P.z), normal: new THREE.Vector3(0, 0.6, 0.8).normalize(), w: 1.9, h: 1.25 },
    hover: 0,
    hoverTarget: 0,
    setHover(on) {
      this.hoverTarget = on ? 1 : 0;
    },
  };
  const plaqueItem = plaque.userData.item;
  ctx.updaters.push((dt) => {
    if (Math.abs(plaqueItem.hover - plaqueItem.hoverTarget) < 0.002) return;
    plaqueItem.hover += (plaqueItem.hoverTarget - plaqueItem.hover) * Math.min(1, dt * 10);
    plaque.material.emissiveIntensity = 0.06 + plaqueItem.hover * 0.2;
  });
  ctx.items.push(plaqueItem);
  ctx.refs.plaque = plaqueItem;
  ctx.disposables.push(plaque.geometry, plaque.material, tex);

  /* ───────────── Light slots ───────────── */
  for (const s of [-1, 1]) {
    lights.addSlot({ room: 'exterior', pos: [s * 6.6, 0.1, 5.2], target: [s * 6.6, 6.5, 0], intensity: 170, angle: 0.5, penumbra: 0.9, distance: 18, color: 0xffd3a0 });
  }
  lights.addSlot({ room: 'exterior', pos: [0, 0.2, 7], target: [0, 3, 0], intensity: 70, angle: 0.6, penumbra: 0.9, distance: 16, color: 0xffd9ae });
  lights.addSlot({ room: 'entrance', pos: [0, A.h - 0.4, P.z + 1.2], target: [0, 1.0, P.z], intensity: 95, angle: 0.5, penumbra: 0.7, distance: 14, color: 0xffe6c4 });
  lights.addSlot({ room: 'entrance', pos: [0, A.h - 0.4, -2.5], target: [0, 0, -4.5], intensity: 90, angle: 0.8, penumbra: 0.9, distance: 14 });
  lights.addSlot({ room: 'entrance', pos: [-4.4, A.h - 0.5, -6], target: [-6.8, 2.2, -6], intensity: 90, angle: 0.8, penumbra: 0.9, distance: 14 });
  lights.addSlot({ room: 'entrance', pos: [4.4, A.h - 0.5, -6], target: [6.8, 2.2, -6], intensity: 90, angle: 0.8, penumbra: 0.9, distance: 14 });
  lights.addSlot({ room: 'entrance', pos: [0, A.h - 0.4, -12.5], target: [0, 0.5, -14.5], intensity: 100, angle: 0.8, penumbra: 0.9, distance: 14 });
}
