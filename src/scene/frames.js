import * as THREE from 'three';
import gsap from 'gsap';
import { matrix } from './architecture.js';
import { placeholderArt, labelTexture } from './textures.js';

const MAX_TEX = 2048;

/**
 * Loads photographs lazily, once each. A missing or broken file resolves to
 * `null` (never throws, never logs a failed-request error from our code) so
 * the caller can show an intentional placeholder instead.
 */
export class ImageStore {
  constructor(renderer) {
    this.cache = new Map();
    this.maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  }

  load(url) {
    if (!url) return Promise.resolve(null);
    if (this.cache.has(url)) return this.cache.get(url);
    const p = new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        try {
          let source = img;
          let w = img.naturalWidth;
          let h = img.naturalHeight;
          if (!w || !h) return resolve(null);
          if (Math.max(w, h) > MAX_TEX) {
            const k = MAX_TEX / Math.max(w, h);
            const c = document.createElement('canvas');
            c.width = Math.round(w * k);
            c.height = Math.round(h * k);
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            source = c;
            w = c.width;
            h = c.height;
          }
          const texture = new THREE.Texture(source);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = this.maxAniso;
          texture.needsUpdate = true;
          resolve({ texture, aspect: w / h });
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
    this.cache.set(url, p);
    return p;
  }

  dispose() {
    this.cache.forEach((p) => p.then((r) => r?.texture.dispose()));
    this.cache.clear();
  }
}

const OPENING = {
  portrait: [1.05, 1.45],
  landscape: [1.65, 1.15],
  square: [1.3, 1.3],
};

/**
 * A mounted photograph: champagne frame, ivory mat, picture light and a small
 * wall label. The static metalwork goes into the shared batch; the picture,
 * label and hit-area are separate meshes so they can be updated and picked.
 *
 * `placement`: { pos:[x,y,z], rotY } — local +z faces out of the wall.
 */
export function createFrame(ctx, spec, placement) {
  const { mats, batch } = ctx;
  const [iw, ih] = (OPENING[spec.orientation] || OPENING.square).map((v) => v * (spec.scale || 1));
  const matB = 0.11 * (spec.scale || 1);
  const frameB = 0.07;
  const ow = iw + 2 * (matB + frameB);
  const oh = ih + 2 * (matB + frameB);
  const M = matrix(...placement.pos, 0, placement.rotY, 0);
  const at = (x, y, z, rx = 0, ry = 0, rz = 0) => M.clone().multiply(matrix(x, y, z, rx, ry, rz));
  const cast = { cast: true };

  // frame bars (slightly mitred look through a stepped profile)
  const bars = [
    [ow, frameB, 0, oh / 2 - frameB / 2],
    [ow, frameB, 0, -oh / 2 + frameB / 2],
    [frameB, oh - 2 * frameB, -ow / 2 + frameB / 2, 0],
    [frameB, oh - 2 * frameB, ow / 2 - frameB / 2, 0],
  ];
  for (const [w, h, x, y] of bars) {
    batch.add(new THREE.BoxGeometry(w, h, 0.09), mats.champagne, at(x, y, 0.045), cast);
  }
  // fine rose-gold line just inside the frame
  const iw2 = ow - 2 * frameB;
  const ih2 = oh - 2 * frameB;
  const t = 0.012;
  for (const [w, h, x, y] of [
    [iw2, t, 0, ih2 / 2 - t / 2],
    [iw2, t, 0, -ih2 / 2 + t / 2],
    [t, ih2, -iw2 / 2 + t / 2, 0],
    [t, ih2, iw2 / 2 - t / 2, 0],
  ]) {
    batch.add(new THREE.BoxGeometry(w, h, 0.012), mats.roseGold, at(x, y, 0.096));
  }
  batch.add(new THREE.BoxGeometry(ow - 2 * frameB, oh - 2 * frameB, 0.03), mats.matIvory, at(0, 0, 0.03), { receive: true });

  // picture light
  batch.add(new THREE.CylinderGeometry(0.018, 0.018, Math.min(0.7, ow * 0.7), 10), mats.champagne, at(0, oh / 2 + 0.16, 0.2, 0, 0, Math.PI / 2));
  batch.add(new THREE.BoxGeometry(0.02, 0.02, 0.2), mats.champagne, at(0, oh / 2 + 0.16, 0.1));
  batch.add(new THREE.BoxGeometry(Math.min(0.6, ow * 0.6), 0.012, 0.05), mats.lamp, at(0, oh / 2 + 0.135, 0.2));

  const group = new THREE.Group();
  group.position.set(...placement.pos);
  group.rotation.y = placement.rotY;
  ctx.root.add(group);

  // picture
  const imgMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.6,
    emissive: 0xffffff,
    emissiveIntensity: 0.22,
    transparent: true,
    opacity: 0,
  });
  const imgMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), imgMat);
  imgMesh.position.z = 0.05;
  imgMesh.scale.set(iw, ih, 1);
  group.add(imgMesh);

  // hit area
  const hit = new THREE.Mesh(
    new THREE.PlaneGeometry(ow + 0.1, oh + 0.1),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  );
  hit.position.z = 0.12;
  group.add(hit);

  // wall label
  let labelMesh = null;
  if (spec.label !== false) {
    const lw = Math.min(0.72, Math.max(0.5, ow * 0.62));
    const tex = labelTexture(spec.title, spec.date);
    labelMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(lw, lw * (200 / 640)),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.12 }),
    );
    labelMesh.position.set(0, -oh / 2 - 0.2, 0.012);
    group.add(labelMesh);
    batch.add(new THREE.BoxGeometry(lw + 0.03, lw * (200 / 640) + 0.03, 0.012), mats.champagne, at(0, -oh / 2 - 0.2, 0.004));
  }

  const worldCenter = new THREE.Vector3(...placement.pos);
  const normal = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), placement.rotY);

  const item = {
    id: `${spec.kind}-${spec.index}`,
    kind: spec.kind,
    index: spec.index,
    meshes: [hit],
    focus: { center: worldCenter, normal, w: ow, h: oh },
    hover: 0,
    hoverTarget: 0,
    setHover(on) {
      this.hoverTarget = on ? 1 : 0;
    },
  };
  hit.userData.item = item;

  ctx.updaters.push((dt) => {
    if (Math.abs(item.hover - item.hoverTarget) < 0.002) return;
    item.hover += (item.hoverTarget - item.hover) * Math.min(1, dt * 10);
    imgMat.emissiveIntensity = 0.22 + item.hover * 0.28;
    imgMesh.position.z = 0.05 + item.hover * 0.012;
  });

  // Fit the photo inside the opening at its own aspect ratio — never stretched.
  let applied = null;
  const apply = (map, aspect) => {
    imgMat.map = map;
    imgMat.emissiveMap = map;
    imgMat.needsUpdate = true;
    if (aspect > iw / ih) imgMesh.scale.set(iw, iw / aspect, 1);
    else imgMesh.scale.set(ih * aspect, ih, 1);
    gsap.to(imgMat, { opacity: 1, duration: ctx.reduced() ? 0.01 : 0.9, ease: 'power1.out' });
  };

  item.load = () => {
    if (applied) return applied;
    applied = ctx.images.load(spec.url).then((res) => {
      if (res) {
        apply(res.texture, res.aspect);
      } else {
        const t = placeholderArt(spec.image ? spec.title : spec.title, 640, Math.round((640 * ih) / iw), spec.index + 3);
        ctx.disposables.push(t);
        apply(t, iw / ih);
      }
      item.loaded = true;
      item.photoFound = !!res;
    });
    return applied;
  };

  ctx.disposables.push(imgMat, imgMesh.geometry, hit.geometry, hit.material);
  if (labelMesh) ctx.disposables.push(labelMesh.geometry, labelMesh.material, labelMesh.material.map);
  return item;
}
