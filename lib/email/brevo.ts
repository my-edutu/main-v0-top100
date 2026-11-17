import { sendTransactionalEmail } from "./send";

// Define types for our email functionality
interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface SendContactFormEmailParams {
  name: string;
  email: string;
  message: string;
}

/** Send through the same transactional transport as the rest of Top100. */
export const sendEmail = async ({ to, subject, html, text }: SendEmailOptions): Promise<boolean> => {
  const result = await sendTransactionalEmail({ to, subject, html, text });
  if (!result.ok) console.error("[email] could not deliver transactional email");
  return result.ok;
};

/**
 * Send a notification email for contact form submissions
 */
export const sendContactFormNotification = async ({ name, email, message }: SendContactFormEmailParams): Promise<boolean> => {
  const subject = `New Contact Form Submission from ${name}`;
  const html = `
    <html>
      <body>
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      </body>
    </html>
  `;

  // Get the recipient email from environment variable or use a default
  const recipient = process.env.CONTACT_FORM_NOTIFICATION_EMAIL || "partnership@top100afl.com";
  
  return sendEmail({
    to: recipient,
    subject,
    html,
  });
};