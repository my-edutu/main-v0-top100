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

export function findAuditRegressions(report: NpmAuditReport): string[] {
  if (!report.vulnerabilities || typeof report.vulnerabilities !== 'object' ||
      Array.isArray(report.vulnerabilities)) {
    throw new Error('npm audit did not return a vulnerabilities map.')
  }

  return Object.entries(report.vulnerabilities)
    .filter(([, vulnerability]) => vulnerability.severity === 'high' || vulnerability.severity === 'critical')
    .map(([packageName]) => packageName)
    .sort()
}

function main() {
  const [auditReportPath] = process.argv.slice(2)
  if (!auditReportPath) {
    console.error('Usage: tsx scripts/check-audit-regressions.ts <npm-audit.json>')
    process.exit(2)
  }

  const report = JSON.parse(readFileSync(auditReportPath, 'utf8')) as NpmAuditReport
  const regressions = findAuditRegressions(report)
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
