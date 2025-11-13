'use server'

import { revalidatePath } from 'next/cache'

export type SubscribeFormData = {
  email: string
}

export async function subscribeToNewsletter(data: SubscribeFormData) {
  const { email } = data

  // Validate email
  if (!email || !email.includes('@')) {
    return { success: false, message: 'Please provide a valid email address.' }
  }

  try {
    // Brevo API configuration
    const brevoApiKey = process.env.BREVO_API_KEY
    if (!brevoApiKey) {
      console.error('BREVO_API_KEY is not set')
      return { success: false, message: 'Configuration error. Please contact support.' }
    }

    // Add or update contact in Brevo
    const contactResponse = await fetch(
      'https://api.brevo.com/v3/contacts',
      {
        method: 'POST', // Using POST to create or update
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': brevoApiKey,
        },
        body: JSON.stringify({
          email,
          attributes: {
            SOURCE: 'Website Newsletter',
            CREATED_AT: new Date().toISOString(),
          },
          // Optionally add to a specific list (replace with your list ID from Brevo dashboard)
          // listIds: [1], // Replace with your actual list ID
          updateEnabled: true, // This allows updating the contact if it exists
        }),
      }
    )

    if (!contactResponse.ok) {
      const errorData = await contactResponse.json()
      console.error('Error adding contact to Brevo:', errorData)
      return { 
        success: false, 
        message: 'Failed to subscribe. Please try again later.' 
      }
    }

    revalidatePath('/') // Not strictly necessary for this use case, but included for completeness

    return { 
      success: true, 
      message: 'Thank you for subscribing! Please check your email to confirm your subscription.' 
    }
  } catch (error) {
    console.error('Error in subscribeToNewsletter:', error)
    return { 
      success: false, 
      message: 'An error occurred. Please try again later.' 
    }
  }
}