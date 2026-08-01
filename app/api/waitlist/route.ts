import { NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/brevo";
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, createRateLimitResponse } from "@/lib/rate-limit";
import { WAITLIST_PROGRAM_SLUGS, waitlistProgramLabel } from "@/lib/waitlist-programs";

// Waiting-list sign-ups land in the same inbox as other public forms, tagged `waitlist`.
const waitlistSchema = z.object({
    name: z.string().min(1, "Name is required").max(120),
    email: z.string().email("Valid email is required").max(200),
    program: z.enum(WAITLIST_PROGRAM_SLUGS),
    country: z.string().max(120).optional(),
    organization: z.string().max(200).optional(),
    note: z.string().max(2000).optional(),
});

const escapeHtml = (value: string) =>
    value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

export async function POST(req: NextRequest) {
    try {
        const identifier = getClientIdentifier(req.headers);
        const rateLimitResult = checkRateLimit({
            ...RATE_LIMITS.CONTACT,
            identifier: `waitlist:${identifier}`,
        });

        if (!rateLimitResult.success) {
            return createRateLimitResponse(rateLimitResult, "Too many submissions. Please try again later.");
        }

        const body = await req.json();
        const data = waitlistSchema.parse(body);
        const programLabel = waitlistProgramLabel(data.program);

        const messageLines = [
            `Programme: ${programLabel} (${data.program})`,
            data.country ? `Country: ${data.country}` : null,
            data.organization ? `Organisation: ${data.organization}` : null,
            data.note ? `Note: ${data.note}` : null,
        ].filter(Boolean) as string[];

        const supabase = createAdminClient();

        const { error: dbError } = await supabase.from("messages").insert({
            name: data.name,
            email: data.email,
            subject: `Waiting list — ${programLabel}`,
            message: messageLines.join("\n"),
            type: "waitlist",
            status: "unread",
            created_at: new Date().toISOString(),
        });

        if (dbError) {
            console.error("Error saving waitlist signup:", dbError);
            return Response.json({ error: "Could not save your details. Please try again." }, { status: 500 });
        }

        // Notification is best-effort: the signup is already stored.
        const recipientEmail = process.env.WAITLIST_EMAIL || process.env.PARTNERSHIP_EMAIL || "hello@top100afl.com";
        await sendEmail({
            to: recipientEmail,
            subject: `Waiting list signup — ${programLabel}`,
            html: `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="font-size: 20px;">New waiting-list signup</h1>
          <p><strong>Programme:</strong> ${escapeHtml(programLabel)}</p>
          <p><strong>Name:</strong> ${escapeHtml(data.name)}</p>
          <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
          ${data.country ? `<p><strong>Country:</strong> ${escapeHtml(data.country)}</p>` : ""}
          ${data.organization ? `<p><strong>Organisation:</strong> ${escapeHtml(data.organization)}</p>` : ""}
          ${data.note ? `<p><strong>Note:</strong> ${escapeHtml(data.note)}</p>` : ""}
        </body>
      </html>
    `,
        }).catch((error) => {
            console.error("Failed to send waitlist notification email:", error);
            return false;
        });

        return Response.json({
            success: true,
            message: "You're on the list. We'll email you as soon as registration opens.",
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return Response.json({ error: "Invalid input data", details: error.errors }, { status: 400 });
        }

        console.error("Error processing waitlist form:", error);
        return Response.json({ error: "Internal server error" }, { status: 500 });
    }
}
