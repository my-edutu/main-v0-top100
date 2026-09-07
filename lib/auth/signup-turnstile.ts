type SiteverifyResult = {
  success?: boolean
  action?: string
  hostname?: string
}

type VerifyOptions = {
  secret: string | undefined
  hostnames: string | undefined
  remoteIp?: string
  request?: typeof fetch
  nodeEnv?: string
}

type SignupPayload = {
  awardeeId: string
  email: string
  password: string
  inviteCode: string
  captchaToken: string
}

export function buildSignupPayload(input: SignupPayload): SignupPayload {
  return {
    ...input,
    email: input.email.trim(),
    inviteCode: input.inviteCode.trim(),
  }
}

export async function verifySignupCaptcha(token: string | undefined, options: VerifyOptions): Promise<boolean> {
  if (!options.secret) return options.nodeEnv !== 'production'
  if (!token || token.length > 2048) return false

  const approvedHostnames = new Set(
    (options.hostnames ?? '')
      .split(',')
      .map((hostname) => hostname.trim())
      .filter(Boolean),
  )
  if (approvedHostnames.size === 0) return false

  try {
    const body = new URLSearchParams({ secret: options.secret, response: token })
    if (options.remoteIp) body.set('remoteip', options.remoteIp)
    const response = await (options.request ?? fetch)('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok) return false
    const result = (await response.json()) as SiteverifyResult
    return result.success === true && result.action === 'signup' && approvedHostnames.has(result.hostname ?? '')
  } catch {
    return false
  }
}
