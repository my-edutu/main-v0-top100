# Winner spreadsheet import and account claiming

## Admin workflow

Open **Admin → Awardees → Import**. Upload an `.xlsx`, `.xls`, or `.csv` file (maximum 5 MiB and 10,000 data rows). Choose the winners tab and map its **Full name** and **Email** columns. Map a stable winner/application ID wherever available. Enable other tabs and map their Email or Winner ID plus the profile fields they contain. Use **Preview matches** to inspect new records, fields that will be filled, and rows needing manual review. Approve the preview to commit the safe actions.

The importer matches by external ID and normalized email. It never matches by name alone. It fills only empty fields on unclaimed records. Claimed records are skipped. New imported winners stay private until claimed. Every committed batch records its mappings and row-level before/after values. **Undo batch** succeeds only while every affected record is unchanged and unclaimed.

## Winner workflow

At `/signup`, a winner finds their record, enters the email on file and an admin invite code, and verifies control of that email through Supabase Auth. The claim endpoint uses the verified session email; it does not trust an email in the claim request body. One database transaction fills the member profile, links the awardee record, publishes it, and consumes the invite code. The member then lands on a dashboard with the imported name, bio, field, location, photo, headline, and other supported details already populated.

If an email has changed or a match is ambiguous, an admin must correct the winner record before the claim can continue. Existing verified accounts can claim a record with the same email and a valid invite code.

## Before enabling in an environment

1. Apply `supabase/migrations/20260928090000_awardee_import_and_verified_claim.sql` to that environment. The import and claim endpoints depend on its functions and audit tables.
2. Ensure Supabase email sign-in is enabled and email delivery works. For a typed code, the email template must include Supabase's `{{ .Token }}`. A magic link also works: it returns to `/signup`, where the winner enters the invite code again before claiming.
3. Configure the existing Turnstile keys and permitted hostnames in production. The preflight endpoint fails closed when its server secret is missing.
4. Upload the real workbook in preview first. Resolve duplicate IDs/emails, invalid emails, and unmatched secondary-tab rows before committing.

The existing `public/top100 Africa future Leaders 2025.xlsx` remains a separate legacy public asset used by older awardee fallbacks. It contains email addresses; remove its public exposure as a separate migration before treating the website as private-data safe.
