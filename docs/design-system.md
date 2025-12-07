# Undercurrent Design System

A clean, professional aesthetic inspired by Descript. Built with Tailwind CSS and shadcn/ui.

## Design Principles

- High contrast text for readability
- 8px grid system, 8px border radius on most components
- Subtle shadows, only on elevated elements (popovers, modals)
- Quick animations (150-350ms)

---

## Colors

### Grey Scale

The foundation of the UI. Lower numbers = lighter.

| Token | Value | Use |
|-------|-------|-----|
| `grey-0` | `#ffffff` | Backgrounds |
| `grey-50` | `#f2f2f2` | Surface/card backgrounds |
| `grey-400` | `#818183` | Secondary text, placeholders |
| `grey-800` | `#343434` | Primary text |

Semi-transparent variants (`grey-50-a`, `grey-100-a`) are used for hover states and borders.

### Accent Colors

| Color | Value | Use |
|-------|-------|-----|
| Green | `#00975a` | Success, Accept button |
| Blue | `#1a5eff` | Links, text actions only |
| Cyan | `#007bc2` | Focus rings only |
| Red | `#f72736` | Destructive, Reject, errors |

---

## Buttons

| Variant | Style | When to Use |
|---------|-------|-------------|
| **Primary** | Black gradient, white text | Main actions (Save, Create, Publish) |
| **Success** | Green (`#00975a`), white text | Positive actions (Accept) |
| **Secondary** | White, grey border | Secondary actions |
| **Ghost** | Transparent | Tertiary/subtle actions |
| **Destructive** | Red (`#f72736`), white text | Dangerous actions (Delete, Reject) |

---

## Quick Rules

- **Primary buttons are black**, not blue
- **Blue is for links only** — never button backgrounds
- **Green = positive** (Accept, success)
- **Red = negative** (Reject, delete, errors)
- **Cyan = focus rings** — nothing else
- **Inter** is the only font
- **8px radius** on buttons, cards, inputs, dialogs

---

## Implementation

All CSS variables are defined in `src/app/globals.css`. Component styles come from shadcn/ui with minimal overrides.
