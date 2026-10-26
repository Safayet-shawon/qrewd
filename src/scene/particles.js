import * as THREE from 'three';

/** Camera-following dust motes: a fixed cloud wrapped around the visitor. */
export function createDust(count) {
  const seeds = new Float32Array(count);
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = Math.random() * 14;
    pos[i * 3 + 1] = Math.random() * 7;
    pos[i * 3 + 2] = Math.random() * 18;
    seeds[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uCenter: { value: new THREE.Vector3() },
      uPx: { value: 1 },
      uOpacity: { value: 0 },
    },
    vertexShader: /* glsl */ `
      uniform float uTime; uniform vec3 uCenter; uniform float uPx;
      attribute float aSeed; varying float vA;
      const vec3 BOX = vec3(14.0, 7.0, 18.0);
      void main() {
        vec3 p = position;
        p.y += uTime * (0.03 + aSeed * 0.04);
        p.x += sin(uTime * 0.12 + aSeed * 40.0) * 0.5;
        p.z += cos(uTime * 0.09 + aSeed * 31.0) * 0.5;
        vec3 rel = mod(p - uCenter + BOX * 0.5, BOX) - BOX * 0.5;
        vec3 w = uCenter + rel;
        vec4 mv = viewMatrix * vec4(w, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(uPx * (0.02 + aSeed * 0.03) * 420.0 / max(0.5, -mv.z), 1.0, 4.5);
        float e = max(abs(rel.x) / (BOX.x * 0.5), max(abs(rel.y) / (BOX.y * 0.5), abs(rel.z) / (BOX.z * 0.5)));
        vA = (1.0 - smoothstep(0.55, 1.0, e)) * (0.35 + 0.65 * aSeed);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity; varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.05, d);
        gl_FragColor = vec4(1.0, 0.86, 0.66, a * vA * uOpacity);
      }`,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 5;
  return points;
}

/** Slow motes rising around a point (used for the heart). */
export function createEmbers(count, center) {
  const pos = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 0.8 + Math.random() * 1.6;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = Math.random() * 4;
    pos[i * 3 + 2] = Math.sin(a) * r;
    seeds[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPx: { value: 1 }, uOpacity: { value: 0.85 }, uBase: { value: center.clone() } },
    vertexShader: /* glsl */ `
      uniform float uTime; uniform float uPx; uniform vec3 uBase;
      attribute float aSeed; varying float vA;
      void main() {
        vec3 p = position;
        float h = mod(p.y + uTime * (0.08 + aSeed * 0.1), 4.4);
        p.y = h;
        p.x += sin(uTime * 0.3 + aSeed * 30.0) * 0.18;
        p.z += cos(uTime * 0.27 + aSeed * 20.0) * 0.18;
        vec4 mv = viewMatrix * vec4(uBase + p + vec3(0.0, 0.3, 0.0), 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(uPx * (0.03 + aSeed * 0.035) * 420.0 / max(0.5, -mv.z), 1.0, 7.0);
        vA = smoothstep(0.0, 0.8, h) * (1.0 - smoothstep(3.0, 4.4, h)) * (0.4 + 0.6 * aSeed);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity; varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.02, d);
        gl_FragColor = vec4(1.0, 0.78, 0.6, a * vA * uOpacity);
      }`,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 5;
  return points;
}
