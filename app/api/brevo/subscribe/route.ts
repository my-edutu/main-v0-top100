import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
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

    // Make request to Brevo API to add contact
    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': brevoApiKey,
      },
      body: JSON.stringify({
        email: email,
        attributes: {
          SOURCE: 'Magazine2025Page'
        },
        listIds: [process.env.BREVO_LIST_ID ? parseInt(process.env.BREVO_LIST_ID) : 1], // Default to list ID 1 if not set
        updateEnabled: true, // Update contact if already exists
      }),
    });

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