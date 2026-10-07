import webpush from 'web-push';
import { config } from '../config/env';
import { prisma } from '../config/prisma';
import { logger } from './logger';

// Configure VAPID keys – they must be provided via Bitwarden env vars.
if (config.webPushPublicKey && config.webPushPrivateKey) {
  webpush.setVapidDetails(
    'mailto:admin@carecircle.example',
    config.webPushPublicKey,
    config.webPushPrivateKey,
  );
} else {
  logger.warn('Web Push VAPID keys not set – push notifications disabled');
}

/** Send a push notification to a user by looking up their registered device(s). */
export const sendPushNotification = async (userId: string, payload: string) => {
  const devices = await prisma.userDevice.findMany({ where: { userId } });
  const promises = devices.map((d) =>
    webpush.sendNotification(
      {
        endpoint: d.endpoint,
        keys: { p256dh: d.p256dh, auth: d.auth },
      },
      JSON.stringify({ title: 'CareCircle Reminder', body: payload }),
    ).catch((e) => logger.error('Push failed', e))
  );
  await Promise.all(promises);
};
