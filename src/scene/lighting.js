import * as THREE from 'three';

/**
 * Forward rendering gets expensive with many lights, so the museum defines
 * many light "slots" but only the few nearest the visitor are actually lit.
 * A small pool of real SpotLights is handed from slot to slot, fading out and
 * in so the change is never visible.
 */
export class LightPool {
  constructor(scene, count, { shadows = false } = {}) {
    this.slots = [];
    this.pool = [];
    this.count = count;
    for (let i = 0; i < count; i++) {
      const light = new THREE.SpotLight(0xffffff, 0, 20, 0.6, 0.8, 2);
      light.castShadow = shadows && i === 0;
      if (light.castShadow) {
        light.shadow.mapSize.set(1024, 1024);
        light.shadow.bias = -0.0004;
        light.shadow.normalBias = 0.03;
        light.shadow.camera.near = 0.5;
        light.shadow.camera.far = 22;
        light.shadow.radius = 3;
      }
      scene.add(light, light.target);
      this.pool.push({ light, slot: null, level: 0 });
    }
  }

  addSlot(s) {
    const slot = {
      room: 'x',
      pos: new THREE.Vector3(),
      target: new THREE.Vector3(),
      intensity: 60,
      angle: 0.6,
      penumbra: 0.8,
      distance: 16,
      color: new THREE.Color(0xffe2bc),
      ...s,
    };
    slot.pos = new THREE.Vector3(...s.pos);
    slot.target = new THREE.Vector3(...s.target);
    if (s.color !== undefined) slot.color = new THREE.Color(s.color);
    this.slots.push(slot);
    return slot;
  }

  _apply(p, slot) {
    p.slot = slot;
    const l = p.light;
    l.position.copy(slot.pos);
    l.target.position.copy(slot.target);
    l.angle = slot.angle;
    l.penumbra = slot.penumbra;
    l.distance = slot.distance;
    l.color.copy(slot.color);
    l.target.updateMatrixWorld();
  }

  /** Light everything near `focus` immediately (used on start-up). */
  snap(focus) {
    const order = this._order(focus);
    this.pool.forEach((p, i) => {
      if (order[i]) {
        this._apply(p, order[i]);
        p.level = 1;
      }
    });
  }

  _order(focus) {
    return [...this.slots].sort((a, b) => a.pos.distanceToSquared(focus) - b.pos.distanceToSquared(focus));
  }

  update(dt, focus, reveal) {
    const order = this._order(focus);
    const rank = new Map();
    order.forEach((s, i) => rank.set(s, i));
    const active = this.pool.filter((p) => p.slot && !p.releasing);
    const held = new Set(active.map((p) => p.slot));
    let missing = order.slice(0, this.count).filter((s) => !held.has(s)).length;
    for (const p of active) {
      const r = rank.get(p.slot);
      if (r >= this.count && (missing > 0 || r >= this.count + 2)) {
        p.releasing = true;
        missing--;
      }
    }
    for (const p of this.pool) {
      if (p.slot && !p.releasing) {
        p.level = Math.min(1, p.level + dt / 0.5);
      } else {
        p.level = Math.max(0, p.level - dt / 0.35);
        if (p.level === 0) {
          p.releasing = false;
          p.slot = null;
          const taken = new Set(this.pool.filter((x) => x.slot).map((x) => x.slot));
          const next = order.slice(0, this.count).find((s) => !taken.has(s));
          if (next) this._apply(p, next);
        }
      }
      const s = p.slot;
      const k = s ? (s.room === 'exterior' ? 1 : reveal) : 0;
      p.light.intensity = s ? s.intensity * p.level * k : 0;
    }
  }
}
