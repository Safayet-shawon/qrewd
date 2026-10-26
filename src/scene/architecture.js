import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const _o = new THREE.Object3D();
export function matrix(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  _o.position.set(x, y, z);
  _o.rotation.set(rx, ry, rz);
  _o.scale.set(sx, sy, sz);
  _o.updateMatrix();
  return _o.matrix.clone();
}

/**
 * Collects static geometry and merges it by material so the whole building
 * costs a handful of draw calls instead of hundreds.
 */
export class Batcher {
  constructor() {
    this.groups = new Map();
  }

  add(geo, material, m = null, { cast = false, receive = true } = {}) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) {
      if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    }
    if (!g.attributes.uv) {
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    }
    if (m) g.applyMatrix4(m);
    geo.dispose();
    const key = `${material.uuid}|${cast ? 1 : 0}|${receive ? 1 : 0}`;
    let grp = this.groups.get(key);
    if (!grp) this.groups.set(key, (grp = { material, cast, receive, geos: [] }));
    grp.geos.push(g);
  }

  box(w, h, d, x, y, z, material, opts, ry = 0) {
    this.add(new THREE.BoxGeometry(w, h, d), material, matrix(x, y, z, 0, ry, 0), opts);
  }

  cyl(rt, rb, h, seg, x, y, z, material, opts) {
    this.add(new THREE.CylinderGeometry(rt, rb, h, seg), material, matrix(x, y, z), opts);
  }

  /** Floor/ceiling style plane, UVs scaled so one texture tile ≈ `tile` metres. */
  plane(w, d, x, y, z, material, { tile = 2, flip = false, ...opts } = {}) {
    const g = new THREE.PlaneGeometry(w, d);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / tile, (uv.getY(i) * d) / tile);
    this.add(g, material, matrix(x, y, z, flip ? Math.PI / 2 : -Math.PI / 2), opts);
  }

  build(parent, blockers) {
    for (const grp of this.groups.values()) {
      const merged = mergeGeometries(grp.geos, false);
      grp.geos.forEach((g) => g.dispose());
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, grp.material);
      mesh.castShadow = grp.cast;
      mesh.receiveShadow = grp.receive;
      mesh.matrixAutoUpdate = false;
      parent.add(mesh);
      blockers?.push(mesh);
    }
    this.groups.clear();
  }
}

export const DOOR = { w: 2.8, spring: 3.2 }; // radius = w / 2 → apex at 4.6 m

/** A wall slab with an arched doorway cut through it. Centred on z = 0. */
export function partitionGeometry({ width, height, thickness = 0.6, door = true }) {
  const s = new THREE.Shape();
  s.moveTo(-width / 2, 0);
  s.lineTo(width / 2, 0);
  s.lineTo(width / 2, height);
  s.lineTo(-width / 2, height);
  s.closePath();
  if (door) {
    const r = DOOR.w / 2;
    const h = new THREE.Path();
    h.moveTo(-r, 0);
    h.lineTo(r, 0);
    h.lineTo(r, DOOR.spring);
    h.absarc(0, DOOR.spring, r, 0, Math.PI, false);
    h.lineTo(-r, 0);
    s.holes.push(h);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: thickness, bevelEnabled: false, curveSegments: 28 });
  g.translate(0, 0, -thickness / 2);
  return g;
}

/** Arched architrave ring that frames a doorway (or a blind arch). */
export function archRingGeometry({ innerHalf, spring, border = 0.2, depth = 0.1 }) {
  const R = innerHalf + border;
  const s = new THREE.Shape();
  s.moveTo(-R, 0);
  s.lineTo(-R, spring);
  s.absarc(0, spring, R, Math.PI, 0, true);
  s.lineTo(R, 0);
  s.lineTo(innerHalf, 0);
  s.lineTo(innerHalf, spring);
  s.absarc(0, spring, innerHalf, 0, Math.PI, false);
  s.lineTo(-innerHalf, 0);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 28 });
}

/** Solid arched panel (rect + semicircle). */
export function archPanelGeometry({ half, spring, depth = 0.04 }) {
  const s = new THREE.Shape();
  s.moveTo(-half, 0);
  s.lineTo(half, 0);
  s.lineTo(half, spring);
  s.absarc(0, spring, half, 0, Math.PI, false);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 28 });
}

/** Classical column: plinth, tapered shaft, torus necking, capital + abacus. */
export function addColumn(b, mats, x, z, { h = 5.4, r = 0.34, y0 = 0, seg = 20 } = {}) {
  const cast = { cast: true };
  b.box(r * 3.1, 0.18, r * 3.1, x, y0 + 0.09, z, mats.trim, cast);
  b.cyl(r * 1.35, r * 1.45, 0.22, seg, x, y0 + 0.29, z, mats.trim, cast);
  b.cyl(r * 0.9, r, h - 0.9, seg, x, y0 + 0.4 + (h - 0.9) / 2, z, mats.trim, cast);
  b.cyl(r * 1.05, r * 0.95, 0.12, seg, x, y0 + h - 0.45, z, mats.champagne, cast);
  b.cyl(r * 1.5, r * 0.98, 0.3, seg, x, y0 + h - 0.24, z, mats.trim, cast);
  b.box(r * 3.2, 0.12, r * 3.2, x, y0 + h - 0.06, z, mats.trim, cast);
}

/** Base moulding, dado rail and cornice running along a straight wall. */
export function addWallTrim(b, mats, { x, z0, z1, h, side }) {
  const len = Math.abs(z1 - z0);
  const zc = (z0 + z1) / 2;
  const off = side * 0.05;
  b.box(0.14, 0.34, len, x + off, 0.17, zc, mats.trim, { cast: false });
  b.box(0.08, 0.06, len, x + side * 0.03, 0.9, zc, mats.trim, { cast: false });
  b.box(0.2, 0.22, len, x + side * 0.08, h - 0.11, zc, mats.trim, { cast: false });
  b.box(0.08, 0.05, len, x + side * 0.05, h - 0.3, zc, mats.champagne, { cast: false });
}
