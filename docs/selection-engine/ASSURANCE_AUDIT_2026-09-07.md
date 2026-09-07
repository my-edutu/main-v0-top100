# Top100 Selection Engine — assurance audit, 7 September 2026

## Decision

**NO-GO for unsupervised real-applicant decisions.** This is a draft hardening pass on PR #3, not production approval. A green build, polished screen, OCR confidence or a reviewer checkbox does not prove an applicant is genuine. No claim is made about Mastercard Foundation's private systems or compliance with an identity assurance standard.

Inspected baseline: `f3465bf67b0ce06003a62af807294641a2b5b150` on `feat/top100-selection-engine-foundation`. Work is isolated on `fix/selection-assurance-review-20260907`. Integrating the feature with current `main` remains separate work. Do not merge or activate this branch until the remaining gates pass.

## Evidence-backed findings

| Severity | Baseline finding and location | Consequence | This pass |
|---|---|---|---|
| Critical | `lib/selection/processor.ts` promotes OCR classification to `verified_first_class` and confidence >= 0.55 to verified evidence without holder or issuer verification. | A readable borrowed or fabricated certificate can appear verified. | OCR stays provisional; academic and BGS points require human verification. |
| Critical | `lib/selection/review.ts` accepts final decisions based on score bounds and short notes alone. | High scores can bypass unconfirmed academic eligibility. | Structured source/holder/merit/COI attestations and equivalence references required. A receipt is still not proof the check was honestly performed. |
| Critical | `app/admin/selection/review/page.tsx` reads private data with a service-role client without calling the authoritative server admin guard at that boundary. | Privacy depends on outer middleware/client behavior. No live exploit was attempted. | Explicit server authorization precedes applicant data access. |
| Critical | Review and publication routes perform separate assessment, result and audit writes; audit errors are ignored. | Partial saves, stale results and incomplete evidence of decisions. | Transactional RPCs, optimistic revision checks and mandatory audit insertion. Database tests must pass. |
| High | Review queue renders PDF metadata but no original-document access. | A reviewer cannot examine the evidence from the decision screen. | Admin-only, application-scoped, fingerprint-checked PDF proxy with no-store headers and audited access. |
| High | One administrator can publish any non-review result without a separate reviewer or committee gate. | Consequential results can bypass independent scrutiny. | Separate publisher; qualified results require a current approved ranking and two approvals. |
| High | Review queue caps at 100, uses the first nested assessment, renders many editable forms and exposes raw errors. | Hidden backlog, stale-policy selection, accidental loss of other drafts and confusing failure states. | Search, 25-case pages, current-policy selection, one focused case, persistent errors and stale-revision blocking. |
| High | `refresh_selection_job_counts` counts all historical policy assessments. | One applicant can inflate processed counts or violate the total-count constraint. | Counts applications against the current cycle policy. |
| High | Historical decisions predate the new verification receipt. | Old decisions could bypass a newly introduced gate. | Proposed migration reopens undocumented assessments, revokes links and records audit events. This is a deliberate rollout effect, not a silent production operation. |
| Critical — open | `lib/selection/worker.ts` chooses only the highest-confidence extraction and reuses extraction without binding it to the previously processed hash. | Contradictory documents or changed bytes can be misinterpreted. | Final decisions are gated, but full document reconciliation and hash-bound extraction remain required. |
| Critical — open | Worker assessment writes precede the final lock-token check. | A stale worker can overwrite or disrupt a newer decision. | New trigger removes inherited verification and revokes publication, but complete fenced worker transactions remain required. |
| Critical — open | Ranking route reads applications without paging/count reconciliation. | Large cohorts risk incomplete rankings at the configured API row limit. | Not claimed fixed. Test at 999, 1000, 1001 and 10000 applicants and freeze from a complete database snapshot. |
| High — open | `ranking.ts` resolves exact ties alphabetically by applicant name. | A name can determine a winner at the cutoff without substantive merit difference. | Not claimed fixed. Programme owners must approve a neutral published tie policy; block cutoff ties until then. |
| High — open | Ranking checksum excludes document hashes, review revisions and model provenance; approval records are mutable. | Reproducibility and committee auditability are incomplete. | Revision changes void runs, but the complete immutable ranking/approval protocol still needs review. |
| High — open | Extraction is English phrase matching; institution matching is not a verified registry. | Legitimate African equivalents, transliterations, renamed institutions and local classifications may be missed. | Unicode institution normalization and explicit equivalence reference added; multilingual issuer/qualification calibration remains open. |
| High — open | There is no demonstrated end-to-end corrections/appeals operation or retention execution. | Applicants may receive an explanation without an effective remedy; deletion can conflict with append-only audit FKs. | Requires a named owner, accessible correction/appeal mechanism and tested retention design. |

## Reviewer workflow implemented

The screen separates **claims**, **original evidence**, **verification**, **rubric scores** and **the final explanation**. No final verdict is preselected. Unknown evidence remains unresolved, not fraud. An explicit final confirmation precedes saving; the old result is revoked and the new result remains private. Fields are disabled while saving. Errors remain visible, status messages use an announced live region and unsaved changes trigger a full-page navigation warning. No draft PII is placed in localStorage.

The case list is paginated and searchable. A focused case shows all attached evidence links and current-policy assessment metadata. Original PDFs are served through an authenticated proxy rather than a public bucket or reusable browser storage token. Each successful grant checks the saved SHA-256 and writes a private audit event. This is document access, not antivirus clearance or proof of authenticity.

**Not demonstrated:** browser rendering, keyboard/screen-reader behavior, automated accessibility scan, measured colour contrast, slow-network/mobile usability, hosted PDF streaming limits, or end-to-end deployment. Do not describe this as WCAG-conformant or visually production-approved.

## Scenario matrix

| Scenario | Required disposition / test |
|---|---|
| Borrowed certificate with convincing First Class text | Never automatically verified; human holder/source checks. |
| BGS wording copied into a document | No automatic distinction points. |
| Unknown GPA scale or local equivalent | No universal GPA conversion; approved institution-specific equivalence or review. |
| Grading legend includes First/Second/Third Class | Conflicting/ambiguous extraction, not automatic First Class. |
| NaN, infinite, negative or >1 OCR confidence | Unreadable/invalid confidence; review. |
| Genuine applicant uploads poor scan | Request replacement/evidence; do not label fraud. |
| Sparse narrative or model outage | Unresolved; never manufacture evidence or zero-score rejection. |
| Reviewer knows applicant personally | Cannot finalize while declaring a conflict; recusal/assignment workflow still required. |
| High merit score but unconfirmed academic status | Final qualification blocked. |
| Two reviewers edit the same revision | Second stale write rejected; draft preserved for comparison. |
| Audit insert fails | Review/result/count changes roll back together in the new RPC. |
| Reviewer tries to publish own decision | Blocked. |
| Qualified applicant has one committee approval | Publication blocked. |
| Revised assessment after committee approval | Revoke prior result token and void ranking approval. |
| Automated retry touches an old reviewed assessment | Strip inherited verification; reopen and revoke. Full stale-worker fencing still open. |
| Multiple historical policy versions | Count one applicant under active policy. |
| More than 100 review cases | Paged case list; no hidden 100-case cap. |
| More than configured ranking API row cap | Release blocker until count-reconciled ranking is implemented and tested. |
| Identical scores at winner/reserve cutoff | Release blocker until approved neutral tie policy is implemented. |
| Different language, institution alias, accessibility need | Supervised review and representative calibration; no disadvantage inferred from format. |
| Provider timeout, duplicate retries, concurrent approvals | Full fault-injection and concurrency pilot still required. |
| Tampered or mismatched evidence URL | Application-scoped lookup and fingerprint check; unauthorized access must return no bytes. |
| Appeal after publication or changed policy/evidence | Complete cycle state, supersession and read-time validity tests still required. |

## Verification evidence and limits

An offline Node/TypeScript harness reproduced **14 failures out of 18** adversarial checks against exact fetched baseline processor/review blobs. The candidate passed all 18. The expanded source test cases passed **34/34** using a standalone Node assertion adapter, including the updated processor/review regressions. These are not 34 different production journeys, not a real Vitest installation, and not live issuer checks. Syntax transpilation is not full typechecking.

The new `Selection assurance database checks` workflow applies the five foundation migrations plus the proposed assurance migration to disposable PostgreSQL, then exercises actual functions, role permissions, stale revisions, committee gates, invalidation and rollback after an injected audit failure. Its outcome must be taken from the exact commit's GitHub Actions run, not this document. The existing repository Quality Gate provides the full tests, lint and build; old PR #3 results are not fresh validation.

No real applicants, actual credentials or production databases were used. No provider-backed pilot or live deployment is asserted.

## 100-point release scorecard — requirements, not an achieved rating

| Gate | Weight | Evidence required |
|---|---:|---|
| Evidence authenticity and holder binding | 20 | Approved verification methods, immutable source receipts, changed-document checks and representative false-accept/false-reject review. |
| Decision integrity and reproducibility | 20 | Frozen policy and complete source manifest, all-document reconciliation, bounded scores, deterministic recomputation. |
| Privacy and authorization | 15 | Non-admin/demoted-user/IDOR tests, private evidence, minimal logs, retention and deletion verification. |
| Fairness and programme fit | 15 | Approved academic equivalents, neutral tie rules, contextual impact assessment and multilingual calibration. |
| Operational resilience | 10 | Fenced retries, crash recovery, concurrency tests, complete cohort counts, monitoring and recovery drill. |
| Reviewer UX and accessibility | 10 | Tested desktop/mobile, keyboard and screen reader journeys; error recovery; no accidental final actions. |
| Committee governance and applicant remedy | 10 | Independent approvals, recusal, accountable overrides, working correction/appeal process and named owners. |
| **Total possible** | **100** | **No critical blocker may be waived by points earned elsewhere.** |

A 100/100 checklist would mean every agreed acceptance test and governance gate passed for the stated release scope. It would not mean every possible real-world situation has been mathematically proven safe.

## Rollout boundary

Keep this PR draft and stacked on PR #3. Review the migration's deliberate legacy reopening and token revocation before preview application. Run fresh CI, integrate with current main, deploy only to an isolated preview, and complete the existing 120+ invented-applicant pilot across two batches plus the scale/concurrency cases above. Human programme owners must approve eligibility, threshold, tie policy, appeal owners and retention periods. Do not enable real-applicant processing until these conditions are evidenced.
