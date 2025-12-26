import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/brevo";
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, createRateLimitResponse } from "@/lib/rate-limit";

// Define a schema for validation
const partnershipFormSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Valid email is required"),
    organization: z.string().optional(),
    message: z.string().min(1, "Message is required"),
});

export async function POST(req: NextRequest) {
    try {
        // Rate limiting - prevent spam
        const identifier = getClientIdentifier(req.headers);
        const rateLimitResult = checkRateLimit({
            ...RATE_LIMITS.CONTACT,
            identifier: `partnership:${identifier}`,
        });

        if (!rateLimitResult.success) {
            return createRateLimitResponse(rateLimitResult, 'Too many submissions. Please try again later.');
        }

        const body = await req.json();


        // Validate the input data
        const validatedData = partnershipFormSchema.parse(body);

        // Create Supabase client
        const supabase = await createClient();

        // Save to messages table in Supabase
        const { data: messageData, error: dbError } = await supabase
            .from('messages')
            .insert({
                name: validatedData.name,
                email: validatedData.email,
                subject: `Partnership Inquiry${validatedData.organization ? ` - ${validatedData.organization}` : ''}`,
                message: validatedData.message,
                type: 'partnership',
                status: 'unread',
                created_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (dbError) {
            console.error("Error saving partnership message to database:", dbError);
            // Continue to send email even if DB save fails
        }

        // Send email notification via Brevo
        const recipientEmail = process.env.PARTNERSHIP_EMAIL || "partnership@top100afl.com";

        const emailHtml = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f97316, #ea580c); padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">New Partnership Inquiry</h1>
          </div>
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="margin: 0 0 15px 0;"><strong>Name:</strong> ${validatedData.name}</p>
            <p style="margin: 0 0 15px 0;"><strong>Email:</strong> <a href="mailto:${validatedData.email}">${validatedData.email}</a></p>
            ${validatedData.organization ? `<p style="margin: 0 0 15px 0;"><strong>Organization:</strong> ${validatedData.organization}</p>` : ''}
            <p style="margin: 0 0 10px 0;"><strong>Message:</strong></p>
            <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">
              <p style="margin: 0; white-space: pre-wrap;">${validatedData.message}</p>
            </div>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="font-size: 12px; color: #6b7280; margin: 0;">
              This message was sent from the Partnership page on Top100 Africa Future Leaders website.
            </p>
          </div>
        </body>
      </html>
    `;

        const emailSent = await sendEmail({
            to: recipientEmail,
            subject: `New Partnership Inquiry from ${validatedData.name}`,
            html: emailHtml,
        });

        if (!emailSent) {
            console.error("Failed to send partnership email notification");
            // If email fails but DB succeeded, still return success
            if (messageData) {
                return Response.json({
                    success: true,
                    message: "Partnership inquiry submitted successfully. We'll get back to you soon.",
                    warning: "Email notification could not be sent"
                });
            }
            return Response.json({
                error: "Failed to process partnership inquiry"
            }, { status: 500 });
        }

        return Response.json({
            success: true,
            message: "Partnership inquiry submitted successfully. We'll get back to you soon!"
        });

    } catch (error) {
        console.error("Error processing partnership form:", error);

        if (error instanceof z.ZodError) {
            return Response.json({
                error: "Invalid input data",
                details: error.errors
            }, { status: 400 });
        }

        return Response.json({
            error: "Internal server error"
        }, { status: 500 });
    }
}
