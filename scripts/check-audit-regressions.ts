import { readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

type AuditViaDetail = {
  source?: number
  name?: string
  dependency?: string
  title?: string
  url?: string
  severity?: string
  range?: string
}

export type AuditVulnerability = {
  severity?: string
  via?: Array<string | AuditViaDetail>
}

export type NpmAuditReport = {
  vulnerabilities?: Record<string, AuditVulnerability>
}

const BASELINE_PACKAGES = new Set(['deepmerge-ts', '@prisma/config', 'prisma'])
const BASELINE_ADVISORY_URL = 'https://github.com/advisories/GHSA-ggr8-5vv4-36mx'

const isHighSeverity = (severity?: string): boolean =>
  severity === 'high' || severity === 'critical'

const hasExpectedDirectAdvisory = (vulnerability?: AuditVulnerability): boolean =>
  Boolean(
    vulnerability?.via?.some(
      (via) => typeof via === 'object' && via !== null && via.url === BASELINE_ADVISORY_URL,
    ),
  )

export function findAuditRegressions(report: NpmAuditReport): string[] {
  const vulnerabilities = report.vulnerabilities ?? {}
  const regressions: string[] = []

  for (const [packageName, vulnerability] of Object.entries(vulnerabilities)) {
    if (!isHighSeverity(vulnerability.severity)) continue

    if (!BASELINE_PACKAGES.has(packageName)) {
      regressions.push(packageName)
      continue
    }

    if (packageName === 'deepmerge-ts' && !hasExpectedDirectAdvisory(vulnerability)) {
      regressions.push(packageName)
    }
  }

  const highBaselinePackages = [...BASELINE_PACKAGES].filter((packageName) =>
    isHighSeverity(vulnerabilities[packageName]?.severity),
  )

  if (
    highBaselinePackages.length > 0 &&
    !hasExpectedDirectAdvisory(vulnerabilities['deepmerge-ts'])
  ) {
    for (const packageName of highBaselinePackages) {
      if (!regressions.includes(packageName)) regressions.push(packageName)
    }
  }

  return regressions.sort()
}

function main() {
  const [auditReportPath] = process.argv.slice(2)
  if (!auditReportPath) {
    console.error('Usage: tsx scripts/check-audit-regressions.ts <npm-audit.json>')
    process.exit(2)
  }

  const report = JSON.parse(readFileSync(auditReportPath, 'utf8')) as NpmAuditReport
  const regressions = findAuditRegressions(report)
  const vulnerabilities = report.vulnerabilities ?? {}

  if (hasExpectedDirectAdvisory(vulnerabilities['deepmerge-ts'])) {
    console.log(
      'Known audit baseline: GHSA-ggr8-5vv4-36mx through deepmerge-ts -> @prisma/config -> prisma.',
    )
  }

  if (regressions.length === 0) {
    console.log('No new high or critical dependency audit regressions detected.')
    return
  }

  console.error(`New high/critical audit regression(s): ${regressions.join(', ')}`)
  process.exit(1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main()
}
