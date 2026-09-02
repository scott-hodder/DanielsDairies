// ================================================
// DAILY TOWN EVENT DATA + PICK LOGIC (pure — no imports, unit-testable)
//
// The daily event pool follows the child's ACTIVE super skill: the pool is
// that skill's character's events plus Daniel's (the guide) for variety,
// so the day's visitor always reinforces what the child is working on.
// With no computable active skill the full rotation is the fallback.
//
// MIRRORED SERVER-SIDE: supabase/functions/daily-reminders/index.ts
// rebuilds these pools from per-character counts so the morning push names
// the same character as the dashboard chip. If you add or remove an event
// here, update the counts there (tests/unit/townEventPick.test.mjs guards
// the parity).
// ================================================

// The real Brain Town crew (native Australian animals — matched to the
// characters table; images load from the DB at init, emoji are fallbacks).
export const CHARS = {
  lenny: { name: 'Lenny', species: 'Border Collie', emoji: '🐶', skill: 'Brain Builder', slug: 'brain-builder' },
  coco: { name: 'Coco', species: 'Cockatoo', emoji: '🦜', skill: 'Thought Driver', slug: 'thought-driver' },
  kip: { name: 'Kip', species: 'Koala', emoji: '🐨', skill: 'Emotion Navigator', slug: 'emotion-navigator' },
  pepper: { name: 'Pepper', species: 'Possum', emoji: '🐾', skill: 'Behaviour Engineer', slug: 'behaviour-engineer' },
  eddie: { name: 'Eddie', species: 'Echidna', emoji: '🦔', skill: 'Resilience Architect', slug: 'resilience-architect' },
  kai: { name: 'Kai', species: 'Kookaburra', emoji: '🐦', skill: 'Social Mapper', slug: 'social-mapper' },
  billie: { name: 'Billie', species: 'Bilby', emoji: '🐰', skill: 'Future Designer', slug: 'future-designer' },
  daniel: { name: 'Daniel', species: 'Golden Retriever', emoji: '🐕', skill: 'Brain Town', slug: null }
}

// type 'choice': pick the helpful idea. type 'feeling': name a feeling.
// type 'breath': three slow breaths together. Every option is safe — "good"
// just picks which warm reply the character gives.
export const EVENTS = [
  // Kip the Koala — Emotion Navigator
  { c: 'kip', t: 'choice', line: "My tummy feels fluttery about climbing a new tree. What could I try?", opts: ["Take three slow koala breaths", "Pretend the flutters aren't there", "Tell a friend how I feel"], good: [0, 2], yes: "That really helps! Naming a feeling and breathing slow makes the flutters smaller.", hmm: "Hiding a feeling makes it sneaky. Naming it or breathing slow works better!" },
  { c: 'kip', t: 'feeling', line: "I'm doing my feelings check from my gum tree! Which feeling visited YOU today?", yes: "Thanks for telling me! Every feeling is okay — even the wobbly ones." },
  { c: 'kip', t: 'choice', line: "Daniel looks grumpy today. What's a kind first step?", opts: ["Ask him what's up", "Tell him to cheer up", "Give him space, then check in"], good: [0, 2], yes: "Yes! Asking, or gently waiting, shows you care about his feelings.", hmm: "'Cheer up' can feel like nobody's listening. Asking what's up works better!" },
  { c: 'kip', t: 'breath', line: "Koalas are the best slow breathers in the whole bush. Three slow ones with me?", yes: "Ahh, much calmer. Slow like a koala — that's the trick." },
  // Lenny the Border Collie — Brain Builder
  { c: 'lenny', t: 'choice', line: "I'm learning to round up the sheep a new way, but I keep forgetting it. What makes a memory road stronger?", opts: ["Practising it again today", "Doing it once and hoping", "Waiting until next month"], good: [0], yes: "Exactly! Every practice run makes the road in my brain wider and clearer.", hmm: "One run makes a faint path. Practising again is what builds the road!" },
  { c: 'lenny', t: 'choice', line: "I've been fetching and learning all morning and my brain feels tired. What helps it grow best now?", opts: ["A rest and a big drink of water", "Pushing through for hours more", "Giving up on learning"], good: [0], yes: "Smart! Brains build their best roads when they get breaks too.", hmm: "Tired brains build wobbly roads. A rest helps the building crew!" },
  { c: 'lenny', t: 'breath', line: "Big construction day in Brain Town! Sit and stay… and breathe slow with me first?", yes: "Perfect. A calm brain is a brilliant builder. Now — let's build!" },
  // Coco the Cockatoo — Thought Driver
  { c: 'coco', t: 'choice', line: "SQUAWK! A thought keeps repeating in my head: 'I always mess up!' Cockatoos are great at repeating things… but which thought SHOULD I repeat?", opts: ["'Everyone practises to get better'", "'The squawky thought must be true'", "'I messed up once, not always'"], good: [0, 2], yes: "Nice steering! I'll repeat THAT one instead. What you repeat is what you believe!", hmm: "Squawky thoughts aren't always true! Check the facts and repeat a fairer one." },
  { c: 'coco', t: 'choice', line: "My head feels like a whole flock of thoughts flapping at once! What un-crowds a busy mind?", opts: ["Notice each thought and let it fly past", "Squawk at every thought", "Chase every thought at once"], good: [0], yes: "Lovely flying! Watching thoughts glide past without chasing them is a real skill.", hmm: "Chasing every thought wears your wings out. Just watch them fly past!" },
  { c: 'coco', t: 'breath', line: "Even loud cockatoos go quiet to preen their feathers. Three slow, quiet breaths with me?", yes: "Feathers smooth, mind smooth. Now I can pick my thoughts instead of them picking me!" },
  // Pepper the Possum — Behaviour Engineer
  { c: 'pepper', t: 'choice', line: "I want to remember to stash my snacks every night before bed. What's the best possum trick?", opts: ["Stash them right after sunset, every night", "Hope I remember", "Only stash when I feel like it"], good: [0], yes: "That's habit-building! Same time, same trigger — soon it happens all by itself.", hmm: "Hoping is wobbly. Hooking a habit to sunset makes it automatic!" },
  { c: 'pepper', t: 'choice', line: "Oops — I skipped my tidy-branch habit last night. What now?", opts: ["Start again tonight, no big deal", "Give up forever", "Feel bad about it all week"], good: [0], yes: "Exactly! Missing one night doesn't break the habit — restarting is the skill.", hmm: "One missed night is just a wobbly branch. Restart tonight and keep climbing!" },
  { c: 'pepper', t: 'breath', line: "New habit under construction! Possums start the night calm — three slow breaths before we build?", yes: "Lovely. Small steps, every night — that's how big things get built." },
  // Eddie the Echidna — Resilience Architect
  { c: 'eddie', t: 'choice', line: "When things get scary I curl into a spiky ball. Sometimes that's smart! But when the scary bit passes, what should I do?", opts: ["Uncurl and try again", "Stay curled up forever", "Decide the world is too spiky"], good: [0], yes: "Yes! Curling up is okay for a moment — uncurling and trying again is resilience.", hmm: "Staying curled forever means missing all the good bits. Uncurl and try again!" },
  { c: 'eddie', t: 'choice', line: "My burrow collapsed AGAIN. What would a resilience architect do?", opts: ["Look at what happened and dig a better one", "Never dig again", "Blame the dirt"], good: [0], yes: "Every collapsed burrow teaches the next one how to hold. Dig on!", hmm: "The dirt's just dirt — and quitting means no burrows ever. Learn and re-dig!" },
  { c: 'eddie', t: 'breath', line: "A storm's rumbling over my burrow. Breathe slow with me while it passes?", yes: "See? Storms pass. And you're still standing — spikes and all. That's resilience." },
  // Kai the Kookaburra — Social Mapper
  { c: 'kai', t: 'choice', line: "From my high branch I can see a new kid sitting alone at lunch. What's a friendly move?", opts: ["Fly down, say hi and ask their name", "Stare from the branch", "Wait for them to come to me"], good: [0], yes: "That hello could make their whole week! Best view in the bush is up close.", hmm: "New kids usually can't make the first move. A simple hi opens everything!" },
  { c: 'kai', t: 'choice', line: "Kookaburras love a big laugh — but my friend went quiet when everyone laughed at their stumble. What happened?", opts: ["Laughing AT someone can hurt", "They're no fun", "Nothing, laughs are always fine"], good: [0], yes: "Spot on. Laughing WITH friends is joy; laughing AT them stings. Big difference!", hmm: "Look closer — laughing AT someone stings. Laughing WITH them is where the fun is." },
  { c: 'kai', t: 'feeling', line: "I'm doing my morning fly-over, checking how everyone in town is feeling. What's YOUR weather today?", yes: "Added to my map! Knowing your own weather helps you read everyone else's." },
  // Billie the Bilby — Future Designer
  { c: 'billie', t: 'choice', line: "I dream of digging the greatest burrow in Brain Town. What's the best next step?", opts: ["One small dig this week", "Just imagine it forever", "Wait until I'm older"], good: [0], yes: "Dream + tiny dig = future magic. That's the whole recipe!", hmm: "Dreams need paws! One small dig starts the whole burrow." },
  { c: 'billie', t: 'choice', line: "My big bilby ears can hear TWO tomorrows: one where I practised today, one where I didn't. Which sounds better?", opts: ["The practised one", "The didn't one", "Can't tell"], good: [0], yes: "Right? Future-you is built by today-you. Sneaky, but wonderful.", hmm: "Listen again — future-you always sounds happier when today-you did one small thing!" },
  { c: 'billie', t: 'feeling', line: "Designing tomorrow starts with today. How are you feeling as we start planning?", yes: "Noted, designer! Knowing how you feel is step one of every good plan." },
  // Daniel the Golden Retriever — the guide
  { c: 'daniel', t: 'breath', line: "Woof! I missed you! Quick — three happy belly breaths before we play?", yes: "Wag wag wag. You always make Brain Town feel calmer." },
  { c: 'daniel', t: 'feeling', line: "Woof! Before we explore — how's your inside weather right now?", yes: "Thanks for telling me. Whatever the weather, we explore together!" },
  { c: 'daniel', t: 'choice', line: "I found a muddy puddle of grumpy feelings on Main Street! What should we do with it?", opts: ["Name it, then splash right through", "Pretend it isn't there", "Build a house in it and stay"], good: [0], yes: "SPLASH! Feelings you name are way less muddy. Onwards!", hmm: "Ignoring puddles makes them deeper, and living in one is soggy. Name it and splash through!" }
]

export function hashStr(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function dateKey(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

/** Character key ('pepper', …) for a super-skill slug, or null. */
export function charKeyForSlug(slug) {
  if (!slug) return null
  const hit = Object.entries(CHARS).find(([, ch]) => ch.slug === slug)
  return hit ? hit[0] : null
}

/**
 * The day's candidate events for a child with `activeSlug` as their active
 * super skill: that skill's character + Daniel. Full rotation when the
 * active skill is unknown (fail open — guidance, not a gate).
 */
export function eventPool(activeSlug) {
  const key = charKeyForSlug(activeSlug)
  if (!key || key === 'daniel') return EVENTS
  return EVENTS.filter(ev => ev.c === key || ev.c === 'daniel')
}

/** Deterministic pick — same child, date and active skill = same event. */
export function pickEvent(childId, dateStr, activeSlug) {
  const pool = eventPool(activeSlug)
  return pool[hashStr(dateStr + '|' + childId) % pool.length]
}
