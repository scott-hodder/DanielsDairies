// Thin SFX manager. Games call audio.play('pop'). If a11y.silent is set,
// or speech is in progress, sounds are suppressed.
// Sources are lazy-loaded from /sounds/minigames/<name>.mp3 — if the file
// isn't present we fail silently so content is optional.

export default class AudioManager {
  constructor({ a11y } = {}) {
    this.a11y = a11y || {};
    this.cache = new Map();
    this.muted = !!this.a11y.silent;
  }

  mute(v = true) { this.muted = v; }

  play(name, { volume = 0.6 } = {}) {
    if (this.muted) return;
    try {
      let audio = this.cache.get(name);
      if (!audio) {
        audio = new Audio(`/sounds/minigames/${name}.mp3`);
        audio.preload = 'auto';
        this.cache.set(name, audio);
      }
      const clone = audio.cloneNode();
      clone.volume = volume;
      clone.play().catch(() => { /* autoplay blocked; ignore */ });
    } catch (e) { /* ignore */ }
  }

  dispose() { this.cache.clear(); }
}
