// ================================================
// PARENT LIBRARY — Family Gold resource library
//
// A library of parent guides and printable worksheets, matching the
// resources in the Practitioner Hub. Gold-gated: the button to get here
// only shows in the Family Gold tab, and the page itself checks the
// family's subscription tier.
// ================================================

import { getSupabaseClient } from '../../supabaseClient.js'
import { getParentSubscription } from '../../services/databaseService.js'
import { isGoldTier } from './familyGoldDashboard.js'
import { initTelemetry, trackEvent } from '../../lib/telemetry.js'

initTelemetry()

// Crew-role colours echo each Super Skill's identity in the app.
const GUIDES = [
  { role: 'Brain Builder', color: '#405878', emoji: '🗺️', title: 'Meet Your Brain Town', desc: 'The very first idea in Daniel\'s Diaries — your child\'s brain is a town, they are the planner, and roads grow by being travelled. Everything else builds on this one.', meta: 'Start here · 10 min read', href: '/resources/meet-your-brain-town.pdf', featured: true },
  { role: 'The Pathway', color: '#2f9c8d', emoji: '🧭', title: 'The Super Skills Map', desc: 'How all seven Super Skills fit together — one town, seven jobs, the order that helps, and the seven planted truths your child collects.', meta: 'Overview · 8 min read', href: '/resources/super-skills-map.html', featured: true },
  { role: 'Emotion Navigator', color: '#f46b6b', emoji: '📮', title: 'Understanding Emotions', desc: 'Every feeling is a messenger with a job. They visit, deliver, and move on — and your child is the navigator who learns to read the message.', meta: '10 min read', href: '/resources/understanding-emotions.html' },
  { role: 'Calm Keeper', color: '#35a4d4', emoji: '🚨', title: 'Managing Anxiety', desc: 'Worry is the town\'s alarm — protective, keen, and sometimes wrong. Practical breathing and grounding tools for when worries feel too big.', meta: '10 min read', href: '/resources/managing-anxiety.html' },
  { role: 'Town Surveyor', color: '#ab47bc', emoji: '🗼', title: 'Self-Awareness', desc: 'Climbing the watchtower to look at your own thoughts — and spotting the patterns in the roads below, kindly and without judgement.', meta: '10 min read', href: '/resources/self-awareness.html' },
  { role: 'Traffic Director', color: '#40916c', emoji: '🚦', title: 'Behaviour & Choices', desc: 'Feelings, thoughts and actions travel together like trucks in a line — and every action has a junction where the traffic can turn.', meta: '10 min read', href: '/resources/behaviour-and-choices.pdf' },
  { role: 'Resilience Architect', color: '#f4a73b', emoji: '🌧️', title: 'Building Resilience', desc: 'Storms hit every town, wobbling is allowed, and rebuilding is a job your child can learn — with their repair crew beside them.', meta: '10 min read', href: '/resources/building-resilience.pdf' },
  { role: 'Social Mapper', color: '#4caf50', emoji: '🌉', title: 'Social Skills & Friendships', desc: 'Every person is their own town, and friendship is a bridge built one small moment at a time. One good bridge is enough.', meta: '10 min read', href: '/resources/social-skills-friendships.pdf' },
  { role: 'Daily ritual', color: '#c99a1e', emoji: '🚥', title: 'The Traffic Light Check-In', desc: 'A daily check-in that takes thirty seconds. Two moments a day, three colours, three prompts — the brain story behind each colour and what to say back.', meta: '12 min read · Pairs with worksheet', href: '/resources/traffic-light-parent-guide.pdf' },
  { role: 'Decoding', color: '#8a6d00', emoji: '🔍', title: 'The Parent\'s Decoder', desc: 'Five things they say, and what they actually mean. The brain story behind each sentence, the emotion underneath, the road being built — and what to say back.', meta: '12 min read · Pairs with worksheet', href: '/resources/parents-decoder.pdf' },
  { role: 'Encouragement', color: '#d4880f', emoji: '💛', title: 'What You\'re Already Doing Right', desc: 'The five quiet wins that don\'t feel like enough — and are. Their proper developmental names, the science, and why they earn their place.', meta: '12 min read', href: '/resources/dear-parents.pdf' }
]

const WORKSHEETS = [
  { role: 'Daily ritual', color: '#c99a1e', emoji: '🚥', title: 'Traffic Light Check-In · Fridge Card', desc: 'Cut it, laminate it, stick it on the fridge. Twice a day your child points to their colour — green, yellow, or red — and the grown-up notices. Thirty seconds, no words needed.', meta: 'Print & cut out · In the Traffic Light guide', href: '/resources/traffic-light-parent-guide.pdf' },
  { role: 'Do together', color: '#405878', emoji: '🛣️', title: 'What\'s My Road Today?', desc: 'The companion worksheet to the fridge card. Your child says what each colour actually feels like for them, in their own words — then the card takes over from there.', meta: 'Do together · 15–20 min', href: '/resources/whats-my-road-today.pdf' },
  { role: 'Do together', color: '#8a6d00', emoji: '💬', title: 'Does This Sound Like Me?', desc: 'Five sentences kids sometimes say — "I hate school", "leave me alone", "you don\'t get it" — and a chance to tell the grown-up which ones actually fit, and what would actually help.', meta: 'Do together · 20 min · Pairs with the Decoder', href: '/resources/parents-decoder.pdf' }
]

function card(r) {
  return `
    <a class="lib-card ${r.featured ? 'featured' : ''}" href="${r.href}" target="_blank" rel="noopener">
      <span class="lib-card-role" style="color:${r.color};">${r.role}</span>
      <div class="lib-card-top">
        <span class="lib-card-emoji">${r.emoji}</span>
        <h4>${r.title}</h4>
      </div>
      <p>${r.desc}</p>
      <div class="lib-card-foot">
        <span class="lib-card-meta">${r.meta}</span>
        <span class="lib-card-open">Open ↗</span>
      </div>
    </a>`
}

function comingSoon(text) {
  return `<div class="lib-coming"><span>🔜</span><div>${text}</div></div>`
}

async function init() {
  const loadingEl = document.getElementById('libLoading')
  const gateEl = document.getElementById('libGate')
  const contentEl = document.getElementById('libContent')

  const { data: { user } } = await getSupabaseClient().auth.getUser()
  if (!user) {
    window.location.href = '/login.html'
    return
  }

  let gold = false
  try {
    const subscription = await getParentSubscription(user.id)
    gold = isGoldTier(subscription)
  } catch (err) {
    console.warn('[library] subscription check failed:', err)
  }

  loadingEl.classList.add('hidden')
  if (!gold) {
    gateEl.classList.remove('hidden')
    return
  }

  document.getElementById('libGuides').innerHTML =
    GUIDES.map(card).join('') +
    comingSoon('More guides on the way — new guides are added regularly, and your practitioner can also share guides written just for your child.')
  document.getElementById('libSheets').innerHTML =
    WORKSHEETS.map(card).join('') +
    comingSoon('More worksheets on the way — new worksheets are added regularly, and your practitioner can assign ones chosen for your child.')
  document.getElementById('libGuideCount').textContent = GUIDES.length
  document.getElementById('libSheetCount').textContent = WORKSHEETS.length
  contentEl.classList.remove('hidden')
  trackEvent('parent_library_view')
}

init().catch(err => {
  console.error('[library] init failed:', err)
  document.getElementById('libLoading').innerHTML =
    '<p style="color:#6b7e95;">Could not load the library. Please refresh or try again shortly.</p>'
})
