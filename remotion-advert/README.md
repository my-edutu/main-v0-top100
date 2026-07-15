# AFL 2026 Advert (Remotion)

A ~29-second promo video for the **Africa Future Leaders Summit 2026** application,
built with [Remotion](https://remotion.dev). Self-contained — it has its own
`node_modules` and does not touch the Next.js app.

## Scenes

1. **Intro** — logo + "Africa Future Leaders Summit 2026"
2. **Hook** — "Applications are open."
3. **Who** — "Are you Africa's next leader?" with awardee portraits
4. **Benefits** — 31 countries / 2 days / 100 leaders + what you get
5. **Festival** — the grand-finale festival teaser
6. **CTA** — "Apply now" → top100afl.com/apply

## Commands

```bash
cd remotion-advert
npm run dev            # open Remotion Studio to preview/scrub live
npm run render         # vertical 1080x1920 (Reels/TikTok/Stories) -> out/afl-2026-advert.mp4
npm run render:square  # square 1080x1080 (feed posts)
npm run render:wide    # wide 1920x1080 (YouTube / website hero)
```

## Editing

- **Copy / wording** lives in each file under `src/scenes/`.
- **Brand colours & gradients**: `src/theme.ts`.
- **Timing**: the `SCENES` array in `src/Advert.tsx` (frame counts @30fps).
- **Images**: swap the files in `public/` (keep the same names), then re-render.
  Portraits are `leader1–4.jpg`, past-gathering photos `gather1–4.jpg`,
  the festival poster is `festival.png`, and the logo is `logo.png`.

## Note on the festival poster

`public/festival.png` is the **2025** summit poster (the only one available).
Swap it for a 2026 poster when you have one so the finale scene stays current.
