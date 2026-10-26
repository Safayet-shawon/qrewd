export class Emitter {
  constructor() {
    this._h = new Map();
  }
  on(type, fn) {
    if (!this._h.has(type)) this._h.set(type, new Set());
    this._h.get(type).add(fn);
    return () => this.off(type, fn);
  }
  off(type, fn) {
    this._h.get(type)?.delete(fn);
  }
  emit(type, ...args) {
    this._h.get(type)?.forEach((fn) => fn(...args));
  }
  clear() {
    this._h.clear();
  }
}
