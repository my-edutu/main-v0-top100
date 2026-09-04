import { loadEnvConfig } from '@next/env'
import { evaluateProductionReadiness } from '../lib/production-readiness'

loadEnvConfig(process.cwd())

const requireAwards = process.argv.includes('--require-awards')
const requirePortfolioImages = process.argv.includes('--require-portfolio-images')
const result = evaluateProductionReadiness(process.env, { requireAwards, requirePortfolioImages })

if (result.ready) {
  console.log(
    requireAwards
      ? 'Production configuration is ready for the requested launch scope.'
      : 'Production configuration is ready for the controlled member launch scope.',
  )
  process.exit(0)
}

console.error('Production configuration is not ready:')
for (const issue of result.issues) {
  console.error(`- ${issue.key}: ${issue.message}`)
}
console.error('Secret values were not inspected or printed.')
process.exit(1)
