import * as THREE from 'three';

/*
 * A jointed human figure in metres. Origin at the feet, front faces +z.
 *
 *   root (feet, heading)
 *   └ pelvis (hip height)
 *       ├ hip ─ knee ─ ankle ─ foot        (×2, solved by two-bone IK)
 *       ├ skirt (cloth, girl only)
 *       └ spine ── chest ── neck ── head ── hair chain (3 springy links)
 *                    └ shoulder ─ elbow ─ wrist ─ hand   (×2)
 *
 * Proportions follow an average adult: hip height ~0.93 m, shoulders ~0.30 m
 * above the pelvis, arms ~0.53 m, legs ~0.88 m.
 */

export const DIM = {
  thigh: 0.44,
  shin: 0.43,
  pelvisY: 0.98, // pelvis joint above the ground when standing
  hipX: 0.09,
  spineY: 0.04,
  shoulderY: 0.31,
  shoulderX: 0.19,
  upperArm: 0.29,
  forearm: 0.26,
  neckY: 0.36,
  headY: 0.13,
};

const PAL = {
  girl: { skin: 0xe6bfa2, hair: 0x4a2f22, blouse: 0xd9a08f, skirt: 0xc98a7d, shoe: 0x3b2c26, lip: 0xb9686a },
  boy: { skin: 0xdcb296, hair: 0x2b201b, shirt: 0xeae0cc, vest: 0x6d5a48, pants: 0x3f4a5a, shoe: 0x2a211d, lip: 0x9c6a5e },
};

function mat(color, roughness = 0.75) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
}

/**
 * A straight bone (capsule) with its joint at the top. `len` is the total
 * length including the rounded ends.
 */
function bone(len, r, material) {
  const joint = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.001, len - 2 * r), 6, 14), material);
  mesh.position.y = -len / 2;
  mesh.castShadow = true;
  joint.add(mesh);
  return joint;
}

function ellipsoid(rx, ry, rz, material, pos = [0, 0, 0]) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 22, 16), material);
  m.scale.set(rx, ry, rz);
  m.position.set(...pos);
  m.castShadow = true;
  return m;
}

/** Eyes, brows and lips, small enough to read as a face at the camera's distance. */
function face(head, kind, P) {
  const eye = mat(0x2a1d18, 0.4);
  for (const x of [-0.045, 0.045]) {
    head.add(ellipsoid(0.017, 0.02, 0.012, eye, [x, 0.012, 0.118]));
    head.add(ellipsoid(0.02, 0.012, 0.01, mat(0x3a2a22, 0.7), [x, 0.038, 0.112]));
  }
  head.add(ellipsoid(0.012, 0.022, 0.01, mat(0xd7a98e), [0, -0.012, 0.125]));
  head.add(ellipsoid(0.03, 0.009, 0.01, mat(P.lip, 0.5), [0, -0.058, 0.113]));
  if (kind === 'girl') {
    for (const x of [-0.07, 0.07]) head.add(ellipsoid(0.03, 0.02, 0.008, mat(0xe39a8b, 0.9), [x, -0.03, 0.105]));
  }
}

/** Build one figure. `kind`: 'girl' | 'boy'. */
export function buildFigure(kind) {
  const P = PAL[kind];
  const girl = kind === 'girl';
  const skin = mat(P.skin, 0.62);
  const hairM = mat(P.hair, 0.55);
  const shoe = mat(P.shoe, 0.45);

  const root = new THREE.Group();
  const pelvis = new THREE.Group();
  pelvis.position.y = DIM.pelvisY;
  root.add(pelvis);
  pelvis.add(ellipsoid(0.17, 0.11, 0.12, mat(girl ? P.skirt : P.pants), [0, -0.02, 0]));

  // legs: hip → knee → ankle; each joint is a pivot the IK drives
  const legMat = girl ? skin : mat(P.pants, 0.8);
  const legs = [-1, 1].map((side) => {
    const hip = new THREE.Group();
    hip.position.set(side * DIM.hipX, -0.02, 0);
    pelvis.add(hip);
    hip.add(bone(DIM.thigh, 0.085, legMat));
    const knee = new THREE.Group();
    knee.position.y = -DIM.thigh;
    hip.add(knee);
    knee.add(bone(DIM.shin, 0.068, legMat));
    const ankle = new THREE.Group();
    ankle.position.y = -DIM.shin;
    knee.add(ankle);
    // foot: heel-to-toe along +z, sitting on the ground when flat
    const foot = ellipsoid(0.055, 0.035, 0.13, shoe, [0, -0.035, 0.05]);
    ankle.add(foot);
    return { hip, knee, ankle, side };
  });

  // trousers or a bare-legged girl: keep the shins visible under a skirt
  if (!girl) {
    // boots
    for (const l of legs) l.ankle.add(ellipsoid(0.06, 0.05, 0.12, shoe, [0, -0.02, 0.04]));
  }

  // spine & chest
  const spine = new THREE.Group();
  spine.position.y = DIM.spineY;
  pelvis.add(spine);
  // the chest group is what breathes; its meshes keep their own shape
  const chest = new THREE.Group();
  spine.add(chest);
  const chestMat = girl ? mat(P.blouse, 0.8) : mat(P.shirt, 0.8);
  chest.add(ellipsoid(girl ? 0.165 : 0.19, girl ? 0.19 : 0.2, girl ? 0.12 : 0.13, chestMat, [0, DIM.shoulderY - 0.1, 0]));
  chest.add(ellipsoid(girl ? 0.14 : 0.17, 0.1, girl ? 0.1 : 0.11, chestMat, [0, 0.07, 0]));
  if (!girl) chest.add(ellipsoid(0.2, 0.2, 0.12, mat(P.vest, 0.85), [0, 0.2, 0.02]));

  // neck & head
  const neck = new THREE.Group();
  neck.position.y = DIM.neckY;
  spine.add(neck);
  neck.add(new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.06, 0.1, 14), skin));
  const head = new THREE.Group();
  head.position.y = DIM.headY + 0.04;
  neck.add(head);
  head.add(ellipsoid(0.1, 0.122, 0.112, skin, [0, 0.02, 0]));
  head.add(ellipsoid(0.105, 0.04, 0.11, skin, [0, -0.08, 0.01]));
  face(head, kind, P);

  // hair
  const hair = {};
  if (girl) {
    head.add(ellipsoid(0.112, 0.118, 0.115, hairM, [0, 0.035, -0.012]));
    head.add(ellipsoid(0.103, 0.06, 0.09, hairM, [0, 0.085, 0.03]));
    // long hair hangs as a chain of three springy links from the crown
    const chain = [];
    let parent = head;
    let y = 0.02;
    let z = -0.085;
    for (let i = 0; i < 3; i++) {
      const link = new THREE.Group();
      link.position.set(0, y, z);
      parent.add(link);
      link.add(bone(0.23, 0.07 - i * 0.008, hairM));
      chain.push(link);
      parent = link;
      y = -0.2;
      z = 0;
    }
    hair.chain = chain;
  } else {
    head.add(ellipsoid(0.116, 0.1, 0.12, hairM, [0, 0.06, -0.01]));
  }

  // arms: shoulder → elbow → wrist → hand
  const armMat = girl ? mat(P.blouse, 0.8) : mat(P.shirt, 0.8);
  const arms = [-1, 1].map((side) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * DIM.shoulderX, DIM.shoulderY, 0);
    spine.add(shoulder);
    shoulder.add(bone(DIM.upperArm, 0.05, armMat));
    const elbow = new THREE.Group();
    elbow.position.y = -DIM.upperArm;
    shoulder.add(elbow);
    elbow.add(bone(DIM.forearm, 0.043, skin));
    const wrist = new THREE.Group();
    wrist.position.y = -DIM.forearm;
    elbow.add(wrist);
    wrist.add(ellipsoid(0.04, 0.08, 0.028, skin, [0, -0.07, 0]));
    return { shoulder, elbow, wrist, side };
  });

  // skirt: a cloth tube whose rings lag behind the body (see cloth.js)
  let skirt = null;
  if (girl) {
    const skirtGeo = new THREE.CylinderGeometry(0.2, 0.42, 0.56, 28, 6, true);
    skirtGeo.translate(0, -0.28, 0);
    const base = skirtGeo.attributes.position.array.slice();
    const sk = new THREE.Mesh(skirtGeo, mat(P.skirt, 0.9));
    sk.material.side = THREE.DoubleSide;
    sk.castShadow = true;
    pelvis.add(sk);
    skirt = { mesh: sk, geo: skirtGeo, base, height: 0.56 };
  }

  // hands (a simple closed fist-ish ellipsoid on each wrist was added above)
  return {
    kind,
    root,
    pelvis,
    spine,
    chest,
    neck,
    head,
    legs,
    arms,
    hair,
    skirt,
    faceMats: { skin },
  };
}
