import * as THREE from 'three';
import { floorTexture, plasterBump } from './textures.js';

/** One shared set of physically based materials for the whole museum. */
export function createMaterials(q) {
  const bump = plasterBump();
  bump.repeat.set(2, 2);
  const floorMap = floorTexture();

  const std = (o) => new THREE.MeshStandardMaterial(o);

  return {
    plaster: std({ color: 0xf2d6cc, roughness: 0.92, bumpMap: bump, bumpScale: 0.3 }),
    trim: std({ color: 0xfbeedd, roughness: 0.6 }),
    stone: std({ color: 0xead2c6, roughness: 0.9, bumpMap: bump, bumpScale: 0.25 }),
    ceiling: std({ color: 0xfcf0e6, roughness: 0.95 }),
    floor: std({ color: 0xf5e1d8, map: floorMap, roughness: 0.28, metalness: 0.02 }),
    marble: std({ color: 0xeee8dc, roughness: 0.22, metalness: 0.0 }),
    champagne: std({ color: 0xe8c77a, roughness: 0.34, metalness: 0.72 }),
    roseGold: std({ color: 0xd9a48f, roughness: 0.32, metalness: 0.75 }),
    walnut: std({ color: 0x4b3a2f, roughness: 0.55, metalness: 0.0 }),
    ground: std({ color: 0x9c9284, roughness: 0.95 }),
    carpet: std({ color: 0xb8243f, roughness: 0.85 }),
    path: std({ color: 0x7a6d60, roughness: 0.9 }),
    matIvory: std({ color: 0xece3d0, roughness: 0.95 }),
    paper: std({ color: 0xf4ecda, roughness: 0.9 }),
    wax: std({ color: 0x8c4a46, roughness: 0.35, metalness: 0.05 }),
    // light-emitting trims (not lit)
    cove: new THREE.MeshBasicMaterial({ color: 0xffe2b8, toneMapped: false }),
    windowGlass: new THREE.MeshBasicMaterial({ color: 0xcfe6f2 }),
    darkGlass: std({ color: 0x2a2623, roughness: 0.1, metalness: 0.6 }),
    lamp: new THREE.MeshBasicMaterial({ color: 0xffe0b0, toneMapped: false }),
    lite: q.lite,
  };
}
