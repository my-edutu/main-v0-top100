import { NextRequest } from "next/server";
import { sendContactFormNotification } from "@/lib/email/brevo";
import { z } from "zod";
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, createRateLimitResponse } from "@/lib/rate-limit";

// Define a schema for validation
const contactFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  message: z.string().min(1, "Message is required"),
});

export async function POST(req: NextRequest) {
  try {
    // Rate limiting - prevent spam
    const identifier = getClientIdentifier(req.headers);
    const rateLimitResult = checkRateLimit({
      ...RATE_LIMITS.CONTACT,
      identifier: `contact:${identifier}`,
    });

    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult, 'Too many submissions. Please try again later.');
    }

    const body = await req.json();


    // Validate the input data
    const validatedData = contactFormSchema.parse(body);

    // Send the email notification
    const emailSent = await sendContactFormNotification(validatedData);

    if (!emailSent) {
      return new Response(
        JSON.stringify({
          error: "Failed to send email notification"
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Contact form submitted and email notification sent successfully"
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Error processing contact form:", error);

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: "Invalid input data",
          details: error.errors
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: "Internal server error"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}