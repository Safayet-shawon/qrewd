import * as THREE from 'three';

/*
 * Two stylised, procedural figures built from primitives (no external models).
 * Each figure's origin is at its feet and its front faces +z.
 */

const PAL = {
  girl: { skin: 0xe5bd9f, hair: 0x4a3024, blouse: 0xd9a08f, skirt: 0xc7877a, shoe: 0x3b2c26 },
  boy: { skin: 0xdcb296, hair: 0x2e2420, shirt: 0xeae0cc, vest: 0x6d5a48, pants: 0x3f4a5a, shoe: 0x2a211d },
};

const HIP_Y = 0.88;
const SHOULDER_Y = 1.36;
const LEG_LEN = 0.72;
const ARM_LEN = 0.5;

function material(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0 });
}

/** A capsule limb. Its origin is at the top, so it swings from the joint. */
function limb(len, r, mat) {
  const pivot = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 10), mat);
  mesh.position.y = -(len / 2 + r);
  mesh.castShadow = true;
  pivot.add(mesh);
  return pivot;
}

function piece(geo, mat, { x = 0, y = 0, z = 0, s = [1, 1, 1], rx = 0 } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.scale.set(...s);
  m.rotation.x = rx;
  m.castShadow = true;
  return m;
}

/** Builds one figure. `kind` is 'girl' or 'boy'. */
function figure(kind) {
  const c = PAL[kind];
  const isGirl = kind === 'girl';
  const skin = material(c.skin);
  const hair = material(c.hair);
  const shoe = material(c.shoe);

  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  // legs (girl: skin-coloured, under a skirt; boy: trousers)
  const legMat = material(isGirl ? c.skin : c.pants);
  const legs = [-0.11, 0.11].map((x) => {
    const leg = limb(LEG_LEN, 0.075, legMat);
    leg.position.set(x, HIP_Y, 0);
    leg.add(piece(new THREE.BoxGeometry(0.13, 0.09, 0.22), shoe, { y: -HIP_Y + 0.05, z: 0.03 }));
    body.add(leg);
    return leg;
  });

  // torso
  const torsoMat = material(isGirl ? c.blouse : c.shirt);
  const torso = piece(new THREE.CapsuleGeometry(isGirl ? 0.165 : 0.19, 0.3, 4, 12), torsoMat, { y: 1.1 });
  body.add(torso);
  if (isGirl) {
    body.add(piece(new THREE.CylinderGeometry(0.2, 0.36, 0.5, 20), material(c.skirt), { y: 0.72 }));
  } else {
    body.add(piece(new THREE.CapsuleGeometry(0.2, 0.28, 4, 12), material(c.vest), { y: 1.12, s: [1, 1, 0.62] }));
  }

  // arms
  const armMat = torsoMat;
  const arms = [-1, 1].map((side) => {
    const arm = limb(ARM_LEN, 0.05, armMat);
    arm.position.set(side * (isGirl ? 0.22 : 0.25), SHOULDER_Y, 0);
    arm.rotation.z = side * -0.12;
    arm.add(piece(new THREE.SphereGeometry(0.058, 10, 8), skin, { y: -(ARM_LEN + 0.1) }));
    body.add(arm);
    return arm;
  });

  // neck + head
  body.add(piece(new THREE.CylinderGeometry(0.055, 0.06, 0.12, 10), skin, { y: 1.5 }));
  const head = new THREE.Group();
  head.position.set(0, 1.6, 0);
  body.add(head);
  head.add(piece(new THREE.SphereGeometry(0.125, 20, 16), skin));
  if (isGirl) {
    head.add(piece(new THREE.SphereGeometry(0.14, 18, 14), hair, { y: 0.03, z: -0.012, s: [1, 1.08, 1.05] }));
    head.add(piece(new THREE.CapsuleGeometry(0.11, 0.3, 4, 10), hair, { y: -0.2, z: -0.08 }));
  } else {
    head.add(piece(new THREE.SphereGeometry(0.132, 18, 14), hair, { y: 0.05, s: [1, 0.72, 1.04] }));
  }

  return {
    kind,
    root,
    body,
    head,
    torso,
    legs,
    arms,
    pos: { x: 0, z: 0 },
    angle: 0,
    phase: 0,
    amp: 0,
  };
}

/** Creates the couple. Call `place()` on the returned object to position them. */
export function createCouple() {
  const root = new THREE.Group();
  const girl = figure('girl');
  const boy = figure('boy');
  root.add(girl.root, boy.root);
  return { root, girl, boy };
}

/** Swing limbs while `moving`, breathe while standing. */
export function animateFigure(fig, dt, t, moving) {
  fig.amp += ((moving ? 1 : 0) - fig.amp) * Math.min(1, dt * 8);
  fig.phase += dt * (moving ? 7.5 : 3);
  const s = Math.sin(fig.phase);
  fig.legs[0].rotation.x = s * 0.5 * fig.amp;
  fig.legs[1].rotation.x = -s * 0.5 * fig.amp;
  fig.arms[0].rotation.x = -s * 0.38 * fig.amp;
  fig.arms[1].rotation.x = s * 0.38 * fig.amp;
  fig.body.position.y = Math.abs(s) * 0.03 * fig.amp;
  fig.torso.scale.y = 1 + Math.sin(t * 1.7) * 0.012 * (1 - fig.amp);
}

/** Turn a figure towards `target` (radians) smoothly. */
export function faceAngle(fig, target, dt) {
  let d = target - fig.angle;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  fig.angle += d * Math.min(1, dt * 9);
  fig.root.rotation.y = fig.angle;
}
