// Celebration burst shown on successful completion.
// Returns a promise that resolves when the animation is done so the controller
// can sequence: finish -> burst -> close modal -> award rewards.

export default function rewardBurst(container, { stars = 3, message = 'Great job!' } = {}) {
  return new Promise((resolve) => {
    const burst = document.createElement('div');
    burst.className = 'mg-reward-burst';
    burst.innerHTML = `
      <div class="mg-reward-celebration">
        <img src="/images/characters/Daniel_Celebrating.webp" alt="Daniel celebrating" class="mg-reward-daniel">
      </div>
      <div class="mg-reward-stars-row">
        ${Array.from({ length: 3 }, (_, i) =>
          `<span class="mg-reward-star ${i < stars ? 'earned' : 'empty'}" style="animation-delay:${i * 0.15}s">
            ${i < stars ? '⭐' : '☆'}
          </span>`
        ).join('')}
      </div>
      <div class="mg-reward-message">${message}</div>
      <div class="mg-reward-confetti">
        ${Array.from({ length: 12 }, (_, i) =>
          `<span class="mg-confetti-piece" style="--i:${i};--x:${-40 + Math.random() * 80}px;--r:${Math.random() * 360}deg"></span>`
        ).join('')}
      </div>
    `;
    container.appendChild(burst);

    requestAnimationFrame(() => burst.classList.add('active'));

    setTimeout(() => {
      burst.classList.remove('active');
      setTimeout(() => { burst.remove(); resolve(); }, 300);
    }, 2000);
  });
}
