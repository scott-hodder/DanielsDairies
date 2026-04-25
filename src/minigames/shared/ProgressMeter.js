// Linear progress bar (with optional label). Returns the root element so
// games can mount it wherever. Call .set(0..1) to update.

export default class ProgressMeter {
  constructor({ label = '', initial = 0 } = {}) {
    const root = document.createElement('div');
    root.className = 'mg-progress';
    root.innerHTML = `
      ${label ? `<span class="mg-progress-label">${label}</span>` : ''}
      <div class="mg-progress-track"><div class="mg-progress-fill"></div></div>
      <span class="mg-progress-text">0%</span>
    `;
    this.root = root;
    this.fill = root.querySelector('.mg-progress-fill');
    this.text = root.querySelector('.mg-progress-text');
    this.set(initial);
  }

  set(ratio) {
    const pct = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
    this.fill.style.width = pct + '%';
    this.text.textContent = pct + '%';
  }
}
