import { redirect } from 'next/navigation'

/**
 * Legacy route. Awardee signup now lives at /signup (directory-claim wizard).
 */
export default function LegacySignUpRedirect() {
  redirect('/signup')
}
