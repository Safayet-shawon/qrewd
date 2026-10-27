import * as THREE from 'three';
import gsap from 'gsap';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Emitter } from '../core/emitter.js';
import { reducedMotion } from '../core/env.js';
import { Batcher, matrix, partitionGeometry, archRingGeometry, DOOR } from './architecture.js';
import { createMaterials } from './materials.js';
import { LightPool } from './lighting.js';
import { CameraRig } from './cameraRig.js';
import { createDust, createEmbers } from './particles.js';
import { ImageStore } from './frames.js';
import { createCompanion } from './companion.js';
import { skyTexture } from './textures.js';
import { buildEntrance } from './rooms/entrance.js';
import { buildGallery } from './rooms/gallery.js';
import { buildHeartRoom } from './rooms/heartRoom.js';
import { buildTimeline } from './rooms/timeline.js';
import { buildLetterRoom } from './rooms/letterRoom.js';

export const ROOM_KEYS = ['entrance', 'memories', 'heart', 'timeline', 'letter'];

function computeLayout(content) {
  const nM = content.memories.length;
  const nT = content.timeline.length;
  const entrance = { key: 'entrance', z0: 0, z1: -16, half: 7, h: 6.5, plaque: { z: -7 } };
  const memSpacing = 2.9;
  const memories = { key: 'memories', z0: entrance.z1, half: 4, h: 5.4, spacing: memSpacing };
  memories.z1 = memories.z0 - (nM ? 6.8 + (nM - 1) * memSpacing : 8);
  const heart = { key: 'heart', z0: memories.z1, half: 9, h: 8 };
  heart.z1 = heart.z0 - 18;
  heart.zc = (heart.z0 + heart.z1) / 2;
  const tlSpacing = 3.3;
  const timeline = { key: 'timeline', z0: heart.z1, half: 4, h: 5.4, spacing: tlSpacing };
  timeline.z1 = timeline.z0 - (nT ? 7.4 + (nT - 1) * tlSpacing : 8);
  const letter = { key: 'letter', z0: timeline.z1, half: 4.5, h: 5.6 };
  letter.z1 = letter.z0 - 14;
  letter.pedestalZ = letter.z1 + 3.9;
  return { entrance, memories, heart, timeline, letter };
}

function fovFor(aspect) {
  return THREE.MathUtils.clamp(46 + (1.4 - aspect) * 30, 46, 72);
}

/**
 * Builds the whole museum. Returns a controller; nothing here touches the DOM
 * except the canvas it is given.
 */
export async function createMuseum(canvas, content, quality) {
  const events = new Emitter();
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: quality.antialias,
    powerPreference: 'high-performance',
    alpha: false,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = quality.shadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  let dpr = quality.dpr;
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  scene.background = skyTexture();
  scene.fog = new THREE.FogExp2(0x6a584b, 0.0085);
  const root = new THREE.Group();
  scene.add(root);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.18;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 220);
  const rig = new CameraRig(camera);

  const hemi = new THREE.HemisphereLight(0xfff0da, 0xb7a086, 0.62);
  scene.add(hemi);

  const lights = new LightPool(scene, quality.lights, { shadows: quality.shadows });
  const mats = createMaterials(quality);
  // Metals look flat without something to reflect: give them the room environment directly.
  for (const m of [mats.champagne, mats.roseGold]) {
    m.envMap = envRT.texture;
    m.envMapIntensity = 1.5;
  }
  const images = new ImageStore(renderer);
  const L = computeLayout(content);

  const state = { reveal: 0.3, entered: false, locked: true, stop: 0, focused: null, time: 0, walk: false };
  const dustUniformsPx = [];
  const ctx = {
    root,
    mats,
    lights,
    content,
    images,
    q: quality,
    batch: null,
    items: [],
    updaters: [],
    disposables: [],
    refs: {},
    reduced: reducedMotion,
    addEmbers(center) {
      const e = createEmbers(quality.embers, center);
      root.add(e);
      dustUniformsPx.push(e.material.uniforms.uPx);
      ctx.updaters.push((dt, t) => {
        e.material.uniforms.uTime.value = ctx.reduced() ? 0 : t;
      });
      ctx.disposables.push(e.geometry, e.material);
    },
  };

  /* ───────────── Build ───────────── */
  const blockers = [];
  const room = (fn) => {
    ctx.batch = new Batcher();
    fn(ctx, L);
    ctx.batch.build(root, blockers);
  };
  room(buildEntrance);
  room(buildGallery);
  room(buildHeartRoom);
  room(buildTimeline);
  room(buildLetterRoom);

  // partitions between rooms (with arched doorways)
  ctx.batch = new Batcher();
  const parts = [
    [L.entrance.z1, Math.max(L.entrance.half, L.memories.half), Math.max(L.entrance.h, L.memories.h)],
    [L.memories.z1, Math.max(L.memories.half, L.heart.half), Math.max(L.memories.h, L.heart.h)],
    [L.heart.z1, Math.max(L.heart.half, L.timeline.half), Math.max(L.heart.h, L.timeline.h)],
    [L.timeline.z1, Math.max(L.timeline.half, L.letter.half), Math.max(L.timeline.h, L.letter.h)],
  ];
  for (const [z, half, h] of parts) {
    ctx.batch.add(partitionGeometry({ width: half * 2 + 1.1, height: h, thickness: 0.6 }), mats.plaster, matrix(0, 0, z), { cast: true });
    for (const dz of [0.3, -0.4]) {
      ctx.batch.add(archRingGeometry({ innerHalf: DOOR.w / 2, spring: DOOR.spring, border: 0.24, depth: 0.1 }), mats.trim, matrix(0, 0, z + dz), { cast: true });
    }
  }
  ctx.batch.build(root, blockers);

  /* dust */
  const dust = createDust(quality.dust);
  root.add(dust);
  dustUniformsPx.push(dust.material.uniforms.uPx);
  ctx.disposables.push(dust.geometry, dust.material);

  /* ───────────── Stops (the guided route) ───────────── */
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const names = content.rooms;
  const stops = [];
  const addStop = (s) => stops.push({ ...s, index: stops.length, roomIndex: ROOM_KEYS.indexOf(s.room) });

  addStop({
    room: 'entrance',
    label: names.entrance.name,
    pos: V(0, 1.7, -3.5),
    look: V(0, 1.55, L.entrance.plaque.z - 4),
    featured: ctx.refs.plaque,
    cue: 'Read the plaque',
  });
  const memItems = ctx.items.filter((i) => i.kind === 'memory');
  if (!memItems.length) {
    addStop({ room: 'memories', label: names.memories.name, pos: V(0, 1.65, L.memories.z0 - 3), look: V(0, 1.65, L.memories.z1), featured: null });
  }
  memItems.forEach((item, i) => {
    const side = item.focus.center.x < 0 ? -1 : 1;
    const z = item.focus.center.z;
    addStop({
      room: 'memories',
      label: `${names.memories.name} · ${i + 1} of ${memItems.length}`,
      pos: V(-side * 0.35, 1.66, z + 1.5),
      look: V(side * L.memories.half, 1.62, z - 0.3),
      featured: item,
      cue: 'View photograph',
    });
  });
  addStop({
    room: 'heart',
    label: names.heart.name,
    pos: V(0, 2.2, L.heart.zc + 6.9),
    look: V(0, 2.65, L.heart.zc - 1),
    featured: ctx.refs.heart.item,
    cue: 'Touch the heart',
  });
  const tlItems = ctx.items.filter((i) => i.kind === 'milestone');
  if (!tlItems.length) {
    addStop({ room: 'timeline', label: names.timeline.name, pos: V(0, 1.65, L.timeline.z0 - 3), look: V(0, 1.65, L.timeline.z1), featured: null });
  }
  tlItems.forEach((item, i) => {
    const side = item.focus.center.x < 0 ? -1 : 1;
    const z = item.focus.center.z;
    addStop({
      room: 'timeline',
      label: `${names.timeline.name} · ${i + 1} of ${tlItems.length}`,
      pos: V(-side * 0.45, 1.68, z + 1.9),
      look: V(side * 3.2, 1.5, z - 0.2),
      featured: item,
      cue: 'Open this moment',
    });
  });
  addStop({
    room: 'letter',
    label: names.letter.name,
    pos: V(0, 1.7, L.letter.pedestalZ + 3.7),
    look: V(0, 1.35, L.letter.pedestalZ),
    featured: ctx.refs.letter.item,
    cue: 'Open the letter',
  });

  const rooms = ROOM_KEYS.map((key, i) => ({
    key,
    index: i,
    name: names[key].name,
    blurb: names[key].blurb,
    firstStop: stops.findIndex((s) => s.room === key),
  }));

  /* ───────────── The couple (walk mode) ───────────── */
  const companion = createCompanion(scene, L, ctx.items, content.timeline.length);
  let lastRoom = -1;
  let lastNearby = null;

  /* ───────────── Pose before entering: outside, doors closed ───────────── */
  const outsidePos = V(0, 1.7, 24);
  const outsideLook = V(0, 1.7, 0);
  rig.set(outsidePos, outsideLook);
  rig.drift.amp = 0.35;

  /* ───────────── Sizing ───────────── */
  let W = 1;
  let H = 1;
  const pxUniform = () => dpr * Math.max(0.6, H / 900);
  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.fov = fovFor(camera.aspect);
    camera.updateProjectionMatrix();
    dustUniformsPx.forEach((u) => (u.value = pxUniform()));
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  window.addEventListener('orientationchange', resize);
  resize();

  /* ───────────── Picking & drag-to-look ───────────── */
  const pickables = ctx.items.flatMap((i) => i.meshes);
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hovered = null;

  function pick(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(pickables, false);
    if (!hits.length) return null;
    const first = hits[0];
    const block = ray.intersectObjects(blockers, false)[0];
    if (block && block.distance < first.distance - 0.02) return null;
    return first.object.userData.item || null;
  }

  function setHovered(item) {
    if (item === hovered) return;
    hovered?.setHover?.(false);
    hovered = item;
    hovered?.setHover?.(true);
    canvas.style.cursor = item ? 'pointer' : state.locked ? 'default' : 'grab';
    events.emit('hover', item);
  }

  const ptr = { down: false, id: -1, x: 0, y: 0, sx: 0, sy: 0, t: 0, moved: false };
  let hoverQueued = false;
  let lastMove = null;

  function onDown(e) {
    if (state.locked || !e.isPrimary) return;
    ptr.down = true;
    ptr.id = e.pointerId;
    ptr.x = ptr.sx = e.clientX;
    ptr.y = ptr.sy = e.clientY;
    ptr.t = performance.now();
    ptr.moved = false;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* not fatal */
    }
    if (e.pointerType !== 'mouse') {
      // touch: highlight the object under the finger straight away
      setHovered(pick(e.clientX, e.clientY));
    }
  }
  function onMove(e) {
    if (state.locked) return;
    if (ptr.down && e.pointerId === ptr.id) {
      const dx = e.clientX - ptr.x;
      const dy = e.clientY - ptr.y;
      ptr.x = e.clientX;
      ptr.y = e.clientY;
      if (!ptr.moved && Math.hypot(e.clientX - ptr.sx, e.clientY - ptr.sy) > 7) {
        ptr.moved = true;
        setHovered(null);
        canvas.style.cursor = 'grabbing';
        events.emit('dragstart');
      }
      if (ptr.moved && state.walk) companion.turn(dx * 0.005);
      else if (ptr.moved && !rig.moving) rig.nudge(dx, dy);
      return;
    }
    if (e.pointerType === 'mouse') {
      lastMove = e;
      const r = canvas.getBoundingClientRect();
      rig.parX = -(((e.clientX - r.left) / r.width) * 2 - 1);
      rig.parY = ((e.clientY - r.top) / r.height) * 2 - 1;
      if (!hoverQueued) {
        hoverQueued = true;
        requestAnimationFrame(() => {
          hoverQueued = false;
          if (lastMove && !state.locked && !ptr.down) setHovered(pick(lastMove.clientX, lastMove.clientY));
        });
      }
    }
  }
  function onUp(e) {
    if (!ptr.down || e.pointerId !== ptr.id) return;
    ptr.down = false;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const quick = performance.now() - ptr.t < 700;
    if (!ptr.moved && quick && !state.locked) {
      const item = pick(e.clientX, e.clientY);
      if (item) events.emit('select', item);
    }
    if (e.pointerType !== 'mouse') setHovered(null);
    else canvas.style.cursor = hovered ? 'pointer' : 'grab';
  }
  function onCancel() {
    ptr.down = false;
    setHovered(null);
  }
  function onLeave() {
    if (!ptr.down) {
      setHovered(null);
      rig.parX = rig.parY = 0;
    }
  }
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onCancel);
  canvas.addEventListener('pointerleave', onLeave);

  /* ───────────── Image loading ───────────── */
  const loaded = new Set();
  function ensureLoaded(kind) {
    if (loaded.has(kind)) return;
    loaded.add(kind);
    ctx.items.filter((i) => i.kind === kind).forEach((i, n) => setTimeout(() => i.load?.(), n * 60));
  }

  /* ───────────── Navigation ───────────── */
  const dur = (d) => (ctx.reduced() ? 0.01 : d);
  const tmpF = new THREE.Vector3();
  const tmpR = new THREE.Vector3();

  function setSway(amp) {
    gsap.to(rig.sway, { amp: ctx.reduced() ? 0 : amp, duration: 1.6, ease: 'power2.inOut' });
  }

  async function goToStop(i, { quick = false } = {}) {
    i = THREE.MathUtils.clamp(i, 0, stops.length - 1);
    if (state.walk) leaveWalk();
    const s = stops[i];
    const prev = stops[state.stop];
    state.stop = i;
    state.focused = null;
    rig.dragEnabled = true;
    setSway(s.room === 'heart' ? 0.7 : 0);
    if (s.roomIndex >= 0) ensureLoaded(s.roomIndex >= 1 ? 'milestone' : 'memory');
    events.emit('stopchange', s, prev);
    const dist = rig.pos.distanceTo(s.pos);
    const d = quick ? 0.01 : dur(THREE.MathUtils.clamp(1.0 + dist * 0.075, 1.2, 4.2));
    return rig.moveTo(s.pos, s.look, { duration: d });
  }

  /* ───────────── Walk mode ───────────── */
  function setWalkFlag(on) {
    state.walk = on;
    if (on) {
      rig.kill();
      rig.yaw = rig.pitch = rig._yaw = rig._pitch = 0;
      setSway(0);
    }
    setHovered(null);
    events.emit('walk', on);
  }

  function enterWalk() {
    if (!state.entered || state.walk || state.focused) return;
    const cam = rig.pos.clone();
    const look = rig.look.clone();
    companion.placeFromCamera(cam, look);
    setWalkFlag(true);
  }

  function leaveWalk() {
    if (!state.walk) return;
    setWalkFlag(false);
  }

  /** Walk mode off, camera stays where it is: used just before an item is opened. */
  function suspendWalk() {
    if (state.walk) leaveWalk();
  }

  /** Walk mode off, and the camera glides to the nearest guided stop. */
  function exitWalkToNearestStop() {
    if (!state.walk) return Promise.resolve(true);
    const g = companion.girlPosition();
    let best = 0;
    let bestD = Infinity;
    stops.forEach((s, i) => {
      const d = Math.hypot(s.pos.x - g.x, s.pos.z - g.z);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return goToStop(best);
  }

  /** Fit an item in view, leaving room for the panel that is about to open. */
  function focusPose(item, insets = { right: 0, bottom: 0 }) {
    const f = item.focus;
    const vf = (camera.fov * Math.PI) / 360;
    const tan = Math.tan(vf);
    const ar = camera.aspect * Math.max(0.35, 1 - insets.right / W);
    const hAvail = Math.max(0.35, 1 - insets.bottom / H);
    let d = Math.max(f.h / (0.64 * hAvail), f.w / (0.78 * ar)) / (2 * tan);
    d = THREE.MathUtils.clamp(d, 1.1, 7);
    const pos = f.center.clone().addScaledVector(f.normal, d);
    const look = f.center.clone();
    // shift so the subject sits in the part of the screen the panel leaves free
    const viewH = 2 * d * tan;
    const viewW = viewH * camera.aspect;
    tmpF.subVectors(look, pos).normalize();
    tmpR.crossVectors(tmpF, THREE.Object3D.DEFAULT_UP).normalize();
    const sx = (insets.right / 2 / W) * viewW;
    const sy = (insets.bottom / 2 / H) * viewH;
    pos.addScaledVector(tmpR, sx);
    look.addScaledVector(tmpR, sx);
    pos.y -= sy;
    look.y -= sy;
    return { pos, look };
  }

  async function focusItem(item, insets) {
    suspendWalk();
    state.focused = item;
    setSway(0);
    rig.dragEnabled = false;
    setHovered(null);
    const { pos, look } = focusPose(item, insets);
    const dist = rig.pos.distanceTo(pos);
    return rig.moveTo(pos, look, { duration: dur(THREE.MathUtils.clamp(0.9 + dist * 0.08, 1.0, 2.2)) });
  }

  function unfocus() {
    if (!state.focused) return Promise.resolve(true);
    return goToStop(state.stop);
  }

  /* ───────────── Opening sequence ───────────── */
  let skipEntrance = null;
  async function playEntrance() {
    const reduced = ctx.reduced();
    state.locked = true;
    rig.dragEnabled = false;
    ensureLoaded('memory');
    const { doors } = ctx.refs;
    const first = stops[0];
    let skipped = false;
    const skipP = new Promise((r) => (skipEntrance = () => { skipped = true; r(); }));

    const tl = gsap.timeline();
    tl.to(doors.left.rotation, { y: 1.8, duration: reduced ? 0.5 : 2.6, ease: 'power2.inOut' }, reduced ? 0 : 0.5);
    tl.to(doors.right.rotation, { y: -1.8, duration: reduced ? 0.5 : 2.6, ease: 'power2.inOut' }, reduced ? 0 : 0.5);
    const revealT = gsap.to(state, { reveal: 1, duration: reduced ? 0.6 : 4.2, ease: 'power1.inOut', delay: reduced ? 0 : 0.6 });
    const fogCol = new THREE.Color(0x2c2420);
    const fogT = gsap.to(scene.fog.color, { r: fogCol.r, g: fogCol.g, b: fogCol.b, duration: reduced ? 0.6 : 4, delay: reduced ? 0 : 2 });
    const fogD = gsap.to(scene.fog, { density: 0.006, duration: reduced ? 0.6 : 4, delay: reduced ? 0 : 2 });
    gsap.to(rig.drift, { amp: 0, duration: 1.2 });
    gsap.to(dust.material.uniforms.uOpacity, { value: reduced ? 0.25 : 0.4, duration: 3, delay: reduced ? 0 : 2.5 });

    const run = (async () => {
      if (reduced) {
        await rig.moveTo(first.pos, first.look, { duration: 0.9 });
        return;
      }
      await rig.moveTo(V(0, 1.72, 7.4), V(0, 2.1, -6), { duration: 3.6, ease: 'power2.inOut' });
      if (skipped) return;
      await rig.moveTo(first.pos, first.look, { duration: 3.0, ease: 'power2.inOut' });
    })();
    await Promise.race([run, skipP]);
    skipEntrance = null;
    if (skipped) {
      rig.kill();
      rig.set(first.pos, first.look);
    }
    tl.progress(1);
    revealT.progress(1);
    fogT.progress(1);
    fogD.progress(1);
    gsap.set(dust.material.uniforms.uOpacity, { value: reduced ? 0.25 : 0.4 });
    state.entered = true;
    state.locked = false;
    state.stop = 0;
    state.focused = null;
    rig.dragEnabled = true;
    canvas.style.cursor = 'grab';
    events.emit('stopchange', first, null);
  }

  /* ───────────── Frame loop ───────────── */
  const clockStart = performance.now();
  let last = clockStart;
  const fwd = new THREE.Vector3();
  const focusPt = new THREE.Vector3();
  let slowFrames = 0;
  let frames = 0;
  let acc = 0;
  let running = true;
  let lostCb = null;

  lights.snap(outsidePos);

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    state.time += dt;
    const t = state.time;

    if (state.walk) {
      const info = companion.update(dt, t, true);
      const cam = companion.cameraTarget();
      const k = 1 - Math.exp(-dt * 5);
      rig.pos.lerp(cam.pos, k);
      rig.look.lerp(cam.look, k);
      if (info.room !== lastRoom) {
        lastRoom = info.room;
        events.emit('room', info.room);
      }
      if (info.nearby !== lastNearby) {
        lastNearby = info.nearby;
        events.emit('nearby', info.nearby);
      }
    } else {
      companion.update(dt, t, false);
    }

    rig.update(dt, t, ctx.reduced());
    camera.getWorldDirection(fwd);
    focusPt.copy(camera.position).addScaledVector(fwd, 3);
    lights.update(dt, focusPt, state.reveal);
    hemi.intensity = 0.14 + 0.2 * state.reveal;
    const dm = dust.material.uniforms;
    dm.uTime.value = ctx.reduced() ? 0 : t;
    dm.uCenter.value.set(camera.position.x + fwd.x * 4, 3, camera.position.z + fwd.z * 4);
    for (const u of ctx.updaters) u(dt, t);
    renderer.render(scene, camera);

    // Adaptive quality: if the device struggles, quietly lower the pixel ratio.
    if (state.entered) {
      frames++;
      acc += dt;
      if (frames >= 90) {
        const avg = acc / frames;
        frames = 0;
        acc = 0;
        if (avg > 0.034) {
          slowFrames++;
          if (slowFrames >= 2 && dpr > 1) {
            dpr = Math.max(1, dpr - 0.25);
            resize();
            slowFrames = 0;
          } else if (slowFrames >= 3 && renderer.shadowMap.enabled) {
            renderer.shadowMap.enabled = false;
            lights.pool.forEach((p) => (p.light.castShadow = false));
            scene.traverse((o) => o.material && (o.material.needsUpdate = true));
          }
        } else slowFrames = 0;
      }
    }
  }
  renderer.setAnimationLoop(frame);

  const onContextLost = (e) => {
    e.preventDefault();
    lostCb?.();
  };
  canvas.addEventListener('webglcontextlost', onContextLost);

  /* ───────────── API ───────────── */
  function dispose() {
    running = false;
    renderer.setAnimationLoop(null);
    ro.disconnect();
    window.removeEventListener('orientationchange', resize);
    canvas.removeEventListener('pointerdown', onDown);
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerup', onUp);
    canvas.removeEventListener('pointercancel', onCancel);
    canvas.removeEventListener('pointerleave', onLeave);
    canvas.removeEventListener('webglcontextlost', onContextLost);
    rig.kill();
    gsap.killTweensOf([state, rig.sway, rig.drift, scene.fog, scene.fog.color, dust.material.uniforms.uOpacity]);
    scene.traverse((o) => {
      o.geometry?.dispose?.();
      const m = o.material;
      if (m) (Array.isArray(m) ? m : [m]).forEach((mm) => {
        for (const k of Object.keys(mm)) if (mm[k]?.isTexture) mm[k].dispose();
        mm.dispose?.();
      });
    });
    ctx.disposables.forEach((d) => d?.dispose?.());
    images.dispose();
    envRT.dispose();
    scene.background?.dispose?.();
    renderer.dispose();
    events.clear();
  }

  return {
    events,
    stops,
    rooms,
    layout: L,
    get stopIndex() {
      return state.stop;
    },
    get focused() {
      return state.focused;
    },
    get entered() {
      return state.entered;
    },
    letter: ctx.refs.letter,
    heart: ctx.refs.heart,
    playEntrance,
    skipEntrance: () => skipEntrance?.(),
    goToStop,
    get walking() {
      return state.walk;
    },
    setWalk(on) {
      if (on) enterWalk();
      else return exitWalkToNearestStop();
      return Promise.resolve(true);
    },
    suspendWalk,
    /** x: right, y: forward (both -1..1). turn: -1 left, 1 right. */
    setMove(x, y, turn = 0) {
      companion.setInput(x, y, turn);
    },
    /** Record a new current stop without moving the camera (used when stepping through panel items). */
    markStop(i) {
      const prev = stops[state.stop];
      state.stop = i;
      events.emit('stopchange', stops[i], prev);
    },
    next: () => goToStop(Math.min(stops.length - 1, state.stop + 1)),
    prev: () => goToStop(Math.max(0, state.stop - 1)),
    goToRoom: (key) => goToStop(rooms.find((r) => r.key === key).firstStop),
    focusItem,
    unfocus,
    items: ctx.items,
    setLocked(v) {
      state.locked = v;
      if (v) setHovered(null);
      canvas.style.cursor = v ? 'default' : 'grab';
    },
    onContextLost(fn) {
      lostCb = fn;
    },
    resize,
    dispose,
  };
}
