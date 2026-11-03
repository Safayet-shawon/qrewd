import * as THREE from 'three';

/*
 * Weather for the courtyard, and whatever the visitor can see through the open
 * doorway. Rain and snow are simulated per particle with gravity, terminal
 * velocity and the shared wind. Wind is a gusting field and drives the hair,
 * skirts and dust elsewhere in the museum.
 */

const SCHEDULE = [
  { mode: 'clear', seconds: 50 },
  { mode: 'rain', seconds: 48 },
  { mode: 'clear', seconds: 28 },
  { mode: 'snow', seconds: 40 },
  { mode: 'fog', seconds: 30 },
];

export const WEATHER_LABEL = {
  clear: 'The sky is clearing.',
  rain: 'Rain begins to fall.',
  snow: 'Snow drifts down.',
  fog: 'A soft mist settles.',
};

const RAIN_N = 1400;
const SNOW_N = 1100;
const BOX = { x: 26, y: 12, z: 26 };
const TERMINAL_RAIN = 9; // m/s
const TERMINAL_SNOW = 1.1;

/** Wrap a coordinate into a box centred on `c` so particles recycle around the camera. */
function wrapAround(v, c, half) {
  const span = half * 2;
  let d = v - c;
  d = ((((d + half) % span) + span) % span) - half;
  return c + d;
}

export function createWeather(scene, { mats, hemi, quality }) {
  const group = new THREE.Group();
  scene.add(group);

  /* wind field: a slow base breeze plus two gust waves */
  const wind = { x: 0, z: 0, strength: 0 };
  const baseDir = new THREE.Vector2(0.9, 0.35).normalize();

  /* rain: streaks, each a line from the drop to a short tail behind it */
  const rainPos = new Float32Array(RAIN_N * 6);
  const rainTop = new Float32Array(RAIN_N * 3);
  for (let i = 0; i < RAIN_N; i++) {
    rainTop[i * 3] = (Math.random() - 0.5) * BOX.x;
    rainTop[i * 3 + 1] = Math.random() * BOX.y;
    rainTop[i * 3 + 2] = (Math.random() - 0.5) * BOX.z;
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.LineSegments(
    rainGeo,
    new THREE.LineBasicMaterial({ color: 0xc9d6e4, transparent: true, opacity: 0, depthWrite: false }),
  );
  rain.frustumCulled = false;
  group.add(rain);

  /* snow: soft points that flutter */
  const snowPos = new Float32Array(SNOW_N * 3);
  const snowSeed = new Float32Array(SNOW_N);
  for (let i = 0; i < SNOW_N; i++) {
    snowPos[i * 3] = (Math.random() - 0.5) * BOX.x;
    snowPos[i * 3 + 1] = Math.random() * BOX.y;
    snowPos[i * 3 + 2] = (Math.random() - 0.5) * BOX.z;
    snowSeed[i] = Math.random() * Math.PI * 2;
  }
  const snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  const snow = new THREE.Points(
    snowGeo,
    new THREE.PointsMaterial({
      color: 0xffffff,
      size: quality.lite ? 0.07 : 0.05,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );
  snow.frustumCulled = false;
  group.add(snow);

  /* ground wetness and snow cover */
  const baseGroundRough = mats.ground.roughness;
  const baseGroundColor = mats.ground.color.clone();
  const baseFogDensity = 0.0085;

  // `?weather=rain` (or snow, fog, clear) starts with that weather, for previewing.
  const forced = new URLSearchParams(location.search).get('weather');
  const startIndex = Math.max(0, SCHEDULE.findIndex((s) => s.mode === forced));

  const state = {
    mode: SCHEDULE[startIndex].mode,
    rain: 0,
    snow: 0,
    fog: 0,
    flash: 0,
    flashTimer: 8 + Math.random() * 8,
    t: 0,
    index: startIndex,
    timer: forced && startIndex > 0 ? 1e9 : SCHEDULE[startIndex].seconds,
    started: false,
  };

  function setMode(mode) {
    state.mode = mode;
    rain.material.opacity = 0; // recomputed each frame from intensity
  }

  function gustField(t) {
    const g1 = Math.sin(t * 0.31) * 0.5 + 0.5;
    const g2 = Math.sin(t * 0.83 + 1.7) * 0.5 + 0.5;
    const gust = Math.max(0, Math.sin(t * 0.11) - 0.4) * 1.4; // occasional stronger gust
    return 0.45 + 0.35 * g1 + 0.2 * g2 + gust;
  }

  /**
   * Advance the weather. `cam` is the camera position (the particles follow it).
   * `inside` is the visitor's zone: indoors the precipitation is mostly blocked.
   * Returns the wind vector (m/s) and the lightning flash value (0..1).
   */
  function update(dt, t, cam, { inside = false, onChange } = {}) {
    state.t = t;

    /* schedule */
    state.timer -= dt;
    if (state.timer <= 0) {
      state.index = (state.index + 1) % SCHEDULE.length;
      state.timer = SCHEDULE[state.index].seconds;
      setMode(SCHEDULE[state.index].mode);
      if (state.started) onChange?.(SCHEDULE[state.index].mode);
    }
    state.started = true;

    /* intensities ease towards the mode's target */
    const target = { rain: 0, snow: 0, fog: 0 };
    if (state.mode === 'rain') target.rain = 1;
    if (state.mode === 'snow') target.snow = 1;
    if (state.mode === 'fog') target.fog = 1;
    const ease = Math.min(1, dt * 0.35);
    state.rain += (target.rain - state.rain) * ease;
    state.snow += (target.snow - state.snow) * ease;
    state.fog += (target.fog - state.fog) * ease;

    /* wind */
    const strength = gustField(t) * (1 + 0.6 * state.rain + 0.3 * state.snow);
    wind.strength = strength;
    wind.x = baseDir.x * strength;
    wind.z = baseDir.y * strength;

    const shelter = inside ? 0.12 : 1; // precipitation is mostly kept out indoors

    /* rain */
    const rainOpacity = state.rain * 0.6 * shelter;
    rain.material.opacity = rainOpacity;
    if (rainOpacity > 0.002) {
      const vx = wind.x * 0.5;
      const vz = wind.z * 0.5;
      const vy = -TERMINAL_RAIN;
      for (let i = 0; i < RAIN_N; i++) {
        let x = rainTop[i * 3] + cam.x;
        let y = rainTop[i * 3 + 1];
        let z = rainTop[i * 3 + 2] + cam.z;
        y += vy * dt;
        x += vx * dt;
        z += vz * dt;
        if (y < 0) y += BOX.y;
        x = wrapAround(x, cam.x, BOX.x / 2);
        z = wrapAround(z, cam.z, BOX.z / 2);
        rainTop[i * 3] = x - cam.x;
        rainTop[i * 3 + 1] = y;
        rainTop[i * 3 + 2] = z - cam.z;
        // streak: a short tail trailing the motion
        rainPos[i * 6] = x;
        rainPos[i * 6 + 1] = y;
        rainPos[i * 6 + 2] = z;
        rainPos[i * 6 + 3] = x - vx * 0.045;
        rainPos[i * 6 + 4] = y - vy * 0.045;
        rainPos[i * 6 + 5] = z - vz * 0.045;
      }
      rainGeo.attributes.position.needsUpdate = true;
    }

    /* snow */
    const snowOpacity = state.snow * 0.95 * shelter;
    snow.material.opacity = snowOpacity;
    if (snowOpacity > 0.002) {
      for (let i = 0; i < SNOW_N; i++) {
        const seed = snowSeed[i];
        let x = snowPos[i * 3] + cam.x;
        let y = snowPos[i * 3 + 1];
        let z = snowPos[i * 3 + 2] + cam.z;
        y -= TERMINAL_SNOW * dt * (0.8 + 0.4 * Math.sin(seed));
        x += (wind.x * 0.6 + Math.sin(t * 1.3 + seed) * 0.35) * dt;
        z += (wind.z * 0.6 + Math.cos(t * 1.1 + seed * 1.7) * 0.35) * dt;
        if (y < 0) y += BOX.y;
        x = wrapAround(x, cam.x, BOX.x / 2);
        z = wrapAround(z, cam.z, BOX.z / 2);
        snowPos[i * 3] = x - cam.x;
        snowPos[i * 3 + 1] = y;
        snowPos[i * 3 + 2] = z - cam.z;
      }
      // draw in world space: rebuild absolute positions for the GPU
      const abs = snowGeo.attributes.position.array;
      for (let i = 0; i < SNOW_N; i++) {
        abs[i * 3] = snowPos[i * 3] + cam.x;
        abs[i * 3 + 1] = snowPos[i * 3 + 1];
        abs[i * 3 + 2] = snowPos[i * 3 + 2] + cam.z;
      }
      snowGeo.attributes.position.needsUpdate = true;
    }
    // the rain buffer is already in world space

    /* fog: thicker air, cooler light */
    const fogTarget = state.fog * 0.024 + (1 - state.fog) * 0;
    if (scene.fog) scene.fog.density = baseFogDensity + fogTarget * shelter;

    /* wet ground and snow cover */
    const wet = Math.min(1, state.rain * 1.1);
    mats.ground.roughness = THREE.MathUtils.lerp(baseGroundRough, 0.38, wet);
    mats.ground.color.copy(baseGroundColor).lerp(new THREE.Color(0xe9edf2), state.snow * 0.55);
    mats.ground.color.multiplyScalar(1 - wet * 0.18);

    /* lightning in heavy rain */
    state.flashTimer -= dt;
    if (state.flashTimer <= 0 && state.rain > 0.6) {
      state.flash = 1;
      state.flashTimer = 9 + Math.random() * 12;
    }
    state.flash = Math.max(0, state.flash - dt * 4.5);
    hemi.userData.flash = state.flash;

    return { wind, flash: state.flash };
  }

  return {
    group,
    wind,
    get mode() {
      return state.mode;
    },
    update,
    dispose() {
      rainGeo.dispose();
      snowGeo.dispose();
      rain.material.dispose();
      snow.material.dispose();
      group.removeFromParent();
    },
  };
}
