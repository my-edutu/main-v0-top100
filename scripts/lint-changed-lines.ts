import { readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

export type AddedLineRange = {
  start: number
  end: number
}

export type LintMessage = {
  line?: number
  endLine?: number
  column?: number
  severity: number
  message: string
  ruleId: string | null
  fatal?: boolean
}

export type LintResult = {
  filePath: string
  messages: LintMessage[]
}

export type LintRegression = LintMessage & {
  filePath: string
}

export function parseAddedLineRanges(diffText: string): Map<string, AddedLineRange[]> {
  const ranges = new Map<string, AddedLineRange[]>()
  let currentFile: string | null = null

  for (const line of diffText.split(/\r?\n/)) {
    if (line.startsWith('+++ b/')) {
      currentFile = line.slice(6)
      if (!ranges.has(currentFile)) ranges.set(currentFile, [])
      continue
    }

    if (!currentFile || !line.startsWith('@@')) continue

    const match = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/)
    if (!match) continue

    const start = Number(match[1])
    const count = match[2] === undefined ? 1 : Number(match[2])
    if (count === 0) continue

    ranges.get(currentFile)?.push({ start, end: start + count - 1 })
  }

  return ranges
}

function normalizeLintPath(filePath: string, cwd: string): string {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(cwd, filePath)
  return path.relative(cwd, absolutePath).split(path.sep).join('/')
}

function overlapsChangedLine(message: LintMessage, ranges: AddedLineRange[]): boolean {
  if (message.fatal || !message.line || message.line < 1) return ranges.length > 0

  const messageStart = message.line
  const messageEnd = message.endLine && message.endLine >= messageStart ? message.endLine : messageStart

  return ranges.some((range) => messageStart <= range.end && messageEnd >= range.start)
}

export function findLintRegressions(
  results: LintResult[],
  addedLineRanges: Map<string, AddedLineRange[]>,
  cwd = process.cwd(),
): { regressions: LintRegression[]; baselineFindings: number } {
  const regressions: LintRegression[] = []
  let baselineFindings = 0

  for (const result of results) {
    const relativePath = normalizeLintPath(result.filePath, cwd)
    const ranges = addedLineRanges.get(relativePath) ?? []

    for (const message of result.messages) {
      if (ranges.length > 0 && overlapsChangedLine(message, ranges)) {
        regressions.push({ ...message, filePath: relativePath })
      } else {
        baselineFindings += 1
      }
    }
  }

  return { regressions, baselineFindings }
}

function main() {
  const [eslintReportPath, diffPath] = process.argv.slice(2)
  if (!eslintReportPath || !diffPath) {
    console.error('Usage: tsx scripts/lint-changed-lines.ts <eslint-report.json> <git-diff.txt>')
    process.exit(2)
  }

  const lintResults = JSON.parse(readFileSync(eslintReportPath, 'utf8')) as LintResult[]
  const diff = readFileSync(diffPath, 'utf8')
  const ranges = parseAddedLineRanges(diff)
  const { regressions, baselineFindings } = findLintRegressions(lintResults, ranges)

  if (baselineFindings > 0) {
    console.log(`Ignored ${baselineFindings} lint finding(s) on untouched lines; they remain repository baseline debt.`)
  }

  if (regressions.length === 0) {
    console.log('No lint regressions were found on added or modified lines.')
    return
  }

  console.error(`Found ${regressions.length} lint regression(s) on added or modified lines:`)
  for (const finding of regressions) {
    const severity = finding.severity === 2 ? 'error' : 'warning'
    const location = `${finding.filePath}:${finding.line ?? 0}:${finding.column ?? 0}`
    console.error(`${severity}  ${location}  ${finding.ruleId ?? 'fatal'}  ${finding.message}`)
  }
  process.exit(1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main()
}
