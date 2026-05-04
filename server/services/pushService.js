const webpush = require('web-push');
const { supabaseAdmin } = require('../config/supabase');

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:aditya@habitforge.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

async function sendNotification(userId, title, body, data = {}) {
  try {
    const { data: user } = await supabaseAdmin
      .from('users').select('push_subscription').eq('id', userId).single();

    if (!user?.push_subscription) return;

    const subscription = typeof user.push_subscription === 'string'
      ? JSON.parse(user.push_subscription)
      : user.push_subscription;

    const payload = JSON.stringify({ title, body, data, icon: '/icons/icon-192.png', badge: '/icons/badge-96.png' });

    await webpush.sendNotification(subscription, payload);
  } catch (err) {
    if (err.statusCode === 410) {
      // Subscription expired — remove it
      await supabaseAdmin.from('users').update({ push_subscription: null }).eq('id', userId);
    } else {
      console.error('Push notification error:', err.message);
    }
  }
}

async function sendToAll(title, body, data = {}) {
  const { data: users } = await supabaseAdmin
    .from('users').select('id').not('push_subscription', 'is', null);

  for (const user of (users || [])) {
    await sendNotification(user.id, title, body, data);
  }
}

module.exports = { sendNotification, sendToAll };
