import * as THREE from 'three';
import { createCouple, animateFigure, faceAngle } from './avatars.js';
import { DOOR } from './architecture.js';

const SPEED = 2.3; // metres per second
const TURN_RATE = 1.9; // radians per second
const WALL_MARGIN = 0.6;
const DOOR_HALF = DOOR.w / 2 - 0.25;
const FACADE_Z = 0;
const OUTSIDE_Z = 7;
const NEAR = { plaque: 2.6, heart: 3.6, letter: 2.8 };
const NEAR_DEFAULT = 2.4;

/** Circles the visitor cannot walk through (columns, plinths, lectern, dais). */
function buildObstacles(L, timelineCount) {
  const o = [];
  o.push({ x: 0, z: L.entrance.plaque.z, r: 1.0 });
  for (const s of [-1, 1]) for (const z of [-4, -8, -12]) o.push({ x: s * 4.6, z, r: 0.45 }); // entrance columns
  for (const s of [-1, 1]) o.push({ x: s * 4.9, z: 1.15, r: 0.5 }); // urns outside the entrance
  o.push({ x: 0, z: L.heart.zc, r: 2.8 }); // dais
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    o.push({ x: Math.sin(a) * 7, z: L.heart.zc + Math.cos(a) * 7, r: 0.4 });
  }
  for (let i = 0; i < timelineCount; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    o.push({ x: side * 2.3, z: L.timeline.z0 - 3.6 - i * L.timeline.spacing, r: 0.5 });
  }
  o.push({ x: 0, z: L.letter.pedestalZ, r: 0.7 });
  for (const s of [-1, 1]) o.push({ x: s * 3.7, z: L.letter.pedestalZ, r: 0.4 });
  return o;
}

/**
 * The walking couple. The girl is steered by the visitor; the boy follows at
 * her side. Movement is clamped to the rooms, blocked by walls except through
 * the arched doorways, and pushed around the obstacles above.
 */
export function createCompanion(scene, L, items, timelineCount) {
  const couple = createCouple();
  scene.add(couple.root);
  const { girl, boy } = couple;

  const partitions = [FACADE_Z, L.entrance.z1, L.memories.z1, L.heart.z1, L.timeline.z1];
  const obstacles = buildObstacles(L, timelineCount);

  const input = { x: 0, y: 0, turn: 0 };
  let heading = 0;
  let nearby = null;

  function halfAt(z) {
    if (z > 0) return 11;
    if (z > L.entrance.z1) return 7;
    if (z > L.memories.z1) return 4;
    if (z > L.heart.z1) return 9;
    if (z > L.timeline.z1) return 4;
    return 4.5;
  }

  function roomAt(z) {
    if (z > L.entrance.z1) return 0;
    if (z > L.memories.z1) return 1;
    if (z > L.heart.z1) return 2;
    if (z > L.timeline.z1) return 3;
    return 4;
  }

  function clampInside(p, margin) {
    p.z = THREE.MathUtils.clamp(p.z, L.letter.z1 + margin, OUTSIDE_Z);
    const h = halfAt(p.z) - margin;
    p.x = THREE.MathUtils.clamp(p.x, -h, h);
  }

  /** Move a body by (dx, dz), respecting walls, doorways, obstacles and room edges. */
  function moveBody(p, dx, dz) {
    let nx = p.x + dx;
    let nz = p.z + dz;
    for (const zb of partitions) {
      const crossing = (p.z - zb) * (nz - zb) < 0;
      if (crossing && Math.abs(nx) > DOOR_HALF) nz = p.z;
    }
    const q = { x: nx, z: nz };
    clampInside(q, WALL_MARGIN);
    for (let k = 0; k < 2; k++) {
      for (const o of obstacles) {
        const ox = q.x - o.x;
        const oz = q.z - o.z;
        const d = Math.hypot(ox, oz);
        const min = o.r + 0.32;
        if (d < min && d > 1e-4) {
          q.x = o.x + (ox / d) * min;
          q.z = o.z + (oz / d) * min;
        }
      }
    }
    p.x = q.x;
    p.z = q.z;
  }

  const forward = (h = heading) => ({ x: Math.sin(h), z: -Math.cos(h) });
  const right = (h = heading) => ({ x: Math.cos(h), z: Math.sin(h) });

  /** Where the boy wants to stand: right beside the girl, a little behind her shoulder. */
  function boyTarget() {
    const f = forward();
    const r = right();
    return { x: girl.pos.x + r.x * 0.85 - f.x * 0.15, z: girl.pos.z + r.z * 0.85 - f.z * 0.15 };
  }

  function place(x, z, h = 0) {
    girl.pos = { x, z };
    clampInside(girl.pos, WALL_MARGIN);
    heading = h;
    const t = boyTarget();
    boy.pos = { x: t.x, z: t.z };
    clampInside(boy.pos, WALL_MARGIN);
    girl.angle = boy.angle = h;
    syncRoot(girl);
    syncRoot(boy);
  }

  function syncRoot(fig) {
    fig.root.position.set(fig.pos.x, 0, fig.pos.z);
  }

  function findNearby() {
    let best = null;
    let bestD = Infinity;
    for (const it of items) {
      const c = it.focus.center;
      const d = Math.hypot(c.x - girl.pos.x, c.z - girl.pos.z);
      const lim = NEAR[it.kind] ?? NEAR_DEFAULT;
      if (d < lim && d < bestD) {
        best = it;
        bestD = d;
      }
    }
    return best;
  }

  /**
   * Advance the couple by `dt`. When `active` (walk mode), the girl moves with
   * `input`. Returns the room index and the nearby item, or null.
   */
  function update(dt, t, active) {
    let moving = false;
    if (active) {
      heading += input.turn * TURN_RATE * dt;
      let ix = input.x;
      let iy = input.y;
      const m = Math.hypot(ix, iy);
      if (m > 1) {
        ix /= m;
        iy /= m;
      }
      const f = forward();
      const r = right();
      const mx = r.x * ix + f.x * iy;
      const mz = r.z * ix + f.z * iy;
      if (m > 0.05) {
        moving = true;
        const sp = SPEED * Math.min(1, m);
        moveBody(girl.pos, mx * sp * dt, mz * sp * dt);
        faceAngle(girl, Math.atan2(mx, mz), dt);
      }
    }

    // The girl turns to the boy when she stands still.
    if (!moving) faceAngle(girl, Math.atan2(boy.pos.x - girl.pos.x, boy.pos.z - girl.pos.z), dt);

    let boyMoving = false;
    if (active) {
      const tgt = boyTarget();
      const bx = tgt.x - boy.pos.x;
      const bz = tgt.z - boy.pos.z;
      const bd = Math.hypot(bx, bz);
      if (bd > 0.12) {
        boyMoving = true;
        const step = Math.min(SPEED * 1.08 * dt, bd * 2.2 * dt + 0.02);
        moveBody(boy.pos, (bx / bd) * step, (bz / bd) * step);
        faceAngle(boy, Math.atan2(bx, bz), dt);
      }
    }
    if (!boyMoving) faceAngle(boy, Math.atan2(girl.pos.x - boy.pos.x, girl.pos.z - boy.pos.z), dt);

    syncRoot(girl);
    syncRoot(boy);
    animateFigure(girl, dt, t, moving);
    animateFigure(boy, dt, t, boyMoving);

    // A small shared tilt while they stand close, so they seem to be listening to each other.
    const close = Math.hypot(boy.pos.x - girl.pos.x, boy.pos.z - girl.pos.z) < 1.4;
    const idle = !moving && !boyMoving && close;
    boy.head.rotation.z += ((idle ? 0.07 + Math.sin(t * 0.9) * 0.02 : 0) - boy.head.rotation.z) * Math.min(1, dt * 4);
    girl.head.rotation.z += ((idle ? -0.05 : 0) - girl.head.rotation.z) * Math.min(1, dt * 4);

    if (!active) return null;
    nearby = findNearby();
    return { room: roomAt(girl.pos.z), nearby };
  }

  /** Camera position and look target that frame the couple from behind. */
  function cameraTarget() {
    const f = forward();
    const r = right();
    const mid = { x: (girl.pos.x + boy.pos.x) / 2, z: (girl.pos.z + boy.pos.z) / 2 };
    const pos = { x: mid.x - f.x * 3.9 + r.x * 0.35, z: mid.z - f.z * 3.9 + r.z * 0.35 };
    clampInside(pos, 0.3);
    return {
      pos: new THREE.Vector3(pos.x, 2.05, pos.z),
      look: new THREE.Vector3(mid.x + f.x * 1.2, 1.25, mid.z + f.z * 1.2),
    };
  }

  /** Put the couple where the camera is looking, so walk mode starts from the current view. */
  function placeFromCamera(camPos, camLook) {
    const dx = camLook.x - camPos.x;
    const dz = camLook.z - camPos.z;
    const h = Math.atan2(dx, -dz);
    const f = forward(h);
    place(camPos.x + f.x * 3.6, camPos.z + f.z * 3.6, h);
  }

  place(1.2, -2.4, 0);

  return {
    couple,
    setInput(x, y, turn) {
      input.x = x;
      input.y = y;
      input.turn = turn;
    },
    turn(dx) {
      heading += dx;
    },
    get heading() {
      return heading;
    },
    place,
    placeFromCamera,
    update,
    cameraTarget,
    roomAt,
    nearbyItem: () => nearby,
    girlPosition: () => ({ x: girl.pos.x, z: girl.pos.z }),
  };
}
