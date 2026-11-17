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
import { createCompanion } from './people/companion.js';
import { createWeather, WEATHER_LABEL } from './weather/weather.js';
import { skyTexture } from './textures.js';
import { buildEntrance } from './rooms/entrance.js';
import { buildGallery } from './rooms/gallery.js';
import { buildVideos } from './rooms/videos.js';
import { buildGallery as buildPictureRoom } from './rooms/gallery.js';
import { buildHeartRoom } from './rooms/heartRoom.js';
import { buildLetterRoom } from './rooms/letterRoom.js';
import { buildFinale } from './rooms/finale.js';

export const ROOM_KEYS = ['entrance', 'memories', 'videos', 'heart', 'letter', 'pictures', 'finale'];

function computeLayout(content) {
  const nM = content.memories.length;
  const nV = content.videos.length;
  const entrance = { key: 'entrance', z0: 0, z1: -16, half: 7, h: 6.5, plaque: { z: -7 } };
  const memSpacing = 2.9;
  const memories = { key: 'memories', z0: entrance.z1, half: 4, h: 5.4, spacing: memSpacing };
  memories.z1 = memories.z0 - (nM ? 6.8 + (nM - 1) * memSpacing : 8);
  const videos = { key: 'videos', z0: memories.z1, half: 4, h: 5.4, spacing: 3.4 };
  videos.z1 = videos.z0 - (nV ? 6.8 + (nV - 1) * videos.spacing : 8);
  const heart = { key: 'heart', z0: videos.z1, half: 9, h: 8 };
  heart.z1 = heart.z0 - 18;
  heart.zc = (heart.z0 + heart.z1) / 2;
  const letter = { key: 'letter', z0: heart.z1, half: 4.5, h: 5.6 };
  letter.z1 = letter.z0 - 14;
  letter.pedestalZ = letter.z1 + 3.9;
  const nP = content.pictures.length;
  const pictures = { key: 'pictures', z0: letter.z1, half: 4, h: 5.4, spacing: 2.9 };
  pictures.z1 = pictures.z0 - (nP ? 6.8 + (nP - 1) * pictures.spacing : 8);
  const finale = { key: 'finale', z0: pictures.z1, half: 4.5, h: 5.6 };
  finale.z1 = finale.z0 - 12;
  finale.zc = (finale.z0 + finale.z1) / 2;
  finale.pedestalZ = finale.z1 + 3.6;
  return { entrance, memories, videos, heart, letter, pictures, finale };
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
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = quality.shadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  let dpr = quality.dpr;
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  scene.background = skyTexture();
  scene.fog = new THREE.FogExp2(0xf6e0d8, 0.004);
  const root = new THREE.Group();
  scene.add(root);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.32;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 220);
  const rig = new CameraRig(camera);

  const hemi = new THREE.HemisphereLight(0xfff1e6, 0xe8c9b8, 0.9);
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
  room(buildVideos);
  room(buildHeartRoom);
  room(buildLetterRoom);
  room((c, l) => buildPictureRoom(c, l, { room: 'pictures', list: c.content.pictures, kind: 'picture' }));
  room(buildFinale);

  // partitions between rooms (with arched doorways)
  ctx.batch = new Batcher();
  const parts = [
    [L.entrance.z1, Math.max(L.entrance.half, L.memories.half), Math.max(L.entrance.h, L.memories.h)],
    [L.memories.z1, Math.max(L.memories.half, L.videos.half), Math.max(L.memories.h, L.videos.h)],
    [L.videos.z1, Math.max(L.videos.half, L.heart.half), Math.max(L.videos.h, L.heart.h)],
    [L.heart.z1, Math.max(L.heart.half, L.letter.half), Math.max(L.heart.h, L.letter.h)],
    [L.letter.z1, Math.max(L.letter.half, L.pictures.half), Math.max(L.letter.h, L.pictures.h)],
    [L.pictures.z1, Math.max(L.pictures.half, L.finale.half), Math.max(L.pictures.h, L.finale.h)],
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
  const weather = createWeather(scene, { mats, hemi, quality });
  const windDrift = new THREE.Vector2();
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
  const vidItems = ctx.items.filter((i) => i.kind === 'video');
  vidItems.forEach((item, i) => {
    const side = item.focus.center.x < 0 ? -1 : 1;
    const z = item.focus.center.z;
    addStop({
      room: 'videos',
      label: `${names.videos.name} · ${i + 1} of ${vidItems.length}`,
      pos: V(-side * 0.35, 1.66, z + 1.5),
      look: V(side * L.videos.half, 1.62, z - 0.3),
      featured: item,
      cue: 'Play',
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
  addStop({
    room: 'letter',
    label: names.letter.name,
    pos: V(0, 1.7, L.letter.pedestalZ + 3.7),
    look: V(0, 1.35, L.letter.pedestalZ),
    featured: ctx.refs.letter.item,
    cue: 'Open the letter',
  });
  const picItems = ctx.items.filter((i) => i.kind === 'picture');
  picItems.forEach((item, i) => {
    const side = item.focus.center.x < 0 ? -1 : 1;
    const z = item.focus.center.z;
    addStop({
      room: 'pictures',
      label: `${names.pictures.name} · ${i + 1} of ${picItems.length}`,
      pos: V(-side * 0.35, 1.66, z + 1.5),
      look: V(side * L.pictures.half, 1.62, z - 0.3),
      featured: item,
      cue: 'Read',
    });
  });
  addStop({
    room: 'finale',
    label: names.finale.name,
    pos: V(0, 1.7, L.finale.pedestalZ + 3),
    look: V(0, 1.4, L.finale.pedestalZ),
    featured: ctx.refs.cake.item,
    cue: 'Read',
  });

  const rooms = ROOM_KEYS.map((key, i) => ({
    key,
    index: i,
    name: names[key].name,
    blurb: names[key].blurb,
    firstStop: stops.findIndex((s) => s.room === key),
  }));

  /* ───────────── The couple (walk mode) ───────────── */
  const companion = createCompanion(scene, L, ctx.items);
  ctx.player = () => companion.girlPosition();
  let wind = { x: 0, z: 0 };
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
      if (ptr.moved && state.walk) {
        companion.turn(dx * 0.005);
        companion.pitchBy(dy * 0.004);
      }
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
    const s = stops[i];
    const prev = stops[state.stop];
    state.stop = i;
    state.focused = null;
    if (state.walk) {
      // walking: the visitor walks there (Next/Prev and room jumps are real walks)
      const p = stopPose(s);
      guideIndex = -1;
      guideMat.opacity = 0;
      events.emit('stopchange', s, prev);
      return companion.walkTo(p.x, p.z, p.h);
    }
    rig.dragEnabled = true;
    setSway(s.room === 'heart' ? 0.7 : 0);
    if (s.roomIndex >= 0) ensureLoaded(s.roomIndex >= 1 ? 'milestone' : 'memory');
    events.emit('stopchange', s, prev);
    const dist = rig.pos.distanceTo(s.pos);
    const d = quick ? 0.01 : dur(THREE.MathUtils.clamp(1.0 + dist * 0.075, 1.2, 4.2));
    return rig.moveTo(s.pos, s.look, { duration: d });
  }

  /* ───────────── Walk mode (always on once inside) ───────────── */
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

  /** Walk mode off, camera stays where it is: used while an item is open. */
  function suspendWalk() {
    if (!state.walk) return;
    state.resumeWalk = true;
    setWalkFlag(false);
  }

  /** Where the visitor stands for a stop, and the heading to face: in front of the thing. */
  function stopPose(s) {
    const f = s.featured?.focus;
    if (f) {
      // milestones sit beside a plinth, so stand further out to keep clear of it
      // stand well back, so the whole piece is seen before Read brings the camera in
      const d = { milestone: 3.8, memory: 3.8, heart: 4.2, letter: 3.4, cake: 3.6, plaque: 3.2 }[s.featured.kind] ?? 3.6;
      const x = f.center.x + f.normal.x * d;
      const z = f.center.z + f.normal.z * d;
      return { x, z, h: Math.atan2(f.center.x - x, -(f.center.z - z)) };
    }
    return { x: s.pos.x, z: s.pos.z, h: Math.atan2(s.look.x - s.pos.x, -(s.look.z - s.pos.z)) };
  }

  /** Put the visitor at a stop straight away (no walk). */
  function placeAtStop(s) {
    const p = stopPose(s);
    companion.place(p.x, p.z, p.h);
  }

  /* guide: a floor marker that shows where the next stop is; the visitor walks there */
  const guideMat = new THREE.MeshBasicMaterial({ color: 0xf3dcb0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const guideMarker = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 56), guideMat);
  guideMarker.rotation.x = -Math.PI / 2;
  guideMarker.position.y = 0.02;
  guideMarker.renderOrder = 4;
  scene.add(guideMarker);
  ctx.disposables.push(guideMarker.geometry, guideMat);
  let guideIndex = -1;

  function nearestStop() {
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
    return best;
  }

  function guideStep(dir) {
    const base = guideIndex >= 0 ? guideIndex : nearestStop();
    guideIndex = THREE.MathUtils.clamp(base + dir, 0, stops.length - 1);
    const s = stops[guideIndex];
    guideMarker.position.set(s.pos.x, 0.02, s.pos.z);
    events.emit('guide', s);
    return s;
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
    state.focused = null;
    if (state.resumeWalk) {
      state.resumeWalk = false;
      setWalkFlag(true);
      return Promise.resolve(true);
    }
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
    const fogCol = new THREE.Color(0xf6e0d8);
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
    // from here on the visitor walks, first-person, starting at the first stop
    placeAtStop(first);
    setWalkFlag(true);
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

    const weatherNow = weather.update(dt, t, camera.position, {
      inside: rig.pos.z < 0,
      onChange: (mode) => events.emit('weather', WEATHER_LABEL[mode]),
    });
    wind = weatherNow.wind;
    windDrift.x += wind.x * dt * 0.35;
    windDrift.y += wind.z * dt * 0.35;
    dust.material.uniforms.uDrift.value.copy(windDrift);

    if (state.walk) {
      const info = companion.update(dt, t, true, wind);
      const cam = companion.cameraTarget();
        const k = 1 - Math.exp(-dt * 14);
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
      companion.update(dt, t, false, wind);
    }

    const guideOn = guideIndex >= 0 && state.walk;
    const guideTarget = guideOn ? 0.55 + 0.25 * Math.sin(t * 2.6) : 0;
    guideMat.opacity += (guideTarget - guideMat.opacity) * Math.min(1, dt * 6);
    guideMarker.scale.setScalar(1 + 0.06 * Math.sin(t * 2.6));

    rig.update(dt, t, ctx.reduced());
    camera.getWorldDirection(fwd);
    focusPt.copy(camera.position).addScaledVector(fwd, 3);
    lights.update(dt, focusPt, state.reveal);
    hemi.intensity = 0.55 + 0.25 * state.reveal + weatherNow.flash * 0.9;
    const dm = dust.material.uniforms;
    dm.uTime.value = ctx.reduced() ? 0 : t;
    dm.uCenter.value.set(camera.position.x + fwd.x * 4, 3, camera.position.z + fwd.z * 4);
    for (const u of ctx.updaters) u(dt, t);
    updateCelebrations(dt);
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

  /* ───────────── Celebration: confetti falls over the cake, like a crowd cheering ───────────── */
  const celebrations = [];
  function celebrate() {
    const N = 320;
    const pos = new Float32Array(N * 3);
    const vel = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const palette = [0xf2c9c0, 0xe6b86a, 0xfbf3ea, 0xd98c8c, 0xffffff, 0xf0d9a8].map((c) => new THREE.Color(c));
    const cx = 0;
    const cz = L.finale.pedestalZ;
    for (let i = 0; i < N; i++) {
      pos[i * 3] = cx + (Math.random() - 0.5) * 3.2;
      pos[i * 3 + 1] = 3.3 + Math.random() * 1.2;
      pos[i * 3 + 2] = cz + (Math.random() - 0.5) * 3.2;
      vel[i * 3] = (Math.random() - 0.5) * 0.5;
      vel[i * 3 + 1] = -(0.4 + Math.random() * 0.5);
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
      const c = palette[i % palette.length];
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, opacity: 1, depthWrite: false });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    root.add(pts);
    celebrations.push({ pts, geo, mat, pos, vel, life: 0, cx, cz });
  }

  function updateCelebrations(dt) {
    for (let k = celebrations.length - 1; k >= 0; k--) {
      const c = celebrations[k];
      c.life += dt;
      for (let i = 0; i < c.pos.length / 3; i++) {
        c.vel[i * 3 + 1] -= 0.6 * dt; // a little gravity, so the paper drifts down
        c.pos[i * 3] += c.vel[i * 3] * dt;
        c.pos[i * 3 + 1] += c.vel[i * 3 + 1] * dt;
        c.pos[i * 3 + 2] += c.vel[i * 3 + 2] * dt;
        if (c.pos[i * 3 + 1] < 0.2) c.pos[i * 3 + 1] = 3.3 + Math.random() * 1.2; // falls again: a shower
      }
      c.geo.attributes.position.needsUpdate = true;
      c.mat.opacity = Math.max(0, 1 - Math.max(0, c.life - 8) / 4);
      if (c.life > 12) {
        root.remove(c.pts);
        c.geo.dispose();
        c.mat.dispose();
        celebrations.splice(k, 1);
      }
    }
  }

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
    weather.dispose();
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
    suspendWalk,
    celebrate,
    guideStep,
    get guideIndex() {
      return guideIndex;
    },
    nearestStop,
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
