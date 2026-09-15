export function isAuthDebugEnabled(nodeEnv: string | undefined): boolean {
  return nodeEnv === 'development'
}
