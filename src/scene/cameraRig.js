import * as THREE from 'three';
import gsap from 'gsap';

const UP = new THREE.Vector3(0, 1, 0);

/**
 * One camera, one pose (position + look target) that GSAP animates. A second
 * move always kills the first, so overlapping transitions can never fight over
 * the camera. Drag / parallax offsets are layered on top, with hard limits.
 */
export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.pos = new THREE.Vector3(0, 1.7, 16);
    this.look = new THREE.Vector3(0, 2.4, 0);
    this.yaw = 0;
    this.pitch = 0;
    this._yaw = 0;
    this._pitch = 0;
    this.parX = 0;
    this.parY = 0;
    this.sway = { amp: 0 };
    this.drift = { amp: 0 };
    this.dragEnabled = true;
    this.tl = null;
    this._d = new THREE.Vector3();
    this._r = new THREE.Vector3();
    this._p = new THREE.Vector3();
  }

  get moving() {
    return !!this.tl && this.tl.isActive();
  }

  /** Teleport. */
  set(pos, look) {
    this.kill();
    this.pos.copy(pos);
    this.look.copy(look);
    this.yaw = this.pitch = this._yaw = this._pitch = 0;
  }

  kill() {
    if (this.tl) {
      const t = this.tl;
      this.tl = null;
      t.kill();
      t._resolve?.(false);
    }
  }

  /** Animate to a pose. Resolves true when it arrives, false if interrupted. */
  moveTo(pos, look, { duration = 2, ease = 'power2.inOut', delay = 0 } = {}) {
    this.kill();
    this.yaw = this.pitch = 0;
    const tl = gsap.timeline({ delay });
    this.tl = tl;
    tl.to(this.pos, { x: pos.x, y: pos.y, z: pos.z, duration, ease }, 0);
    tl.to(this.look, { x: look.x, y: look.y, z: look.z, duration, ease }, 0);
    tl.to(this, { _yaw: 0, _pitch: 0, duration: Math.min(duration, 0.8), ease: 'power2.out' }, 0);
    return new Promise((resolve) => {
      tl._resolve = resolve;
      tl.eventCallback('onComplete', () => {
        if (this.tl === tl) this.tl = null;
        resolve(true);
      });
    });
  }

  /** Jump the running move to its end (used by "skip"). */
  finish() {
    if (this.tl) this.tl.progress(1);
  }

  nudge(dx, dy) {
    if (!this.dragEnabled) return;
    this.yaw = THREE.MathUtils.clamp(this.yaw + dx * 0.0042, -0.75, 0.75);
    this.pitch = THREE.MathUtils.clamp(this.pitch + dy * 0.0034, -0.32, 0.32);
  }

  resetLook() {
    this.yaw = this.pitch = 0;
  }

  update(dt, t, reduced) {
    const k = 1 - Math.exp(-dt * 7);
    this._yaw += (this.yaw - this._yaw) * k;
    this._pitch += (this.pitch - this._pitch) * k;
    const par = reduced ? 0 : 1;
    const yaw = this._yaw + this.parX * 0.035 * par;
    const pitch = this._pitch + this.parY * 0.02 * par;

    // Position: the animated pose plus a slow sway (heart room) or idle drift (outside).
    const p = this._p.copy(this.pos);
    if (!reduced) {
      if (this.sway.amp > 0) {
        p.x += Math.sin(t * 0.22) * this.sway.amp;
        p.y += Math.sin(t * 0.17 + 1) * this.sway.amp * 0.12;
      }
      if (this.drift.amp > 0) {
        p.x += Math.sin(t * 0.18) * this.drift.amp;
        p.y += Math.sin(t * 0.13) * this.drift.amp * 0.3;
      }
    }
    // Aim at the real target from the displaced position (reads as a gentle orbit),
    // then add the visitor's own look offset.
    const d = this._d.subVectors(this.look, p);
    const dist = d.length() || 1;
    d.divideScalar(dist);
    d.applyAxisAngle(UP, yaw);
    this._r.crossVectors(d, UP).normalize();
    d.applyAxisAngle(this._r, pitch);
    this.camera.position.copy(p);
    this.camera.lookAt(p.x + d.x * dist, p.y + d.y * dist, p.z + d.z * dist);
  }
}
