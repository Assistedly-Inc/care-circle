import twilio from 'twilio';
import { config } from '../config/env';
import { logger } from './logger';

let client: twilio.Twilio | null = null;
if (config.twilioSid && config.twilioToken) {
  client = twilio(config.twilioSid, config.twilioToken);
} else {
  logger.warn('Twilio credentials not set – SMS notifications disabled');
}

/** Send SMS to a phone number (or email placeholder in demo). */
export const sendSms = async (to: string, body: string) => {
  if (!client) return logger.warn('SMS not sent – client not configured');
  try {
    await client.messages.create({
      body,
      from: config.twilioFrom,
      to,
    });
  } catch (e) {
    logger.error('SMS send error', e);
  }
};
