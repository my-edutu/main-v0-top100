'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const JoinSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  interestType: z.enum(['member', 'partner', 'sponsor', 'volunteer', 'general']).default('member'),
  fullName: z.string().optional(),
  organization: z.string().optional(),
  message: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
})

export type JoinFormData = z.infer<typeof JoinSchema>

export async function handleJoinSubmission(formData: FormData) {
  try {
    const email = formData.get('email') as string
    const interestType = (formData.get('interestType') as string) || 'member'
    const fullName = formData.get('fullName') as string
    const organization = formData.get('organization') as string
    const message = formData.get('message') as string
    const country = formData.get('country') as string
    const phone = formData.get('phone') as string

    // Validate the input
    const validatedFields = JoinSchema.safeParse({
      email,
      interestType,
      fullName,
      organization,
      message,
      country,
      phone,
    })

    if (!validatedFields.success) {
      return {
        success: false,
        message: 'Invalid input. Please check your information.',
        errors: validatedFields.error.flatten().fieldErrors,
      }
    }

    const data = validatedFields.data

    // 1. Store in Supabase interest_registrations table
    const supabaseClient = createClient()
    const { error: dbError } = await supabaseClient
      .from('interest_registrations')
      .insert({
        email: data.email,
        interest_type: data.interestType,
        full_name: data.fullName || null,
        organization: data.organization || null,
        message: data.message || null,
        country: data.country || null,
        phone: data.phone || null,
        metadata: {
          source: 'Join Page',
          submitted_at: new Date().toISOString(),
        },
      })

    if (dbError) {
      console.error('Error storing interest registration:', dbError)
      return {
        success: false,
        message: 'Failed to process your request. Please try again.',
      }
    }

    // 2. Add to Brevo contact list
    try {
      const brevoApiKey = process.env.BREVO_API_KEY

      if (brevoApiKey) {
        const contactResponse = await fetch('https://api.brevo.com/v3/contacts', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'api-key': brevoApiKey,
          },
          body: JSON.stringify({
            email: data.email,
            attributes: {
              FIRSTNAME: data.fullName?.split(' ')[0] || '',
              LASTNAME: data.fullName?.split(' ').slice(1).join(' ') || '',
              SOURCE: 'Join Page',
              INTEREST_TYPE: data.interestType.toUpperCase(),
              ORGANIZATION: data.organization || '',
              COUNTRY: data.country || '',
              CREATED_AT: new Date().toISOString(),
            },
            updateEnabled: true, // Update if contact already exists
          }),
        })

        if (!contactResponse.ok) {
          const errorData = await contactResponse.json()
          console.error('Error adding contact to Brevo:', errorData)
          // Don't fail the whole operation if Brevo fails
        }
      }
    } catch (brevoError) {
      console.error('Error syncing with Brevo:', brevoError)
      // Continue even if Brevo fails - we still have the DB record
    }

    return {
      success: true,
      message: "Thank you for your interest! We'll be in touch soon.",
    }
  } catch (error) {
    console.error('Error in handleJoinSubmission:', error)
    return {
      success: false,
      message: 'An unexpected error occurred. Please try again later.',
    }
  }
}
