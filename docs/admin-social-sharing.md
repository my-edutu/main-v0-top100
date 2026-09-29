# Admin awardee social sharing

The admin Awardee directory share button opens a review popup. It loads the latest public profile, generates editable platform style copy with OpenAI, and shows the awardee image before any sharing action. OpenAI caption generation runs on the server with `OPENAI_API_KEY`; the key is never sent to the browser. Only public profile details are supplied, and the Responses API request sets `store: false`.

The composer uses the latest public name, bio, headline, country, field of study, cohort/year, listed achievements, and public impact counts. In the Social Sharing workspace it can save a timestamped source snapshot with each draft, refresh the profile, and mark a saved draft stale if the public profile changed since that snapshot.

## Review and share

Each public awardee row and card in Admin → Awardees has a share icon. Clicking it opens a popup with the latest public image and profile facts, plus an AI generated caption that the admin can edit. The LinkedIn, Facebook, and Instagram buttons choose the caption style. **Choose platform & share** opens the device share sheet, where the admin chooses the destination app. The popup never publishes directly to LinkedIn or another platform.

The browser shares the image file when its share sheet supports image files and the image host permits browser access. Otherwise it shares the caption and profile link, and the admin can use **Download image** and **Copy caption** to finish in the selected platform. Browsers without a share sheet can still use these manual options.

OpenAI generation requires the server-only `OPENAI_API_KEY`. The key never leaves the server. No LinkedIn access token or organization publishing configuration is used.

The Social Sharing workspace can save drafts and record a post after an admin shares it elsewhere. Apply `supabase/migrations/20260926003251_admin_awardee_social_sharing.sql` in the target database before using saved drafts and share history. If that migration has already been applied in another environment, add a forward migration there instead of replaying it.
