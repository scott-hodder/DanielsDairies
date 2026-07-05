// Tailwind build config for the module player (module.html).
//
// Replaces the runtime CDN script (https://cdn.tailwindcss.com) — which
// Tailwind explicitly warns against in production and which made the core
// child experience depend on a third-party CDN — with a static stylesheet
// built at compile time.
//
// Content sources: the generate-module edge function contains every HTML
// template the AI pipeline emits, so scanning it covers the classes stored
// in generated modules. The safelist patterns cover utility variations that
// older stored modules may use but current templates no longer emit.
//
// Build: npm run build:module-css  (also runs automatically before `build`)

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './module.html',
    './supabase/functions/generate-module/index.ts',
    './supabase/functions/fix-audit-errors/index.ts',
    './public/modules/**/*.js',
    './src/features/modules/**/*.js'
  ],
  safelist: [
    // Spacing utilities across the scales generated content actually uses.
    { pattern: /^-?(m|mx|my|mt|mb|ml|mr|p|px|py|pt|pb|pl|pr)-(0|1|2|3|4|5|6|8|10|12|16|20|24)$/ },
    { pattern: /^(w|h)-(4|5|6|8|10|12|16|20|24|32|40|48|64|full|auto|screen)$/ },
    { pattern: /^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|center|left|right)$/ },
    { pattern: /^font-(normal|medium|semibold|bold|extrabold)$/ },
    { pattern: /^(flex|grid|block|inline-block|hidden|inline-flex)$/ },
    { pattern: /^(flex-col|flex-row|flex-wrap|flex-1|items-center|items-start|items-end|justify-center|justify-between|justify-start|justify-end)$/ },
    { pattern: /^gap-(1|2|3|4|5|6|8)$/ },
    { pattern: /^grid-cols-(1|2|3|4)$/ },
    { pattern: /^rounded(-sm|-md|-lg|-xl|-2xl|-3xl|-full)?$/ },
    { pattern: /^shadow(-sm|-md|-lg|-xl)?$/ },
    { pattern: /^(relative|absolute|fixed|sticky)$/ },
    { pattern: /^(overflow-hidden|overflow-auto|cursor-pointer|select-none|transition|duration-300|opacity-(0|50|100)|leading-(tight|normal|relaxed)|space-(x|y)-(1|2|3|4)|max-w-(sm|md|lg|xl|2xl|3xl|4xl|full)|mx-auto|my-auto|border(-2|-4)?|italic|underline|uppercase|tracking-wide)$/ }
  ],
  corePlugins: {
    // Preflight (base reset) on, matching what the CDN script applied.
    preflight: true
  }
}
