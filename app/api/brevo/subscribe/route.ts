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
      console.error('BREVO_API_KEY is not set in environment variables');
      return Response.json({ error: 'Server configuration error' }, { status: 500 });
    }

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

    // Check for duplicate contact (which is actually a success case with updateEnabled)
    if (response.status === 400) {
      const errorData = await response.json();
      // If contact already exists and updateEnabled is true, this is fine
      if (errorData.code === 'duplicate_parameter') {
        return Response.json({ message: 'You\'re already subscribed!' });
      }
      console.error('Error adding contact to Brevo:', errorData);
      return Response.json({ error: 'Failed to subscribe. Please try again.' }, { status: 400 });
    }

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error adding contact to Brevo:', errorData);
      return Response.json({ error: 'Failed to subscribe to newsletter' }, { status: response.status });
    }

    return Response.json({ message: 'Successfully subscribed to newsletter' });
  } catch (error) {
    console.error('Error in Brevo subscription API:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}