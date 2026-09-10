# Pangaea Youth Network — Funding Guide AI Design System v1

Derived from the pangaeayouth.org identity: violet-to-green gradient, geometric bold headings, generous rounding. Green is reserved for action and open/positive states.

---

## 1. Colour

### Core palette

| Token | Hex | Use |
|---|---|---|
| Violet 600 | `#7A22CE` | Primary brand, links, violet actions |
| Violet 800 | `#5B1AA0` | Hover/pressed for violet, violet-on-light text |
| Green 500 | `#16B364` | Primary action buttons, "open" state, positive markers |
| Green 600 | `#0E9F56` | Primary button hover |
| Teal 400 | `#3FA9A0` | Gradient start stop only |
| Ink 900 | `#1A1030` | Body text |
| Ink 600 | `#4A4360` | Secondary paragraph text |
| Muted | `#6B6480` | Labels, meta, captions |
| Canvas | `#FAF9FC` | App background, input rest fill |
| Hairline | `#E7E3EF` | Borders, dividers |
| Track | `#EFECF6` | Progress/meter track |
| Chip grey | `#F4F2F8` | Neutral mono chips |

### Tinted surfaces

| Token | Fill | Border | Text |
|---|---|---|---|
| Violet 50 (selected rows, possible fit) | `#F3EBFD` | `#E4D4FA` | `#5B1AA0` |
| Green 50 (strong fit) | `#E6F9EF` | `#C8EFDA` | `#0E7C46` |
| Amber 50 (warning, near deadline, weak fit) | `#FDF4E3` | `#F2E1BE` | `#B7791F` |
| Red 50 (closed, not recommended, failed rule) | `#FCEDEB` | `#F5D6D1` | `#C0392B` |

### Brand gradient

```css
background: linear-gradient(105deg, #3FA9A0 0%, #7A22CE 62%, #8B2BE0 100%);
```
Hero and CTA panels only. White text on it. Max 1–2 background colours per view — do not use gradients as generic decoration.

Score meters use directional gradients:
- Green track fill: `linear-gradient(90deg, #3FA9A0, #16B364)`
- Violet track fill: `linear-gradient(90deg, #8B5CF6, #7A22CE)`

---

## 2. Type

Google Fonts:
```
Poppins:wght@500;600;700
Nunito Sans:opsz,wght@6..12,400;6..12,600;6..12,700
IBM Plex Mono:wght@400;500
```

| Role | Family / weight | Size | Notes |
|---|---|---|---|
| Page title | Poppins 700 | 32–44px | `letter-spacing:-.02em; line-height:1.1` |
| Card & call title | Poppins 600 | 17–24px | `line-height:1.3` |
| Section eyebrow | Poppins 600 | 13px | `letter-spacing:.16em; uppercase; color:#6B6480`, numbered `01 — Colour` |
| Body | Nunito Sans 400 | 15–17px | `line-height:1.6`, `max-width:52–70ch` |
| Emphasis / chips | Nunito Sans 600–700 | 12–15px | |
| Dense table text | Nunito Sans 400 | 14px | Lower bound — never smaller |
| Labels, IDs, dates, hex values | IBM Plex Mono 400–500 | 11–13px | `letter-spacing:.12em; uppercase` for labels |

---

## 3. Shape & elevation

- **Radii:** 8px chips/mono tags · 16px tiles/swatches · 20px cards · 999px buttons, inputs, selects, pills, meters.
- **Shadows — two levels only:**
  - Card: `0 1px 2px rgba(26,16,48,.06), 0 10px 28px rgba(26,16,48,.05)`
  - Flat/bordered: `1px solid` hairline, no shadow.
- **Spacing:** 4px grid. Page sections 56px apart. Card padding 22px (compact) / 32px (panel). Page gutter 32px, max width 1120px.

---

## 4. Controls

### Buttons (all `border-radius:999px`, Nunito Sans 700 15px)

| Variant | Rest | Hover | Padding |
|---|---|---|---|
| Primary | `#16B364` bg, `#fff` text, no border | `#0E9F56` | `13px 26px` |
| Violet | `#7A22CE` bg, `#fff` text, no border | `#5B1AA0` | `13px 26px` |
| Secondary | `#fff` bg, `#5B1AA0` text, `1.5px solid #E4D4FA` | bg `#F3EBFD` | `12px 24px` |
| Tertiary | transparent, `#6B6480` text, weight 600 | text `#1A1030` | `12px 8px` |

### Inputs

```
font: Nunito Sans 15px; color:#1A1030;
background:#FAF9FC; border:1.5px solid #E7E3EF; border-radius:999px; padding:13px 18px; outline:none
:focus → border-color:#7A22CE; background:#fff
```
Selects match but sit on `#fff`. Every field carries a mono uppercase 11px label above it, 7px gap.

### Status chips

`border-radius:999px; padding:6px 14px; font-size:13px; font-weight:700` + the tinted-surface triplet from §1. Fit ratings in the product are **Strong / Possible / Conditional**; the mono neutral chip (`#F4F2F8` / `#E7E3EF` / `#6B6480`, radius 8px, padding 6px 10px) carries level and programme tags like `EU · Erasmus+`.

### Score meter

10px tall, `#EFECF6` track, 999px radius, gradient fill sized by percentage.

---

## 5. Patterns

**Call card** — white, radius 20px, padding 22px, card shadow, 12px column gap: mono eyebrow → Poppins 600 18px title → 14px muted summary capped at two lines → chip row (fit + role).

**Explanation block** — every score shows its reasoning as plain sentences with a `✓` (`#16B364`) or `!` (`#B7791F`) marker in a 9px-gap flex row. **No bare numbers anywhere in the product** — a score always travels with its sentence.

**Gradient CTA panel** — brand gradient, radius 20px, padding 26px, white text, white pill button with `#7A22CE` label.

**Failed hard rule** — record stays visible: score struck through, red banner (`#FCEDEB` / `#F5D6D1` / `#C0392B`) naming the rule. Eligibility is a gate, not a score, and gates are auditable rather than silently filtering.

---

## 6. Product vocabulary (keep consistent in UI copy)

- **Buckets:** Can lead now · Better with a partner · Recurring–monitored · Future pipeline
- **Fit ratings:** Strong · Possible · Conditional
- **Roles:** Lead · Lead+partners · Partner · Monitor
- Every record shows a **source URL** and a **last-checked date** (mono type).
- Region Midtjylland is pinned; Syddanmark is explicitly excluded.

---

## 7. Implementation notes

- Files are Design Components (`*.dc.html`): inline styles only, no stylesheets or CSS classes. Pseudo-states use `style-hover` / `style-focus` / `style-active` attributes.
- Only `@font-face`, `@keyframes` and body resets belong in `<helmet><style>`.
- Body reset in use:
  ```css
  body { margin:0; background:#FAF9FC; -webkit-font-smoothing:antialiased; }
  a { color:#7A22CE; text-decoration:none; }
  a:hover { color:#5B1AA0; text-decoration:underline; }
  ```
- Layout with flex/grid + `gap`, never margins between siblings. Fluid: `max-width`, `minmax(0,1fr)` tracks, no fixed heights on text boxes.
- Avoid emoji; the only glyphs used are `✓` and `!` markers.
