# Impact Beyond Recognition Experience

**Date:** 2026-09-04  
**Status:** Approved for implementation planning

## Objective

Reposition the public Top100 Africa Future Leaders experience now that 2026 applications are closed. The homepage will lead with the 2026 focus, **Celebrating Impact Beyond Recognition**, and direct visitors toward evidence of what recognised leaders do next. Supporting routes will present previous speakers in a Hall of Fame and bring awardee stories, event moments, interviews, and movement metrics together on an impact hub.

## Product Principles

1. **Impact before application.** Closed application messaging and application-first calls to action must not remain in the homepage hero or primary navigation.
2. **Evidence before claims.** Use existing event photography, awardee records, speaker artwork, interviews, and published stories. Do not invent speaker biographies, job titles, achievements, or quotations.
3. **Recognition as a starting point.** Copy should frame Top100 recognition as an entry into continued service, leadership, collaboration, and measurable change.
4. **Mobile stability.** Carousels and horizontally scrolling collections must support touch, reduced motion, and predictable layout without timer-driven jumps.
5. **Editorial continuity.** Retain the existing orange, black, and warm-white identity while giving photography and individual people greater prominence.

## Information Architecture

### Homepage

The homepage retains its current section-based structure with these changes:

1. Header
2. Impact-focused hero
3. Hall of Fame preview
4. About the movement
5. Rotating vision feature
6. Movement metrics
7. Partners with partnership CTA
8. Existing initiatives, events, stories, awardees, magazine, team, partnership, FAQ, and contact sections

### New routes

- `/impacts`: the central editorial impact hub.
- `/hall-of-fame`: a complete gallery of previous Top100 speakers.
- `/hall-of-fame/[slug]`: an individual speaker profile assembled only from verified local content.

The route uses the hyphenated `/hall-of-fame` form consistently. Navigation labels use “Hall of Fame.”

## Homepage Design

### Header

Remove the standalone “Get Started” button on desktop and mobile. Add direct “Impact” and “Hall of Fame” navigation entries. Partnership, network, and contact actions remain within the Partner menu. On compact screens, the logo and menu trigger are the only persistent header controls, giving the logo adequate room and avoiding competing calls to action.

### Hero

Use the following approved message:

- Eyebrow: **Our 2026 Focus**
- Headline: **Celebrating Impact Beyond Recognition**
- Supporting copy: **Recognition is only the beginning. Discover the leaders turning achievement into lasting change across Africa.**
- Primary CTA: **Explore the impact** → `/impacts`
- Secondary CTA: **Meet the leaders** → `/hall-of-fame`

The country ticker remains as a compact proof point but no longer crowds the primary message. The headline reveal should run once and respect `prefers-reduced-motion`. Remove repeated Intersection Observer animation restarts and random floating-particle movement from the hero.

### Hall of Fame preview

Insert this section immediately before “About the movement.” It introduces previous speakers as leaders who have inspired or supported the Top100 community through a choice to create impact.

The section includes:

- A concise editorial heading and introduction.
- A responsive portrait gallery sourced from existing files in `public/speakers`.
- Speaker name and a neutral “Top100 speaker” label when no verified role exists.
- Links to individual `/hall-of-fame/[slug]` pages.
- A “View the Hall of Fame” CTA to `/hall-of-fame`.

### Vision feature

Replace the single static background with a rotating sequence selected from the real Top100 event gallery (`public/IMG_0672.jpg` through `public/IMG_0685.jpg`). The image transition is a slow crossfade, pauses when the page is not visible, and is disabled when reduced motion is requested.

Reduce the effective dark treatment from the current heavy stacked overlays. Use one approximately 50–55% dark overlay plus a localized text gradient so faces remain visible while the white vision statement continues to meet contrast requirements.

### Movement metrics

Update the awardee count from **400+** to **2,000+**. Keep the existing country and lives-impacted metrics. Counter animation must display the correct final values and must not restart repeatedly during scrolling.

### Partners

Add a visible **Partner with us** CTA after the partner cards, linking to `/partnership`. Keep the three existing verified partner logos and names.

### Stories

Each homepage story must use an image assigned to that story rather than the generic generated fallback. Resolution order:

1. The post’s valid `coverImage`.
2. The matching static post image for the same slug.
3. A curated local editorial image selected by slug or stable index.

The generic text-card cover remains available only when no local or remote image can load. Image alt text uses the post-specific alt text when present and otherwise the post title.

### Awardee carousel

Remove the timer-driven pixel-by-pixel mobile transform and duplicated card track. Replace it with native horizontal scrolling and CSS scroll snapping on mobile and desktop. Cards remain fully usable with touch, mouse, keyboard, and reduced-motion settings. This removes the reset jump and avoids adding document-level pointer event listeners.

### Team

The displayed team becomes:

1. Nwosu Paul Light — Founder
2. Emmanuella Igboafu — Team Lead
3. Gabriel Ajewole — Project Manager
4. Favour Okolie — Partnership Team
5. Kenechukwu Igboasia — Talent Management

Remove Chinedu Nwangwu. Preserve existing verified photos for Paul and Emmanuella. Until supplied, the three new members use consistent, high-quality initial portraits rather than unrelated photographs. Do not add LinkedIn destinations unless supplied and verified.

## Impact Hub

`/impacts` is a documentary-style landing page, not a second homepage. It contains:

1. A hero that carries the “Celebrating Impact Beyond Recognition” focus.
2. The three verified movement metrics.
3. A Hall of Fame preview linking to `/hall-of-fame`.
4. Awardee spotlights sourced through the existing awardee data access layer.
5. Published impact stories sourced through the existing post data access layer.
6. An event-moments gallery sourced from `lib/gallery-data.ts`.
7. A video/interview pathway linking to `/interviews`; it must not render fake video players where no local video asset exists.
8. A closing invitation with links to partnership and the broader awardee directory.

Server components should fetch awardees and posts so the initial page is useful without client-side JavaScript. Only image rotation and optional gallery controls require client components.

## Hall of Fame

### Data model

Create a typed local speaker registry containing:

- `slug`
- `name`
- `portrait`
- optional `announcementArtwork`
- optional `bioArtwork`
- verified `eventYears`
- verified `role` or the neutral fallback “Top100 speaker”
- optional verified `summary`
- optional verified external links

Speaker filenames provide names and image associations but are not sufficient evidence for occupations or achievements. Those fields remain omitted until verified.

### Gallery page

The `/hall-of-fame` gallery includes a strong editorial introduction, responsive portrait cards, event-year context where verified, and links to each profile. Cards use real speaker photos as the dominant visual. The page must remain coherent if a profile contains only a name, portrait, and neutral label.

### Speaker profile page

Each `/hall-of-fame/[slug]` page contains:

- Portrait and name.
- Verified role or neutral label.
- Verified event-year participation when available.
- Existing announcement and bio artwork when associated with the speaker.
- A neutral statement explaining their place in the Top100 speaker community when no text biography exists.
- Navigation back to the Hall of Fame and onward to the impact hub.

Unknown slugs return the standard 404 response. Static params and metadata are generated from the local registry.

## Visual Direction

Use an editorial, documentary-led presentation:

- Orange functions as a decisive accent, not a full-page wash.
- Black/navy sections give event photography cinematic contrast.
- Warm white provides breathing room for profiles and stories.
- Existing brand typography is retained for continuity; hierarchy comes from scale, weight, spacing, and uppercase micro-labels.
- Portraits and event photographs use considered crops, visible captions, and restrained borders.
- Motion is limited to one hero entrance, subtle card hover states, and the vision crossfade.

Avoid purple gradients, generic glass cards, decorative motion without meaning, and fabricated content.

## Components and Boundaries

- A shared typed speaker data module is the single source for homepage previews and Hall of Fame routes.
- A reusable speaker card renders portrait, name, label, and link without owning data fetching.
- The homepage Hall of Fame section accepts a bounded speaker list.
- The rotating vision feature owns rotation state and visibility/reduced-motion behavior but receives its image list as data.
- Existing awardee and post loaders remain the sources for dynamic content.
- A small story-image resolver centralizes the cover fallback policy.
- Team member data includes an optional image; the card owns the initial-placeholder rendering.

These boundaries keep content data independent from page layout and allow verified biographies or headshots to be added later without restructuring the UI.

## Accessibility and Responsive Behavior

- All interactive elements have visible focus states and descriptive labels.
- Horizontal galleries expose native scroll behavior and do not trap vertical gestures.
- Auto-rotating imagery stops under `prefers-reduced-motion` and does not announce every visual change to screen readers.
- Text remains readable at 320px width without clipping or horizontal page overflow.
- Images use meaningful alt text; decorative overlays are hidden from assistive technology.
- Color contrast meets WCAG AA for normal text.

## Error and Empty States

- Failed speaker or team images fall back to initial portraits.
- Missing optional speaker fields are omitted; no empty headings are rendered.
- Empty awardee or story results display the existing controlled empty states.
- Missing story covers follow the curated resolver policy.
- Unknown Hall of Fame slugs render the standard 404 page.

## Verification

Implementation is complete when:

1. TypeScript checking passes for all touched code.
2. Relevant unit tests cover speaker lookup, static paths, and story-image fallback resolution.
3. The homepage, `/impacts`, `/hall-of-fame`, and at least one speaker profile render successfully.
4. Browser checks at approximately 398×814 and desktop width confirm no horizontal page overflow, usable navigation, readable overlays, stable awardee scrolling, and correct CTA destinations.
5. Reduced-motion emulation confirms that automatic crossfades and entrance motion are suppressed.
6. Existing user changes outside this feature remain untouched.

## Out of Scope

- A speaker CMS or new database tables.
- Inventing or web-scraping speaker biographies and job titles.
- Uploading new team headshots.
- Hosting new video media.
- Reopening or redesigning the 2026 application flow.
- Changing admin, member-dashboard, award-processing, or authentication behavior.
