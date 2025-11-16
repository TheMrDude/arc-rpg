import { supabase } from './supabase';

/**
 * Check if push notifications are supported
 * @returns {boolean} - True if supported
 */
export function isPushNotificationSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Request notification permission from user
 * @returns {Promise<string>} - Permission state
 */
export async function requestNotificationPermission() {
  if (!isPushNotificationSupported()) {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
}

/**
 * Subscribe user to push notifications
 * @param {string} userId - User's UUID
 * @returns {Promise<Object>} - Subscription result
 */
export async function subscribeToPushNotifications(userId) {
  if (!isPushNotificationSupported()) {
    return { success: false, error: 'Push notifications not supported' };
  }

  try {
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Permission denied' };
    }

    const registration = await navigator.serviceWorker.ready;

    // You would need to get this from your push service (e.g., Firebase, OneSignal)
    // For now, this is a placeholder
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

    if (!vapidPublicKey) {
      console.warn('VAPID public key not configured');
      return { success: false, error: 'Push service not configured' };
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });

    const subscriptionData = JSON.parse(JSON.stringify(subscription));

    // Save subscription to database
    const { data, error } = await supabase
      .rpc('subscribe_to_push', {
        p_user_id: userId,
        p_subscription_data: subscriptionData,
        p_device_type: getDeviceType()
      });

    if (error) throw error;

    return { success: true, subscriptionId: data };
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update notification preferences
 * @param {string} userId - User's UUID
 * @param {Object} preferences - Preference settings
 * @returns {Promise<Object>} - Update result
 */
export async function updateNotificationPreferences(userId, preferences) {
  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get user's notification preferences
 * @param {string} userId - User's UUID
 * @returns {Promise<Object|null>} - User preferences
 */
export async function getNotificationPreferences(userId) {
  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // Ignore not found
    return data;
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return null;
  }
}

/**
 * Helper function to convert VAPID key
 * @param {string} base64String - Base64 encoded string
 * @returns {Uint8Array} - Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Get device type
 * @returns {string} - Device type
 */
function getDeviceType() {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'web';
}

/**
 * Show a local notification (for testing)
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} options - Additional options
 */
export async function showLocalNotification(title, body, options = {}) {
  if (!isPushNotificationSupported()) {
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      body,
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      vibrate: [200, 100, 200],
      data: options.data || {},
      ...options
    });
  } catch (error) {
    console.error('Error showing notification:', error);
  }
}
