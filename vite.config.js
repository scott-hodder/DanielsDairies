import { defineConfig } from 'vite'
import { resolve } from 'path'

// Vite plugin to inject security meta tags into all HTML pages
function securityHeadersPlugin() {
  const metaTags = [
    '<meta http-equiv="X-Content-Type-Options" content="nosniff">',
    '<meta name="referrer" content="strict-origin-when-cross-origin">',
    '<meta http-equiv="Content-Security-Policy" content="' +
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdn.tailwindcss.com; " +
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

export default defineConfig({
  plugins: [securityHeadersPlugin()],

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
        auth: resolve(__dirname, 'auth.html'),
        schoolsLogin: resolve(__dirname, 'schools-login.html'),
        schoolsDashboard: resolve(__dirname, 'schools-dashboard.html'),
        practitionerDashboard: resolve(__dirname, 'practitioner-dashboard.html')
      }
    }
  },

  publicDir: 'public'
})
