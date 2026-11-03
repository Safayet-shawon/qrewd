import * as THREE from 'three';
import { buildFigure, DIM } from './figure.js';

/*
 * Motion for the two people: gait with foot IK, springy hair, cloth skirt,
 * hands held when they stand together, and heads turning to look at each other.
 * Everything here is driven by real quantities (speed, acceleration, wind), so
 * the secondary motion follows whatever the body is doing.
 */

const GROUND_ANKLE_Y = 0.075; // ankle joint height above the floor
const TWO_PI = Math.PI * 2;
const Y_DOWN = new THREE.Vector3(0, -1, 0);

/* ───────────── springs ───────────── */

/** A damped spring: x is pulled towards `target` with stiffness k and damping c. */
export class Spring {
  constructor(k = 60, c = 9) {
    this.x = 0;
    this.v = 0;
    this.k = k;
    this.c = c;
  }
  step(target, dt) {
    const a = this.k * (target - this.x) - this.c * this.v;
    this.v += a * dt;
    this.x += this.v * dt;
    return this.x;
  }
}

/* ───────────── two-bone IK in the sagittal plane ───────────── */

/**
 * Solve hip and knee so the ankle reaches (tz, ty) relative to the hip joint.
 * Forward is +z, down is -y. Writes the rotations straight onto the joints.
 */
export function solveLeg(leg, tz, ty) {
  const a = DIM.thigh;
  const b = DIM.shin;
  let d = Math.hypot(tz, ty);
  const maxD = a + b - 0.004;
  if (d > maxD) {
    tz *= maxD / d;
    ty *= maxD / d;
    d = maxD;
  }
  const phi = Math.atan2(tz, -ty); // thigh direction if the leg were straight
  const cosAlpha = (a * a + d * d - b * b) / (2 * a * d);
  const alpha = Math.acos(THREE.MathUtils.clamp(cosAlpha, -1, 1));
  const cosKnee = (a * a + b * b - d * d) / (2 * a * b);
  const knee = Math.PI - Math.acos(THREE.MathUtils.clamp(cosKnee, -1, 1)); // 0 = straight

  const thighF = phi + alpha; // forward angle of the thigh from straight down
  const shinF = thighF - knee; // forward angle of the shin
  leg.hip.rotation.x = -thighF;
  leg.knee.rotation.x = knee;
  leg.ankle.rotation.x = -(Math.PI / 2 - shinF); // keep the foot flat on the floor
}

/* ───────────── gait & idle ───────────── */

/**
 * Animate one person. `moving` is a bool, `speed` m/s, `wind` a world-space
 * horizontal vector (m/s), and `phase` is advanced here.
 */
export function animatePerson(fig, dt, t, { moving, speed, wind }) {
  fig.amp += ((moving ? 1 : 0) - fig.amp) * Math.min(1, dt * 7);
  const stepRate = moving ? (speed / 0.72) * TWO_PI : 0; // one cycle = two steps
  fig.phase += stepRate * dt;

  const amp = fig.amp;
  const stride = Math.min(0.3, speed * 0.13) * amp; // how far each foot reaches
  const bob = 0.022 * Math.cos(2 * fig.phase) * amp;
  const pelvisY = DIM.pelvisY + bob + 0.012 * Math.sin(t * 1.2) * (1 - amp); // idle weight shift
  fig.pelvis.position.y = pelvisY;
  fig.pelvis.rotation.y = 0.06 * Math.sin(fig.phase) * amp;

  // feet: each planted foot stays put while the other swings forward
  fig.legs.forEach((leg, i) => {
    const p = fig.phase + (leg.side > 0 ? Math.PI : 0);
    const tz = stride * Math.cos(p);
    const lift = 0.07 * Math.max(0, -Math.sin(p)) * amp;
    // ankle height in the pelvis frame, then relative to the hip joint (which sits 0.02 below the pelvis)
    const ankleY = GROUND_ANKLE_Y + lift - pelvisY;
    solveLeg(leg, tz, ankleY + 0.02);
  });

  // spine: slight forward lean with speed, breathing on the chest
  fig.spine.rotation.x = -0.035 * amp;
  fig.chest.scale.y = 1 + 0.012 * Math.sin(t * 1.7);

  // arms: swing opposite to the legs; relax when standing; hold when `fig.hold` is 0
  fig.arms.forEach((arm) => {
    const p = fig.phase + (arm.side > 0 ? 0 : Math.PI); // opposite the leg on the same side
    const swing = -Math.sin(p) * 0.34 * amp;
    arm.shoulder.rotation.set(swing, 0, -arm.side * (0.1 + 0.02 * Math.sin(t * 1.7)), 'XYZ');
    arm.elbow.rotation.x = -0.18 - 0.18 * amp * Math.max(0, -Math.sin(p));
    arm.wrist.rotation.x = -0.05 * amp;
  });

  // head: keep gaze level against the body's bob, a tiny idle drift
  fig.head.rotation.x = -fig.spine.rotation.x * 0.8 + 0.02 * Math.sin(t * 0.6);
  fig.head.rotation.y += ((fig.lookYaw || 0) - fig.head.rotation.y) * Math.min(1, dt * 3);
  fig.head.rotation.z = 0.02 * Math.sin(t * 0.37);

  animateHair(fig, dt, wind);
  animateSkirt(fig, dt, wind);
}

/* ───────────── hair: three springy links ───────────── */

function animateHair(fig, dt, wind) {
  if (!fig.hair.chain) return;
  const { accF, accR, windF, windR } = fig.dyn;
  fig.hair.springs = fig.hair.springs || fig.hair.chain.map(() => ({ x: new Spring(70, 8), z: new Spring(70, 8) }));
  fig.hair.chain.forEach((link, i) => {
    const k = 1 + i * 0.6; // lower links swing more
    const sx = fig.hair.springs[i].x;
    const sz = fig.hair.springs[i].z;
    // backward swing when the body accelerates forward; wind pushes the other way
    const tx = (accF * 0.045 - windF * 0.05) * k;
    const tz = (accR * 0.03 - windR * 0.04) * k;
    link.rotation.x = sx.step(tx, dt);
    link.rotation.z = sz.step(tz, dt);
  });
}

/* ───────────── skirt: cloth rows that lag and billow ───────────── */

function animateSkirt(fig, dt, wind) {
  const s = fig.skirt;
  if (!s) return;
  const rows = 7; // heightSegments + 1
  if (!s.springs) s.springs = Array.from({ length: rows }, () => ({ x: new Spring(38, 5.5), z: new Spring(38, 5.5) }));
  const { accF, accR, windF, windR } = fig.dyn;
  const flutter = Math.sin(fig.time * 2.3) * 0.004;
  const dispX = [];
  const dispZ = [];
  for (let r = 0; r < rows; r++) {
    const f = r / (rows - 1); // 0 at the waist, 1 at the hem
    const w = f * f; // the hem moves most
    dispX.push(s.springs[r].x.step((-accR * 0.09 + windR * 0.07) * w + flutter * w, dt));
    dispZ.push(s.springs[r].z.step((-accF * 0.07 - windF * 0.08) * w, dt));
  }
  const pos = s.geo.attributes.position;
  const base = s.base;
  for (let i = 0; i < pos.count; i++) {
    const by = base[i * 3 + 1];
    const f = THREE.MathUtils.clamp(-by / s.height, 0, 1) * (rows - 1);
    const r0 = Math.floor(f);
    const r1 = Math.min(rows - 1, r0 + 1);
    const t = f - r0;
    const dx = dispX[r0] * (1 - t) + dispX[r1] * t;
    const dz = dispZ[r0] * (1 - t) + dispZ[r1] * t;
    pos.array[i * 3] = base[i * 3] + dx;
    pos.array[i * 3 + 2] = base[i * 3 + 2] + dz;
  }
  pos.needsUpdate = true;
  s.geo.computeVertexNormals();
}

/* ───────────── holding hands ───────────── */

const _v = new THREE.Vector3();
const _qp = new THREE.Quaternion();
const _qi = new THREE.Quaternion();
const _qAim = new THREE.Quaternion();
const _qRest = new THREE.Quaternion();

/**
 * Aim one arm at a world-space point with a two-bone solve: the upper arm points
 * at the target and the elbow bends by the law of cosines. Blends with `w`.
 */
export function aimArm(fig, arm, target, w) {
  if (w <= 0.001) return;
  arm.shoulder.getWorldPosition(_v);
  const dir = _v.subVectors(target, _v);
  const a = DIM.upperArm;
  const b = DIM.forearm;
  const L = THREE.MathUtils.clamp(dir.length(), 0.12, a + b - 0.01);
  // the target in the shoulder's parent frame
  fig.spine.getWorldQuaternion(_qp);
  _qi.copy(_qp).invert();
  dir.normalize().applyQuaternion(_qi);
  _qAim.setFromUnitVectors(Y_DOWN, dir);
  // rest pose of the upper arm, then blend in the aim
  _qRest.copy(arm.shoulder.quaternion);
  arm.shoulder.quaternion.copy(_qRest).slerp(_qAim, w);
  const cosE = (a * a + b * b - L * L) / (2 * a * b);
  const flex = Math.PI - Math.acos(THREE.MathUtils.clamp(cosE, -1, 1));
  arm.elbow.rotation.x = THREE.MathUtils.lerp(arm.elbow.rotation.x, -flex, w);
}

/** Which of `fig`'s arms is nearest to `point` (world). */
function nearestArm(fig, point) {
  let best = fig.arms[0];
  let bestD = Infinity;
  for (const arm of fig.arms) {
    arm.wrist.getWorldPosition(_v);
    const d = _v.distanceTo(point);
    if (d < bestD) {
      bestD = d;
      best = arm;
    }
  }
  return best;
}

/**
 * Both reach for the same point between them, at hand height. `w` (0..1) is the
 * blend, so the hands come together and let go smoothly.
 */
export function holdHands(girl, boy, w) {
  const mid = new THREE.Vector3((girl.pos.x + boy.pos.x) / 2, 1.0, (girl.pos.z + boy.pos.z) / 2);
  const gArm = nearestArm(girl, boy.root.position.clone().setY(1));
  const bArm = nearestArm(boy, girl.root.position.clone().setY(1));
  aimArm(girl, gArm, mid, w);
  aimArm(boy, bArm, mid, w);
  // Each looks at the other: the head yaw is the bearing to the partner, relative to the body.
  girl.lookYaw = bearingYaw(girl, boy) * 0.6 * w;
  boy.lookYaw = bearingYaw(boy, girl) * 0.6 * w;
}

function bearingYaw(fig, other) {
  const bearing = Math.atan2(other.pos.x - fig.pos.x, other.pos.z - fig.pos.z);
  let d = bearing - fig.angle;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  return THREE.MathUtils.clamp(d, -1.1, 1.1);
}

/* ───────────── facing ───────────── */

export function faceAngle(fig, target, dt) {
  let d = target - fig.angle;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  fig.angle += d * Math.min(1, dt * 9);
  fig.root.rotation.y = fig.angle;
}

/* ───────────── the couple ───────────── */

export function createPerson(kind) {
  const f = buildFigure(kind);
  Object.assign(f, {
    pos: { x: 0, z: 0 },
    prev: { x: 0, z: 0 },
    angle: 0,
    phase: 0,
    amp: 0,
    hold: 0,
    lookYaw: 0,
    time: 0,
    dyn: { accF: 0, accR: 0, windF: 0, windR: 0 },
    vel: { x: 0, z: 0 },
  });
  return f;
}

export function createCouple() {
  const root = new THREE.Group();
  const girl = createPerson('girl');
  const boy = createPerson('boy');
  root.add(girl.root, boy.root);
  return { root, girl, boy };
}

/**
 * Work out the body-frame accelerations the springs react to, from the change
 * in position. `wind` is the world wind vector.
 */
export function updateDynamics(fig, dt, wind) {
  const vx = (fig.pos.x - fig.prev.x) / Math.max(dt, 1e-4);
  const vz = (fig.pos.z - fig.prev.z) / Math.max(dt, 1e-4);
  const ax = (vx - fig.vel.x) / Math.max(dt, 1e-4);
  const az = (vz - fig.vel.z) / Math.max(dt, 1e-4);
  fig.vel.x = vx;
  fig.vel.z = vz;
  fig.prev.x = fig.pos.x;
  fig.prev.z = fig.pos.z;
  // body frame (heading fig.angle)
  const fx = Math.sin(fig.angle);
  const fz = -Math.cos(fig.angle);
  const rx = Math.cos(fig.angle);
  const rz = Math.sin(fig.angle);
  // clamp so a bad frame cannot blow the springs up
  const c = (v) => THREE.MathUtils.clamp(v, -6, 6);
  fig.dyn.accF = c(ax * fx + az * fz);
  fig.dyn.accR = c(ax * rx + az * rz);
  fig.dyn.windF = wind.x * fx + wind.z * fz;
  fig.dyn.windR = wind.x * rx + wind.z * rz;
  fig.time += dt;
  return Math.hypot(vx, vz);
}
