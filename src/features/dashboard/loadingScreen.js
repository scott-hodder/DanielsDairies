// Mental health quotes for kids with a positive framework
const mentalHealthQuotes = [
  {
    quote: "It's okay to feel big feelings. They don't last forever.",
    framework: "Emotional Awareness"
  },
  {
    quote: "You are brave for trying new things, even when it's scary.",
    framework: "Courage & Growth"
  },
  {
    quote: "Taking deep breaths helps calm your mind and body.",
    framework: "Self-Care"
  },
  {
    quote: "Everyone makes mistakes. That's how we learn and grow!",
    framework: "Resilience"
  },
  {
    quote: "You are worthy of kindness, especially from yourself.",
    framework: "Self-Compassion"
  },
  {
    quote: "It's super cool to ask for help when you need it.",
    framework: "Connection & Support"
  },
  {
    quote: "Your feelings are important and valid, always.",
    framework: "Emotional Validation"
  },
  {
    quote: "You have the power to handle challenges one step at a time.",
    framework: "Problem-Solving"
  },
  {
    quote: "Being different is your superpower, not a weakness.",
    framework: "Self-Acceptance"
  },
  {
    quote: "Today is a new chance to be kind to yourself and others.",
    framework: "Mindfulness & Kindness"
  }
];

// Character images available
const characterImages = [
  '/images/characters/DanielTheDog.webp',
  '/images/characters/DanielTheDogHoldingHeart.webp',
  '/images/characters/DanielTheDogReading.webp',
  '/images/characters/DanielTheDogThumbsUp.webp',
  '/images/characters/DanielWithFootball.webp'
];

// Get random character image
function getRandomCharacter() {
  return characterImages[Math.floor(Math.random() * characterImages.length)];
}

// Get random quote
function getRandomQuote() {
  return mentalHealthQuotes[Math.floor(Math.random() * mentalHealthQuotes.length)];
}

// Create and show loading screen
export function showLoadingScreen() {
  const loadingState = document.getElementById('loadingState');
  if (!loadingState) return;

  const randomQuote = getRandomQuote();
  const randomCharacter = getRandomCharacter();

  loadingState.innerHTML = `
    <div class="loading-container">
      <div class="loading-content">
        <div class="loading-character">
          <img src="${randomCharacter}" alt="Daniel the Dog" class="character-img">
          <div class="loading-spinner"></div>
        </div>
        
        <div class="loading-text">
          <div class="loading-quote">
            <p class="quote-text">"${randomQuote.quote}"</p>
          </div>
          
          <div class="loading-dots">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>
      </div>
    </div>
  `;

  loadingState.classList.remove('hidden');
}

// Hide loading screen with smooth fade
export function hideLoadingScreen() {
  const loadingState = document.getElementById('loadingState');
  if (!loadingState) return;

  // Smooth fade-out before hiding
  loadingState.style.transition = 'opacity 0.35s ease';
  loadingState.style.opacity = '0';
  setTimeout(() => {
    loadingState.classList.add('hidden');
    loadingState.style.transition = '';
    loadingState.style.opacity = '';
  }, 350);

  // Footer is shown after the adventure map finishes rendering
  // (via window._dashboardRenderComplete in dashboard-enhanced.js)
}
