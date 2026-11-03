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
  // girl: pink hijab, long red kurta, cream flats
  girl: { skin: 0xe6bfa2, hair: 0x2a1f1b, blouse: 0xa8152f, skirt: 0xb0162f, scarf: 0xf3c9d2, shoe: 0xeee2cc, lip: 0xb9686a },
  // boy: black button shirt, grey trousers, black belt, white sneakers, glasses, short beard
  boy: { skin: 0xdcb296, hair: 0x14110f, shirt: 0x1d2025, beard: 0x1a1412, pants: 0x4a4f58, belt: 0x161616, shoe: 0xf2f2ef, frame: 0x1c1c1c, lip: 0x9c6a5e },
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

/**
 * A human face built from anatomical landmarks: brow ridge, eye sockets with
 * whites, iris and lids, a nose with a bridge and nostrils, lips with a parting,
 * and ears. Everything is a small ellipsoid so it deforms gracefully when scaled.
 */
function face(head, kind, P) {
  const white = mat(0xf1ebe4, 0.25);
  const iris = mat(kind === 'girl' ? 0x5a3a24 : 0x3b2c20, 0.3);
  const pupil = mat(0x0d0907, 0.2);
  const lid = mat(P.skin, 0.55);
  const brow = mat(P.hair, 0.8);
  const lip = mat(P.lip, 0.45);
  const lipDark = mat(0x4a2a24, 0.6);
  const nostril = mat(0x8a5a4a, 0.7);

  for (const sx of [-1, 1]) {
    const x = sx * 0.036;
    // eyeball, slightly protruding and set into the socket
    head.add(ellipsoid(0.019, 0.016, 0.014, white, [x, 0.012, 0.088]));
    head.add(ellipsoid(0.0095, 0.0095, 0.006, iris, [x, 0.012, 0.1]));
    head.add(ellipsoid(0.0045, 0.0045, 0.004, pupil, [x, 0.012, 0.104]));
    // upper and lower lid edges
    head.add(ellipsoid(0.021, 0.006, 0.012, lid, [x, 0.024, 0.088]));
    head.add(ellipsoid(0.019, 0.003, 0.01, mat(0x9a6a58, 0.8), [x, 0.001, 0.09]));
    // brow, arched and tapered toward the outside
    const br = ellipsoid(0.03, 0.0065, 0.008, brow, [x, 0.045, 0.082]);
    br.rotation.z = -sx * 0.18;
    head.add(br);
  }
  // nose: bridge, tip, wings and nostrils
  head.add(ellipsoid(0.011, 0.034, 0.012, lid, [0, -0.012, 0.102]));
  head.add(ellipsoid(0.016, 0.011, 0.014, lid, [0, -0.04, 0.106]));
  for (const sx of [-1, 1]) {
    head.add(ellipsoid(0.007, 0.006, 0.006, lid, [sx * 0.012, -0.045, 0.1]));
    head.add(ellipsoid(0.0035, 0.0025, 0.003, nostril, [sx * 0.006, -0.05, 0.106]));
  }
  // cheekbones and philtrum: soft volume that catches the light
  for (const sx of [-1, 1]) head.add(ellipsoid(0.026, 0.02, 0.014, lid, [sx * 0.055, -0.012, 0.072]));
  // mouth: upper lip with a cupid's bow, lower lip, the parting between them
  head.add(ellipsoid(0.024, 0.005, 0.009, lip, [-0.008, -0.07, 0.094]));
  head.add(ellipsoid(0.024, 0.005, 0.009, lip, [0.008, -0.07, 0.094]));
  head.add(ellipsoid(0.022, 0.0055, 0.01, lip, [0, -0.085, 0.092]));
  head.add(ellipsoid(0.02, 0.0025, 0.005, lipDark, [0, -0.079, 0.1]));
  // ears
  for (const sx of [-1, 1]) {
    head.add(ellipsoid(0.013, 0.026, 0.011, lid, [sx * 0.094, -0.005, 0.005]));
  }
}

/** Build one figure. `kind`: 'girl' | 'boy'. */
export function buildFigure(kind) {
  const P = PAL[kind];
  const girl = kind === 'girl';
  const skin = new THREE.MeshPhysicalMaterial({ color: P.skin, roughness: 0.5, metalness: 0, clearcoat: 0.15, clearcoatRoughness: 0.45, sheen: 0.2, sheenColor: new THREE.Color(0xffd8c0) });
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


  if (!girl) {
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.175, 0.045, 28), mat(P.belt, 0.4));
    belt.position.y = 0.07;
    pelvis.add(belt);
  }

  // neck & head
  const neck = new THREE.Group();
  neck.position.y = DIM.neckY;
  spine.add(neck);
  neck.add(new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.06, 0.1, 14), skin));
  const head = new THREE.Group();
  head.position.y = DIM.headY + 0.04;
  neck.add(head);
  head.add(ellipsoid(0.094, 0.114, 0.103, skin, [0, 0.022, -0.005])); // cranium
  head.add(ellipsoid(0.085, 0.07, 0.092, skin, [0, -0.045, 0.012])); // lower face and jaw
  head.add(ellipsoid(0.04, 0.026, 0.03, skin, [0, -0.1, 0.07])); // chin
  face(head, kind, P);

  // hair and head covering
  const hair = {};
  if (girl) {
    // hijab: a soft cap that covers the crown, a fringe line, and a scarf dropping over the shoulders
    const scarf = mat(P.scarf, 0.85);
    head.add(ellipsoid(0.108, 0.122, 0.112, scarf, [0, 0.03, -0.018]));
    head.add(ellipsoid(0.1, 0.09, 0.1, scarf, [0, 0.045, -0.07]));
    head.add(ellipsoid(0.12, 0.09, 0.07, scarf, [0, -0.02, -0.1]));
    spine.add(ellipsoid(0.2, 0.2, 0.09, scarf, [0, 0.13, -0.11]));
    spine.add(ellipsoid(0.17, 0.12, 0.05, scarf, [0, 0.12, 0.11]));
  } else {
    // short curly hair with a little volume on top
    head.add(ellipsoid(0.1, 0.108, 0.104, hairM, [0, 0.042, -0.012]));
    for (const [x, y, z] of [[-0.05, 0.1, 0.03], [0.02, 0.11, 0.04], [0.06, 0.09, 0.02], [-0.02, 0.12, -0.02], [0.04, 0.12, -0.04]]) {
      head.add(ellipsoid(0.036, 0.03, 0.034, hairM, [x, y, z]));
    }
    // short beard along the jaw
    const beardM = mat(P.beard, 0.9);
    head.add(ellipsoid(0.088, 0.05, 0.085, beardM, [0, -0.072, 0.012]));
    head.add(ellipsoid(0.04, 0.03, 0.03, beardM, [0, -0.1, 0.07]));
    // glasses: two thin rims and a bridge
    const frameM = mat(P.frame, 0.35);
    for (const sx of [-1, 1]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.0045, 8, 24), frameM);
      rim.scale.set(1.15, 0.9, 1);
      rim.position.set(sx * 0.037, 0.014, 0.1);
      head.add(rim);
    }
    head.add(ellipsoid(0.012, 0.0045, 0.0045, frameM, [0, 0.02, 0.105]));
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
    const skirtGeo = new THREE.CylinderGeometry(0.2, 0.44, 0.8, 28, 8, true);
    skirtGeo.translate(0, -0.4, 0);
    const base = skirtGeo.attributes.position.array.slice();
    const sk = new THREE.Mesh(skirtGeo, mat(P.skirt, 0.9));
    sk.material.side = THREE.DoubleSide;
    sk.castShadow = true;
    pelvis.add(sk);
    skirt = { mesh: sk, geo: skirtGeo, base, height: 0.8 };
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
