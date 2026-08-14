import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'path'

// Every page's critical path starts with Supabase (auth + first queries).
// Preconnecting overlaps DNS + TLS with script parse instead of paying it
// on the first request.
function supabasePreconnectPlugin(env) {
  let origin = ''
  try { origin = new URL(env.VITE_SUPABASE_URL).origin } catch (_) { /* no env, skip */ }
  return {
    name: 'inject-supabase-preconnect',
    transformIndexHtml(html) {
      if (!origin) return html
      return html.replace('<head>', `<head>\n    <link rel="preconnect" href="${origin}" crossorigin>`)
    }
  }
}

// Vite plugin to inject security meta tags into all HTML pages
function securityHeadersPlugin() {
  const metaTags = [
    '<meta http-equiv="X-Content-Type-Options" content="nosniff">',
    '<meta name="referrer" content="strict-origin-when-cross-origin">',
    '<meta http-equiv="Content-Security-Policy" content="' +
      "default-src 'self'; " +
      // blob: is required — the module player executes stored module scripts
      // via Blob URLs (module.html loadModuleScript)
      "script-src 'self' 'unsafe-inline' blob: https://cdn.jsdelivr.net; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: blob: https:; " +
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com; " +
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com; " +
      "media-src 'self' blob: https:; " +
      "object-src 'none'; " +
      "base-uri 'self'" +
    '">'
  ].join('\n    ')

  return {
    name: 'inject-security-headers',
    transformIndexHtml(html) {
      return html.replace('<head>', '<head>\n    ' + metaTags)
    }
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [securityHeadersPlugin(), supabasePreconnectPlugin(loadEnv(mode, process.cwd(), 'VITE_'))],

  server: {
    port: 3000,
    open: true,
    headers: {
      'X-Frame-Options': 'SAMEORIGIN',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    }
  },

  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        // Vite 8 / Rolldown: function-form manualChunks is deprecated and
        // only partially honoured — the Supabase SDK was silently fused
        // into the adventure-map chunk and shipped to every page.
        // advancedChunks groups are matched in order (first match wins).
        advancedChunks: {
          groups: [
            // Includes the app's data-access glue: without capturing it
            // here, Rolldown parks these shared modules inside whichever
            // feature chunk imports them first (minigames), dragging that
            // whole chunk onto the login/landing pages.
            { name: 'vendor-supabase', test: /node_modules[/\\]@supabase[/\\]|[/\\]src[/\\](supabaseClient\.js|services[/\\]databaseService\.js)$/ },
            { name: 'vendor-ui', test: /node_modules[/\\](dompurify|@twemoji)[/\\]/ },
            { name: 'minigames', test: /[/\\]src[/\\]minigames[/\\]/ },
            { name: 'brain-town-map', test: /[/\\]brainTownSvgMap\.js$/ },
            { name: 'brain-town-shell', test: /[/\\][^/\\]*brainTown/ },
            { name: 'adventure-map', test: /[/\\][^/\\]*(adventure-map|adventure-zone)/ },
            { name: 'learning-systems', test: /[/\\](daily-quest-system|daniel-relationship-system|roadblock-system|progress-tracking-system)\.js$/ }
          ]
        }
      },
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
        signup: resolve(__dirname, 'signup.html'),
        landing: resolve(__dirname, 'landing.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        profile: resolve(__dirname, 'profile.html'),
        admin: resolve(__dirname, 'admin.html'),
        module: resolve(__dirname, 'module.html'),
        parentInsights: resolve(__dirname, 'parent-insights.html'),
        billing: resolve(__dirname, 'billing.html'),
        privacyPolicy: resolve(__dirname, 'privacy-policy.html'),
        termsOfService: resolve(__dirname, 'terms-of-service.html'),
        howContentIsMade: resolve(__dirname, 'how-our-content-is-made.html'),
        ndisFunding: resolve(__dirname, 'ndis-funding.html'),
        auth: resolve(__dirname, 'auth.html'),
        schoolsLogin: resolve(__dirname, 'schools-login.html'),
        schoolsDashboard: resolve(__dirname, 'schools-dashboard.html'),
        practitionerDashboard: resolve(__dirname, 'practitioner-dashboard.html'),
        familyLibrary: resolve(__dirname, 'family-library.html')
      }
    }
  },

  publicDir: 'public'
}))
