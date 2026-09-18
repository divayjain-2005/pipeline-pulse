# Design Brief

## Direction

**Warm Ledger** — a calm executive analytics surface set on warm off-white paper with near-black ink, a single deep ink-teal primary, and a restrained three-step risk ramp. It reads like a well-set financial briefing, not a SaaS template.

## Tone

Refined, restrained, editorial — the category cliché is navy-corporate-on-dark-blue, so this pivots to warm paper with teal ink; authority comes from typographic precision and whitespace, never from decoration.

## Differentiation

The **confidence-range rail**: every forecast figure carries a thin horizontal band spanning P10–P90 with a marker at the P50 point estimate, so uncertainty is rendered as a physical object rather than a footnote.

## Color Palette

| Token      | OKLCH (light)        | Role                                                |
| ---------- | -------------------- | --------------------------------------------------- |
| background | `0.975 0.004 85`     | Warm paper page surface                             |
| foreground | `0.19 0.012 80`      | Near-black ink text                                 |
| card       | `0.995 0.002 85`     | Raised panel / table surface                        |
| primary    | `0.36 0.062 205`     | Deep ink teal — actions, active nav, primary series |
| accent     | `0.52 0.088 205`     | Brighter teal — focus rings, hover, links           |
| muted      | `0.945 0.006 85`     | Recessed fills, table zebra, inactive chips         |
| destructive| `0.512 0.168 22`     | **High risk** signal only                           |
| warning    | `0.635 0.132 68`     | **Medium risk** signal only                         |
| success    | `0.498 0.104 152`    | **Low risk** / healthy signal only                  |
| chart-1..5 | teal, moss, amber, rose, slate-violet | Ordered by importance; grayscale-distinguishable |

Dark mode ("Boardroom at Night") is warm charcoal `0.168 0.010 80` — deliberately tuned, not inverted grey; primary lifts to `0.715 0.098 200`.

## Typography

- Display: **Space Grotesk** — page titles, forecast headline figures, section headings; tight tracking, tabular numerals.
- Body: **Figtree** — UI labels, table cells, prose, buttons; legible at 12–14px.
- Mono: **Geist Mono** — deal IDs, currency columns, deltas, timestamps; always `tabular-nums`.
- Scale: hero `text-5xl md:text-6xl font-semibold tracking-tight`, h2 `text-2xl font-semibold tracking-tight`, label `text-[11px] font-semibold uppercase tracking-[0.09em]`, body `text-sm`/`text-base`.

## Elevation & Depth

Depth comes from layered warm surfaces and hairline borders, not shadows: cards sit on `bg-card` with `border-border` plus at most `shadow-subtle`; only popovers and dialogs use `shadow-elevated`.

## Structural Zones

| Zone    | Background             | Border          | Notes                                                       |
| ------- | ---------------------- | --------------- | ----------------------------------------------------------- |
| Header  | `bg-card`              | `border-b`      | Sticky; holds theme toggle, week selector, forecast as-of date |
| Sidebar | `bg-sidebar`           | `border-r`      | Recessed one step below content; active item uses `sidebar-primary` |
| Content | `bg-background`        | —               | Sections alternate `bg-background` and `bg-muted/30`        |
| Footer  | `bg-muted/40`          | `border-t`      | Data provenance + "synthetic CRM dataset" note              |

## Spacing & Rhythm

Generous page gutters (`px-6 lg:px-10`), `gap-6` between cards, `gap-2`/`gap-3` inside them; dense tables use `py-3` rows with hairline `rule-grid` separators and `bg-muted/40` sticky headers.

## Component Patterns

- Buttons: `rounded-md`, primary = solid ink-teal with `shadow-subtle`; secondary = `bg-card` + `border`; ghost for table row actions; hover shifts to `accent`/`secondary`, 220ms.
- Cards: `rounded-lg`, `bg-card`, `border-border`, `shadow-subtle`; KPI cards lead with a `label-section` eyebrow above a large Space Grotesk figure.
- Badges: `rounded` (4px), bordered outline chips using `signal-high` / `signal-medium` / `signal-low`; risk level is always paired with a text label, never color alone.

## Motion

- Entrance: `animate-row-in` staggered ~30ms per table row; `animate-rail-in` scales the confidence band from the left over 600ms, then `animate-marker-in` fades the P50 marker at 450ms.
- Hover: `transition-smooth` (220ms) on borders, backgrounds, and row highlight; no transforms on data rows.
- Decorative: none beyond the rail reveal — motion exists only to explain the forecast, never to entertain.

## Constraints

- Risk color is reserved for risk: rose/amber/moss appear only on risk chips, risk bars, and risk-weighted chart series — never on buttons, headings, or nav.
- Every number is tabular-aligned and every chart has an accessible text summary; risk level is never communicated by color alone.
- Data-dense tables must stay readable at 100–200 rows: hairline separators, sticky headers, no zebra striping heavier than `bg-muted/40`.
- No CSV upload, Kaggle import, accuracy-tracking, or export surfaces — do not reserve layout zones for them.

## Signature Detail

The confidence-range rail — a hairline band with a P50 marker that appears in the hero forecast, in row-level mini-rails, and in the weekly triage list, making forecast uncertainty a visible, consistent object across the entire product.
