import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { meNav, resolveDashboardTitle } from '@/app/dashboard/_lib/navigation'

const dashboardRoot = join(process.cwd(), 'app', 'dashboard')
const stepper = readFileSync(join(dashboardRoot, 'project100-application-stepper.tsx'), 'utf8')
const section = readFileSync(join(dashboardRoot, 'project100-scholarship-section.tsx'), 'utf8')

describe('Project100 member UI contract', () => {
  it('exposes the scholarship route through member navigation', () => {
    expect(meNav).toContainEqual(expect.objectContaining({
      label: 'Project100 Scholarship', href: '/dashboard/me/project100-scholarship',
    }))
    expect(resolveDashboardTitle('/dashboard/me/project100-scholarship')).toBe('Project100 Scholarship')
  })

  it('renders the three labelled steps and supports draft resume navigation', () => {
    expect(stepper).toContain("{ label: 'Your details'")
    expect(stepper).toContain("{ label: 'Your participation'")
    expect(stepper).toContain("{ label: 'Support and consent'")
    expect(stepper).toContain("setStep(step + 1)")
    expect(stepper).toContain("setStep(step - 1)")
    expect(section).toContain("view.application ? 'Resume draft' : 'Get started'")
  })

  it('keeps validation, saving, and submission on authenticated server routes', () => {
    expect(stepper).toContain("Use an international phone number.")
    expect(stepper).toContain("Consent is required.")
    expect(stepper).toContain("role=\"alert\"")
    expect(section).toContain("fetch('/api/member/project100'")
    expect(section).toContain("fetch('/api/member/project100/submit'")
    expect(stepper).not.toContain("status: 'submitted'")
  })

  it('provides closed and submitted member states', () => {
    expect(section).toContain("'Applications are closed'")
    expect(section).toContain("'Application submitted'")
    expect(section).toContain("disabled={closed}")
    expect(stepper).toContain('disabled = !canEdit || saving || submitting')
  })
})
