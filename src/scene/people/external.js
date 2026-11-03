import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { asset } from '../../core/assets.js';

/*
 * Optional: a character model supplied by the owner (public/models/girl.glb,
 * public/models/boy.glb). If a file is missing or fails to load, the procedural
 * figure stays in place, so nothing breaks.
 *
 * The model should be a standard glTF with an idle and a walk animation. Clip names
 * containing "idle" or "walk" (or "run") are used; without them the model stands still.
 */

const TARGET_HEIGHT = 1.7;
const loader = new GLTFLoader();

function load(url) {
  return new Promise((resolve) => {
    loader.load(
      url,
      (gltf) => resolve(gltf),
      undefined,
      () => resolve(null), // missing or unreadable: keep the procedural figure
    );
  });
}

/** Scale and centre the model so its feet are at y = 0 and it is TARGET_HEIGHT tall. */
function fit(scene) {
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const s = size.y > 0 ? TARGET_HEIGHT / size.y : 1;
  scene.scale.setScalar(s);
  const b2 = new THREE.Box3().setFromObject(scene);
  const c = b2.getCenter(new THREE.Vector3());
  scene.position.x -= c.x;
  scene.position.z -= c.z;
  scene.position.y -= b2.min.y;
  scene.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
}

/**
 * Try to attach an external model to `fig`. Resolves true when the model is in use.
 * On success, `fig.external = { mixer, idle, walk }` and the procedural body is hidden.
 */
export async function attachExternal(fig, name) {
  const gltf = await load(asset(`models/${name}.glb`));
  if (!gltf) return false;
  const model = gltf.scene;
  fit(model);
  fig.root.add(model);
  fig.procedural = fig.pelvis;
  fig.pelvis.visible = false;

  const mixer = new THREE.AnimationMixer(model);
  const clips = gltf.animations || [];
  const find = (re) => {
    const clip = clips.find((c) => re.test(c.name));
    return clip ? mixer.clipAction(clip) : null;
  };
  fig.external = {
    mixer,
    idle: find(/idle|stand/i),
    walk: find(/walk|run/i),
    current: null,
  };
  if (fig.external.idle) fig.external.idle.play();
  return true;
}

/** Cross-fade between the idle and walk clips, then advance the mixer. */
export function updateExternal(fig, dt, moving) {
  const e = fig.external;
  const want = moving ? e.walk || e.idle : e.idle || e.walk;
  if (want && want !== e.current) {
    want.reset().fadeIn(0.25).play();
    e.current?.fadeOut(0.25);
    e.current = want;
  }
  e.mixer.update(dt);
}
