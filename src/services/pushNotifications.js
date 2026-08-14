import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { getSupabaseClient } from '../supabaseClient.js'

/**
 * Push notifications service — only runs on native iOS/Android.
 * On web, all functions are safe no-ops.
 */

const isNative = Capacitor.isNativePlatform()

export async function initPushNotifications() {
  if (!isNative) return

  const permission = await PushNotifications.requestPermissions()
  if (permission.receive !== 'granted') {
    console.warn('Push notification permission denied')
    return
  }

  await PushNotifications.register()

  // When registration succeeds, save the device token to Supabase
  PushNotifications.addListener('registration', async (token) => {
    console.log('Push token:', token.value)
    await saveDeviceToken(token.value)
  })

  PushNotifications.addListener('registrationError', (error) => {
    console.error('Push registration error:', error)
  })

  // Handle notification received while app is in foreground
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push received in foreground:', notification)
    // You could show an in-app banner here if desired
  })

  // Handle notification tapped (app opened from notification)
  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const data = action.notification.data
    console.log('Push notification tapped:', data)

    // Navigate based on notification type
    if (data?.url) {
      window.location.href = data.url
    }
  })
}

async function saveDeviceToken(token) {
  try {
    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('device_tokens')
      .upsert(
        {
          user_id: user.id,
          token,
          platform: Capacitor.getPlatform(),
          updated_at: new Date().toISOString()
        },
        { onConflict: 'token' }
      )

    if (error) {
      console.error('Error saving device token:', error)
    }
  } catch (err) {
    console.error('Error saving device token:', err)
  }
}

export async function removePushNotifications() {
  if (!isNative) return

  try {
    const supabase = getSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('device_tokens')
        .delete()
        .eq('user_id', user.id)
        .eq('platform', Capacitor.getPlatform())
    }
    await PushNotifications.removeAllListeners()
  } catch (err) {
    console.error('Error removing push notifications:', err)
  }
}
