// In-memory event buffer. Flushed into MiniGameResult.events on finish.
// Controller decides whether to persist (e.g. into child_module_progress or a dedicated table).

export default class Telemetry {
  constructor() {
    this.events = [];
    this.t0 = performance.now();
  }

  emit(name, data) {
    this.events.push({
      t: Math.round(performance.now() - this.t0),
      name,
      ...(data !== undefined ? { data } : {}),
    });
  }

  snapshot() { return this.events.slice(); }
  clear() { this.events.length = 0; }
}
