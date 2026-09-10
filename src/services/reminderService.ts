import cron from 'node-cron';
import { prisma } from '../config/prisma';
import { sendPushNotification } from '../utils/push';
import { sendSms } from '../utils/sms';
import { logger } from '../utils/logger';

/**
 * Runs every hour and sends reminders for tasks due in the next 24 h.
 * - If a task has `escalationLevel > 0` we also send an SMS.
 * - Push notifications are sent to the task owner (if they have a device registered).
 */
export const scheduleReminders = () => {
  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const tasks = await prisma.task.findMany({
        where: {
          dueDate: { gte: now, lte: in24h },
          status: { not: 'COMPLETED' },
        },
        include: { owner: true, case: true },
      });

      for (const task of tasks) {
        const message = `⏰ Task "${task.title}" is due ${task.dueDate.toLocaleString()}`;
        if (task.owner?.id) {
          await sendPushNotification(task.owner.id, message);
        }
        if (task.escalationLevel && task.escalationLevel > 0) {
          // Fallback to SMS to coordinator if owner missing phone
          const phone = task.owner?.email || task.case.coordinator.email; // placeholder: using email as phone in demo
          await sendSms(phone, message);
        }
      }
    } catch (err) {
      logger.error('Reminder scheduler error', err);
    }
  });
};
