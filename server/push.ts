import webpush from 'web-push';
import { db } from './db.js';

let publicVapidKey = process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfscjBJuBktQZBV93M4rQ1s3Y599v1gM';
let privateVapidKey = process.env.VAPID_PRIVATE_KEY || 'jX691Q1s3Y599v1gM599v1gMBEl62iUYgUivxIkv69yViE';

// Strip any trailing '=' padding to satisfy web-push URL-safe Base64 requirement without "="
publicVapidKey = publicVapidKey.replace(/=+$/, '').trim();
privateVapidKey = privateVapidKey.replace(/=+$/, '').trim();

try {
  webpush.setVapidDetails(
    'mailto:support@naisiaetextiles.com',
    publicVapidKey,
    privateVapidKey
  );
} catch (err: any) {
  console.warn('[VAPID Setup Warning] Falling back to generated VAPID keys:', err.message);
  try {
    const generated = webpush.generateVAPIDKeys();
    publicVapidKey = generated.publicKey;
    privateVapidKey = generated.privateKey;
    webpush.setVapidDetails(
      'mailto:support@naisiaetextiles.com',
      publicVapidKey,
      privateVapidKey
    );
  } catch (innerErr) {
    console.error('[VAPID Fallback Error]', innerErr);
  }
}

export function getVapidPublicKey() {
  return publicVapidKey;
}

export async function sendWebPushNotification(subscription: any, payload: { title: string; body: string; url?: string; icon?: string }) {
  try {
    const dataString = JSON.stringify(payload);
    await webpush.sendNotification(subscription, dataString);
    return { success: true };
  } catch (err: any) {
    console.error('[WebPush Error]', err.message);
    return { success: false, error: err.message };
  }
}

export async function broadcastPushNotification(payload: { title: string; body: string; url?: string; icon?: string }) {
  const dbData = db.getData() as any;
  if (!Array.isArray(dbData.pushSubscriptions) || dbData.pushSubscriptions.length === 0) {
    return { sentCount: 0 };
  }

  let sentCount = 0;
  const activeSubs = [];

  for (const sub of dbData.pushSubscriptions) {
    const res = await sendWebPushNotification(sub, payload);
    if (res.success) {
      sentCount++;
      activeSubs.push(sub);
    } else if (res.error && (res.error.includes('410') || res.error.includes('404'))) {
      console.log('[WebPush] Removing expired subscription');
    } else {
      activeSubs.push(sub);
    }
  }

  dbData.pushSubscriptions = activeSubs;
  await db.save();
  return { sentCount };
}
