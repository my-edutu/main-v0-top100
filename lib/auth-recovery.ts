const MIN_ADMIN_PASSWORD_LENGTH = 12
export type RecoverySource = 'admin' | 'member'

export type PasswordRecoveryError = {
  message?: string
  status?: number
} | null

type PasswordRecoveryRequester = {
  resetPasswordForEmail(
    email: string,
    options: { redirectTo: string },
  ): Promise<{ error: PasswordRecoveryError }>
}

type RecoveredPasswordUpdater = {
  updateUser(attributes: { password: string }): Promise<{ error: PasswordRecoveryError }>
  signOut(options: { scope: 'global' }): Promise<{ error: PasswordRecoveryError }>
}

export function passwordRecoveryRedirect(
  origin: string,
  source: RecoverySource = 'admin',
): string {
  const url = new URL('/auth/update-password', origin)
  url.searchParams.set('source', source)
  return url.toString()
}

export function recoverySignInPath(source: RecoverySource, success = false): string {
  const path = source === 'admin' ? '/admin/login' : '/login'
  return success ? `${path}?passwordReset=success` : path
}

export function validateAdminPassword(password: string, confirmation: string): string | null {
  if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_ADMIN_PASSWORD_LENGTH} characters for your new password.`
  }

  if (password !== confirmation) {
    return 'The passwords do not match.'
  }

  return null
}

export async function requestPasswordRecovery(
  auth: PasswordRecoveryRequester,
  email: string,
  origin: string,
  source: RecoverySource,
): Promise<PasswordRecoveryError> {
  const { error } = await auth.resetPasswordForEmail(email.trim(), {
    redirectTo: passwordRecoveryRedirect(origin, source),
  })
  return error
}

export async function requestAdminPasswordRecovery(
  auth: PasswordRecoveryRequester,
  email: string,
  origin: string,
): Promise<PasswordRecoveryError> {
  return requestPasswordRecovery(auth, email, origin, 'admin')
}

export async function updateRecoveredPassword(
  auth: RecoveredPasswordUpdater,
  password: string,
): Promise<PasswordRecoveryError> {
  const { error } = await auth.updateUser({ password })
  if (error) return error

  const { error: signOutError } = await auth.signOut({ scope: 'global' })
  return signOutError
}
