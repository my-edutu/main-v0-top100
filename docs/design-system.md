# Top100 Africa Future Leaders – Design System

## 1. Brand Fundamentals
- **Essence**: Bold optimism, community-powered progress, technology-first delivery for African leadership.
- **Tone**: Confident, warm, future-facing.
- **Design Principles**:
  - *Clarity*: Prioritise legibility and hierarchy with generous spacing.
  - *Momentum*: Use dynamic gradients, angular accents, and layered depth to suggest forward motion.
  - *Trust*: Keep contrast high and interaction states distinct across light and dark themes.
  - *Scalability*: All tokens and components live in Tailwind + CSS custom properties for easy extension.

## 2. Color System
All palette values surface through CSS custom properties (`--token-name`) declared in `styles/globals.css`. Tailwind utilities map to the same tokens (`bg-primary`, `text-muted-foreground`, etc.).

### 2.1 Core Tokens
| Token | Usage | Light (HSL) | Dark (HSL) |
| --- | --- | --- | --- |
| `--background` | App background | 36 33% 98% | 240 16% 7% |
| `--foreground` | Primary text | 25 71% 11% | 32 45% 96% |
| `--surface` | Neutral raised surfaces | 30 35% 96% | 240 21% 12% |
| `--surface-strong` | Cards, panels | 24 30% 92% | 240 24% 18% |
| `--card` | Default card fill | 30 35% 96% | 240 21% 12% |
| `--card-foreground` | Card text | 20 50% 15% | 26 48% 96% |
| `--popover` | Popovers/menus | 0 0% 100% | 240 22% 14% |
| `--popover-foreground` | Popover text | 20 53% 13% | 32 45% 96% |
| `--border` | Dividers, outlines | 28 28% 82% | 240 17% 28% |
| `--input` | Form controls | 28 28% 82% | 240 17% 26% |
| `--ring` | Focus ring | 23 94% 55% | 23 94% 62% |

### 2.2 Brand & Semantic Tokens
| Token | Description | Light (HSL) | Dark (HSL) |
| --- | --- | --- | --- |
| `--primary` | Brand orange (actions, highlights) | 23 94% 55% | 23 94% 58% |
| `--primary-foreground` | Text on primary | 28 100% 98% | 28 100% 96% |
| `--secondary` | Deep teal (complementary) | 188 72% 28% | 188 62% 52% |
| `--secondary-foreground` | Text on secondary | 186 100% 93% | 190 100% 12% |
| `--accent` | Electric violet for call-outs | 262 89% 63% | 262 89% 66% |
| `--accent-foreground` | Text on accent | 260 100% 12% | 260 100% 12% |
| `--muted` | Subtle backgrounds | 30 23% 92% | 240 19% 20% |
| `--muted-foreground` | Muted text | 24 18% 36% | 28 18% 68% |
| `--destructive` | Critical actions | 0 78% 56% | 0 82% 62% |
| `--destructive-foreground` | Text on destructive | 0 0% 98% | 0 0% 96% |
| `--success` | Positive states | 154 52% 36% | 154 52% 48% |
| `--success-foreground` | Text on success | 152 100% 94% | 152 100% 14% |
| `--warning` | Warning states | 37 96% 52% | 37 96% 58% |
| `--warning-foreground` | Text on warning | 33 100% 10% | 35 100% 12% |
| `--info` | Informational states | 210 88% 54% | 210 88% 60% |
| `--info-foreground` | Text on info | 210 100% 97% | 210 100% 12% |

### 2.3 Chart Palette
| Token | Light | Dark |
| --- | --- | --- |
| `--chart-1` | 18 86% 56% | 18 86% 58% |
| `--chart-2` | 186 65% 36% | 186 65% 48% |
| `--chart-3` | 264 84% 60% | 264 84% 66% |
| `--chart-4` | 48 96% 54% | 48 96% 60% |
| `--chart-5` | 328 78% 60% | 328 78% 66% |

### 2.4 Sidebar Tokens
| Token | Light | Dark |
| --- | --- | --- |
| `--sidebar-background` | 28 35% 94% | 240 21% 11% |
| `--sidebar-foreground` | 25 60% 18% | 32 45% 92% |
| `--sidebar-primary` | 23 94% 55% | 23 94% 58% |
| `--sidebar-primary-foreground` | 28 100% 98% | 28 100% 96% |
| `--sidebar-accent` | 188 45% 88% | 240 28% 20% |
| `--sidebar-accent-foreground` | 188 60% 20% | 188 42% 86% |
| `--sidebar-border` | 27 28% 82% | 240 18% 24% |
| `--sidebar-ring` | 23 94% 55% | 23 94% 58% |

## 3. Typography
- **Primary Typeface**: Space Grotesk (loaded already). Use as sans serif for headlines and UI copy.
- **Secondary Typeface (body)**: Space Grotesk weights 400–500.
- **Monospace**: Geist Mono (system fallbacks).

### 3.1 Scale
| Token | Style | Size / Line-height | Usage |
| --- | --- | --- | --- |
| `display-2xl` | `text-[56px]` / 64px | Hero moments |
| `display-xl` | `text-[48px]` / 56px | Hero eyebrow / large |
| `heading-xl` | `text-[40px]` / 48px | Section hero |
| `heading-lg` | `text-[32px]` / 40px | Section titles |
| `heading-md` | `text-[28px]` / 36px | Content headers |
| `heading-sm` | `text-[24px]` / 32px | Card titles |
| `title` | `text-[20px]` / 28px | Form headings |
| `body-lg` | `text-[18px]` / 28px | Lead text |
| `body` | `text-[16px]` / 26px | Paragraphs |
| `body-sm` | `text-[14px]` / 22px | Secondary text |
| `caption` | `text-[12px]` / 18px | Meta, helper text |
| `eyebrow` | uppercase tracking [0.2em], `text-[12px]` | Section labels |

## 4. Layout & Sizing
- **Spacing scale**: 4px base unit. Tailwind spacing tokens (`2`, `3`, `4`, etc.) align with multiples; introduce `18 (4.5rem)`, `30 (7.5rem)`, `38 (9.5rem)` for hero layouts.
- **Container widths**: Base `max-w-[1200px]`, wide `max-w-[1440px]`.
- **Border radius**:
  - `--radius`: 16px (`rounded-2xl` surfaces)
  - Medium surfaces: 12px (`rounded-xl`)
  - Chips/Pills: 9999px
- **Elevation**:
  - `shadow-xs`: `0 1px 2px / 8%`
  - `shadow-sm`: `0 4px 12px / 12%`
  - `shadow-md`: `0 10px 30px / 15%`
  - `shadow-lg`: `0 18px 40px / 18%`
- **Grid**: Use 12-col responsive grid with 24px gutters on desktop, 16px on tablet, 12px on mobile.

## 5. Motion
- **Micro-interactions**: `transition-all duration-200 ease-out` for hover/focus.
- **Entrance**: Use `animate-in`, `fade-in`, `slide-in-from-bottom-4` for sequential content.
- **Accordion/menus**: 200ms `ease-out`/`ease-in` pair already configured via `accordion-down` & `accordion-up`.

## 6. Components
Each component consumes tokens through Tailwind utilities. Key specifications:

### Buttons
- Default: `bg-primary text-primary-foreground`, pill radius (`rounded-full` on primary, `rounded-xl` on secondary), `px-5 py-2.5`.
- Outline: `border border-border bg-surface hover:bg-surface-strong`.
- Ghost: transparent background with subtle `hover:bg-muted`.
- Icon: 44px square, emphasised focus ring `ring-2 ring-offset-2`.

### Inputs & Form Controls
- Height 44px, padding `px-4`.
- Border uses `border-input`; focus uses `ring-2 ring-ring`.
- Helper/error text uses `text-muted-foreground` / `text-destructive`.

### Cards & Surfaces
- Containers use `bg-card`, `shadow-md`, `rounded-2xl`, `border-border/60`.
- Sections use `gap-6` and `p-6` by default.
- Glass variants use `bg-card/90 backdrop-blur`.

### Navigation
- Header: translucent surface with blur on scroll, `border-border/50`.
- Active links: `text-primary` + bottom indicator `after:bg-primary`.
- Mobile menu: uses `bg-surface-strong`.

### Feedback Elements
- Badge statuses map to `success`, `warning`, `info`, `destructive`.
- Toasts use `shadow-lg` + accent stripe left border.

### Illustrative Treatments
- Gradients:
  - `--gradient-brand`: `linear-gradient(120deg, hsl(23 94% 60%) 0%, hsl(262 89% 63%) 100%)`
  - `--gradient-hero`: `radial-gradient(circle at 20% 20%, hsl(37 96% 82%) 0%, transparent 60%)`
- Use layered subtle noise (`bg-[image:var(--texture-noise)]`) where appropriate.

## 7. Accessibility & States
- Minimum contrast: AA for text/icons. Primary on surface > 4.5:1.
- Focus states: always visible with `outline-none` + `ring-2 ring-ring ring-offset-2`.
- Disabled: `opacity-60` + `cursor-not-allowed`.
- Dark mode mirrors semantics; verify hover/active lighten by +8% lightness.

## 8. Implementation Notes
- Tokens live in `styles/globals.css`; Tailwind references them (`bg-surface`, `text-muted-foreground`, `border-border`).
- Reusable component styles updated under `components/ui`.
- Utility classes added for backgrounds: `bg-surface`, `bg-surface-strong`, `bg-gradient-brand`, etc., via Tailwind `backgroundImage`.
- Use `data-theme` attributes if section-specific palettes are needed; fall back to body class toggled by `next-themes`.

## 9. Usage Checklist
1. Use semantic utilities (`bg-primary`, `text-muted-foreground`) over raw colour values.
2. Default spacing: `space-y-6` for vertical groups, `gap-6` for layouts.
3. Apply `shadow-md` on interactive cards, `shadow-sm` on static surfaces.
4. Wrap pages in gradients or noise backgrounds sparingly to keep focus on content.
5. Validate dark mode after every component change (`class="dark"` on root).

