'use server'

import { z } from 'zod'
import { subscribeToNewsletter } from '@/lib/brevo'

const SubscribeSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
})

export async function handleSubscribe(formData: FormData) {
  try {
    const email = formData.get('email') as string
    
    const validatedFields = SubscribeSchema.safeParse({
      email,
    })

    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Missing Fields. Failed to subscribe.',
      }
    }

    const result = await subscribeToNewsletter({ email: validatedFields.data.email })
    
    return {
      success: result.success,
      message: result.message,
    }
  } catch (error) {
    return {
      success: false,
      message: 'An error occurred while subscribing. Please try again.',
    }
  }
}