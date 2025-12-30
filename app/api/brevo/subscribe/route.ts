import { NextRequest } from 'next/server';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - prevent spam subscriptions
    const identifier = getClientIdentifier(request.headers);
    const rateLimitResult = checkRateLimit({
      ...RATE_LIMITS.NEWSLETTER,
      identifier: `newsletter:${identifier}`,
    });

    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult, 'Too many subscription attempts. Please try again later.');
    }

    const { email } = await request.json();


    // Validate email
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return Response.json({ error: 'Invalid email address' }, { status: 400 });
    }

    // Brevo API key should be stored in environment variables
    const brevoApiKey = process.env.BREVO_API_KEY;

    if (!brevoApiKey) {
      console.error('[Brevo Subscribe] BREVO_API_KEY is not set in environment variables');
      return Response.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Validate API key format (Brevo API keys typically start with 'xkeysib-')
    if (!brevoApiKey.startsWith('xkeysib-')) {
      console.error('[Brevo Subscribe] BREVO_API_KEY appears to have an invalid format. It should start with "xkeysib-"');
      return Response.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Log that we have a key (for debugging - don't log the actual key!)
    console.log('[Brevo Subscribe] API key found, attempting to add contact:', email.toLowerCase().trim());

    // Get list ID from env or use default
    const listId = process.env.BREVO_LIST_ID ? parseInt(process.env.BREVO_LIST_ID) : undefined;

    // Make request to Brevo API to add contact
    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': brevoApiKey,
      },
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
        attributes: {
          SOURCE: 'Website Newsletter',
          SUBSCRIBED_AT: new Date().toISOString(),
        },
        ...(listId && { listIds: [listId] }),
        updateEnabled: true, // Update contact if already exists
      }),
    });

    // Handle authentication errors specifically
    if (response.status === 401) {
      console.error('[Brevo Subscribe] 401 Unauthorized - API key is invalid or expired. Please check BREVO_API_KEY environment variable.');
      return Response.json({ error: 'Service temporarily unavailable. Please try again later.' }, { status: 503 });
    }

    // Check for duplicate contact (which is actually a success case with updateEnabled)
    if (response.status === 400) {
      const errorData = await response.json();
      // If contact already exists and updateEnabled is true, this is fine
      if (errorData.code === 'duplicate_parameter') {
        return Response.json({ message: 'You\'re already subscribed!' });
      }
      console.error('[Brevo Subscribe] Error adding contact to Brevo:', errorData);
      return Response.json({ error: 'Failed to subscribe. Please try again.' }, { status: 400 });
    }

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[Brevo Subscribe] Brevo API error:', response.status, errorData);
      return Response.json({ error: 'Failed to subscribe to newsletter' }, { status: 500 });
    }

    return Response.json({ message: 'Successfully subscribed to newsletter' });
  } catch (error) {
    console.error('Error in Brevo subscription API:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}