# Ambassador share card

Public page at **`/ambassadors/card`**. An ambassador adds a photo, types their name
and title, and downloads a 1080×1080 PNG to post.

Everything runs in the browser. The photo is never uploaded, so there is no bucket,
no API route, no auth, and no storage cost — and nothing for anyone to abuse.

## Files

| File | Role |
| --- | --- |
| `lib/share-card/frame.ts` | Frame artwork + geometry. **The only file you edit to wire in new artwork.** |
| `lib/share-card/render.ts` | Canvas compositor. Draw order, clipping, pan/zoom maths, text fitting. |
| `app/ambassadors/card/ShareCardStudio.tsx` | The UI: file picker, drag/pinch/zoom, inputs, download/share. |
| `app/ambassadors/card/page.tsx` | Public page + metadata. |

## Installing the artwork

The page currently renders a **built-in placeholder frame** that labels itself
`PLACEHOLDER FRAME — AWAITING ARTWORK`, so it can't be mistaken for the real card.

To go live:

1. Drop the PNG at `public/share-frames/ambassador-2026.png`.
2. In `lib/share-card/frame.ts`, set `src: "/share-frames/ambassador-2026.png"`.
3. Adjust the `photo`, `name`, and `role` rectangles to match the artwork.

The placeholder disappears automatically once `src` is set.

## Designer brief

Deliver **one PNG, 1080×1080, with transparency**.

The artwork is composited **on top of** the ambassador's photo. Wherever the artwork
is transparent, the photo shows through; wherever it's opaque, the artwork wins. So
the photo area must be a genuine transparent hole — not white, not a flattened
mockup photo.

Current geometry (in `frame.ts`, all values in canvas pixels from the top-left):

| Element | Position |
| --- | --- |
| Canvas | 1080 × 1080 |
| Photo hole | circle, 600 × 600, top-left at (240, 132) — centre (540, 432), radius 300 |
| Name | centred on (540, 838), max width 860, Urbanist Bold, white, starts at 74px |
| Title | centred on (540, 916), max width 780, Urbanist SemiBold, orange `#f97316`, uppercase, 3px tracking, starts at 34px |
| Background | `#05060f` behind everything |

These are a starting point, not a constraint — design the card you want and send the
numbers back. Any hole position, size, and shape (`circle`, `rounded`, or `rect`)
works; only `frame.ts` changes.

Two things to keep true:

- **Keep text clear of the hole.** Name and title are drawn *over* the artwork, so
  leave them a quiet area to sit on.
- **Long names shrink, they don't wrap.** Text auto-shrinks from its starting size
  down to `minSize` to fit `maxWidth`. Give the name band enough width that a long
  name is still legible — test with something like "Oluwaseun Adebayo-Okonkwo".

## How it renders

1. Fill `background`.
2. Draw the photo, clipped to the hole, scaled to *cover* it, with the user's pan/zoom.
3. Draw the frame artwork over the full canvas.
4. Draw name and title.

The photo is clipped to the hole and its pan is clamped (`clampTransform`), so a user
physically cannot drag it outside the cut-out or open a gap at the edge.

## Notes

- **Fonts.** `next/font` hashes the family name, so the canvas can't ask for
  "Urbanist" directly. `resolveFontFamily()` reads what `--font-sans` actually
  resolved to and preloads the weights — canvas silently falls back to a default
  face otherwise.
- **Sharing.** Mobile gets a native share sheet via the Web Share API; the button is
  hidden where `navigator.canShare` is absent. Desktop downloads.
- **More frames.** `FRAMES` in `frame.ts` is an array. Add entries and let the studio
  pick one to support several designs.
