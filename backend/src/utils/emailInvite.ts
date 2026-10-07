import { Resend } from 'resend';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY || '');
const INVITE_TOKEN_LENGTH = 24;
const INVITE_TOKEN_EXPIRY_HOURS = 48;

export interface InviteConfig {
  email: string;
  caseId: string;
  role: string;
  baseUrl?: string;
}

function generateInvitationToken(): string {
  return crypto.randomBytes(INVITE_TOKEN_LENGTH).toString('hex');
}

function generateInvitationUrl(config: InviteConfig): { url: string; token: string; expiresAt: Date } {
  const token = generateInvitationToken();
  const expiresAt = new Date(Date.now() + INVITE_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
  const url = `${config.baseUrl || process.env.BASE_URL || 'https://carecircle.com'}invitations/${token}/accept?role=${config.role}`;

  return { url, token, expiresAt };
}

export async function sendInvitationEmail(config: InviteConfig): Promise<{ success: boolean; error?: string }> {
  try {
    const { url, expiresAt } = generateInvitationUrl(config);
    const expiresAtFormatted = expiresAt.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2c5282;">Care Circle Invitation</h1>
        <p>Hello,</p>
        <p>You've been invited to join as a <strong>${config.role}</strong> in the Care Circle case for your loved one.</p>
        <p>Click the button below to accept this invitation:</p>
        <p><a href="${url}" style="background-color: #2c5282; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Accept Invitation</a></p>
        <p>This invitation will expire on ${expiresAtFormatted}.</p>
        <p style="font-size: 12px; color: #666;">Note: This email was sent on behalf of a Care Circle member. DO NOT disclose any sensitive information.</p>
      </div>
    `;

    const text = `
      Care Circle Invitation

      Hello,

      You've been invited to join as a ${config.role} in the Care Circle case for your loved one.

      To accept this invitation, click the link below:
      ${url}

      This invitation will expire on ${expiresAtFormatted}.

      Note: This email was sent on behalf of a Care Circle member. DO NOT disclose any sensitive information.
    `;

    const { data, error } = await resend.emails.send({
      from: process.env.SUPPORT_EMAIL || 'Care Circle <support@carecircle.com>',
      to: config.email,
      subject: `Care Circle - Invitation to Join`,
      html,
      text
    });

    if (error) {
      console.error('Resend email error:', error);
      return { success: false, error: error.message };
    }

    console.log('Invitation email sent successfully:', data?.id);
    return { success: true };
  } catch (error) {
    console.error('Error sending invitation email:', error);
    return { success: false, error: 'Failed to send invitation email' };
  }
}