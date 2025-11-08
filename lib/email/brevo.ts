import { SupabaseClient } from "@supabase/supabase-js";

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

/**
 * Send an email using Brevo API
 */
export const sendEmail = async ({ to, subject, html, text }: SendEmailOptions): Promise<boolean> => {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    console.error("[email] BREVO_API_KEY is not configured");
    return false;
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        to: [{ email: to }],
        sender: { 
          name: "Top100 Africa Future Leaders", 
          email: process.env.BREVO_SENDER_EMAIL || "noreply@top100afl.com" 
        },
        subject,
        htmlContent: html,
        textContent: text || html.replace(/<[^>]*>/g, ""),
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("[email] failed to send via Brevo", result);
      throw new Error(`Failed to send email: ${response.status}`);
    }

    console.log("[email] successfully sent via Brevo", result);
    return true;
  } catch (error) {
    console.error("[email] error sending via Brevo", error);
    return false;
  }
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