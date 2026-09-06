type Environment = Record<string, string | undefined>

export function isPortfolioWorkerAuthorized(authorization: string | null, env: Environment = process.env) {
  const secret = env.PORTFOLIO_WORKER_SECRET?.trim()
  if (!secret || !authorization) return false
  return authorization === `Bearer ${secret}`
}
