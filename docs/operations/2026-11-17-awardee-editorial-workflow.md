# Awardee editorial workflow — 17 November 2026

The staff page is now labelled **Awardee features**. Its primary task is turning a public bio into an impact-led editorial write-up; publishing and record keeping remain secondary steps.

- Search appears without an initial wall of profiles. Browse directory still exposes paginated public results. Choosing a person collapses the picker and opens the writing workspace.
- Public source bio and achievements are available for comparison. Artwork is a secondary disclosure. The writing area has an explicit scoped minimum height so shared admin form CSS cannot shrink it.
- The editor accepts an optional editorial focus. AI rewrites only the selected channel and preserves other channels. Saved drafts continue to store each channel’s reviewed write-up; the editorial focus is temporary guidance for generation.
- Read preview presents the write-up without editing controls. Publishing controls stay under Publish & record. Drafts & posted has its own workspace view, preserving the mounted editor and its unsaved text.
- The AI brief connects documented work to AFL’s purpose of turning recognition into opportunity, collaboration and community service. It distinguishes ambitions from achieved outcomes and forbids fabricated impact metrics, support, affiliations or endorsements.
- The source panel exposes profile-reported impact figures, field and cohort as well as bio and achievements. Supported artwork hosts share one validation function between UI and renderer; unsupported photos are flagged before opening the artwork disclosure.
- Known-stale drafts must be reviewed/resaved before copying or sharing. Recording a confirmed external post intentionally retains its saved snapshot even if the source profile has since changed. An unchanged write-up can be explicitly reapproved against refreshed source facts.

## Verification and live dependency

1,992 tests passed; 27 opt-in database tests skipped. TypeScript, scoped ESLint and scoped whitespace checks passed. Browser checks used the signed-in local page and a real public profile at 390, 768 and 1440 pixels, with no horizontal overflow. Channel and tracker switches preserved the editorial focus. No source profile, saved draft or posting record was mutated during visual checks.

A live rewrite failed. The configured OpenAI credential returned HTTP 401 with `expired_secret_key`; no credential value was printed. Provider credential errors now produce an actionable message while retaining existing editor content. A secure replacement choice was requested from the user. Live generated copy is not verified until the credential is renewed.

No frontend deployment or credential replacement was performed in this revision.
