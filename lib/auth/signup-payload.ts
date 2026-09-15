export type SignupPayloadInput = {
  awardeeId: string
  email: string
  password: string
  inviteCode: string
  captchaToken: string
}

export function buildSignupPayload(input: SignupPayloadInput) {
  return {
    awardeeId: input.awardeeId,
    email: input.email,
    password: input.password,
    inviteCode: input.inviteCode,
    captchaToken: input.captchaToken,
  }
}
