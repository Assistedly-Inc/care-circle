import { Resend } from 'resend';

export async function sendEmailNotification(env, toEmail, subject, textContent, htmlContent) {
  const resend = new Resend(env.RESEND_API_KEY);

  try {
    const { data, error } = await resend.emails.send({
      from: env.RESEND_FROM_EMAIL || 'notifications@carecircle.com',
      to: toEmail,
      subject: subject,
      text: textContent,
      html: htmlContent || `<p>${textContent.replace(/\n/g, '<br>')}</p>`,
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error };
    }

    return { success: true, id: data.id };
  } catch (err) {
    console.error('Resend dispatch error:', err);
    return { success: false, error: err.message };
  }
}
