import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'

/**
 * Native app setup — status bar + splash screen config.
 * Only runs on iOS/Android, safe no-op on web.
 */
export async function initNativeApp() {
  if (!Capacitor.isNativePlatform()) return

  // Status bar: light text to match the dark #405878 header
  await StatusBar.setStyle({ style: Style.Dark })
  await StatusBar.setBackgroundColor({ color: '#405878' })

  // Hide the splash screen once the app is ready
  await SplashScreen.hide()
}
