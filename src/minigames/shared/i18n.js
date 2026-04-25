// Tiny i18n helper. Dictionary is inline for now; games use ctx.i18n.t(key).
// Keys are namespaced: `<gameId>.<key>` or `shared.<key>`.

const strings = {
  en: {
    shared: {
      ready: 'Ready?',
      go: 'Go!',
      pause: 'Pause',
      resume: 'Resume',
      tryAgain: 'Try again',
      wellDone: 'Well done!',
      timesUp: "Time's up!",
      youWin: 'You did it!',
      close: 'Close',
    },
    balloonBreathing: {
      title: 'Balloon Breathing Rescue',
      instructions: 'Breathe in as the balloon grows, breathe out as it shrinks. Help rescue all the balloons!',
      breatheIn: 'Breathe in…',
      hold: 'Hold…',
      breatheOut: 'Breathe out…',
      balloonsSaved: 'Balloons saved',
      start: 'Start breathing',
    },
    thoughtCatcher: {
      title: 'Thought Catcher',
      instructions: 'Tap the helpful thoughts. Leave the tricky ones alone — they will float away.',
      caught: 'Helpful thoughts caught',
    },
    emotionMatch: {
      title: 'Emotion Match Trail',
      instructions: 'Match the face to the feeling.',
      matched: 'Matched',
    },
    calmPath: {
      title: 'Calm Path',
      instructions: 'Follow the dots in order. Slow and steady — no rush.',
      progress: 'Steps on the path',
    },
    copingKit: {
      title: 'Build Your Coping Kit',
      instructions: 'Drag helpful coping tools into your kit. Skip the ones that don\'t help.',
      kitLabel: 'Your kit',
      helpful: 'Helpful',
      notHelpful: 'Not helpful',
    },
    kindnessQuest: {
      title: 'Kindness Quest',
      instructions: 'Pick the kindest thing to do.',
      progress: 'Kind choices',
    },
    focusFireflies: {
      title: 'Focus Fireflies',
      instructions: 'Tap each firefly before it fades. Stay focused!',
      caught: 'Fireflies caught',
    },
    selfTalkSprint: {
      title: 'Self-Talk Sprint',
      instructions: 'Swap the tricky thought for a kinder one. Tap the best reply.',
      progress: 'Kinder thoughts',
    },
  },
};

export function createI18n(locale = 'en') {
  const dict = strings[locale] || strings.en;

  function t(key, vars) {
    const parts = key.split('.');
    let node = dict;
    for (const p of parts) {
      node = node?.[p];
      if (node == null) break;
    }
    if (typeof node !== 'string') return key;
    if (!vars) return node;
    return node.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
  }

  return { locale, t };
}
