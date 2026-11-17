/** Server-side release gates. No production feature or email is enabled by default. */
export function talentDiscoveryEnabled(): boolean { return process.env.TALENT_DISCOVERY_ENABLED === 'true' }
export function talentLaunchFlags() {
  return { enabled: talentDiscoveryEnabled(), launched: process.env.TALENT_DISCOVERY_LAUNCHED === 'true', sendingEnabled: process.env.TALENT_UPGRADE_EMAIL_ENABLED === 'true' }
}
