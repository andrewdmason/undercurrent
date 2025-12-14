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
| **Outline** | White bg, grey border | Secondary actions, Back buttons, Cancel |
| **Ghost** | Transparent, no border | Icon buttons, inline actions within content |
| **Destructive** | Red (`#f72736`), white text | Dangerous actions (Delete, Reject) |

### Button Patterns in Dialogs

- **Dialog footers**: Use `outline` for secondary actions (Back, Cancel, Skip), `primary` for main action
- **Never use ghost buttons** in dialog footers — they lack visual boundaries and look unfinished
- **Layout**: Right-align buttons with `justify-end`. Let buttons be their natural width.

```tsx
// ✅ Correct dialog footer pattern - right-aligned, natural width
<div className="flex justify-end gap-2">
  <Button variant="outline" onClick={onCancel}>Cancel</Button>
  <Button onClick={onSave}>Save</Button>
</div>

// ❌ Wrong - stretched primary button looks unbalanced
<div className="flex gap-2">
  <Button variant="outline">Cancel</Button>
  <Button className="flex-1">Save</Button>
</div>

// ❌ Wrong - ghost button looks weird without borders
<div className="flex gap-2">
  <Button variant="ghost">Cancel</Button>
  <Button>Save</Button>
</div>
```

---

## Cursor Behavior

Use **`cursor-default`** (normal arrow pointer) for most interactive elements in the app:

| Element | Cursor | Reason |
|---------|--------|--------|
| Navigation tabs | `cursor-default` | App navigation, not external links |
| Dropdown menus & items | `cursor-default` | In-app actions |
| Cards (clickable) | `cursor-default` | Internal navigation |
| List items (selectable) | `cursor-default` | Selection, not navigation away |
| Buttons | `cursor-default` | Actions within the app |
| Form inputs | default browser | Standard form behavior |

Use **`cursor-pointer`** (hand) sparingly:

| Element | Cursor | Reason |
|---------|--------|--------|
| External links | `cursor-pointer` | Indicates leaving the app |
| Text links in content | `cursor-pointer` | Traditional web convention for inline links |

**Rationale:** The hand cursor historically indicates "this will take you somewhere else." In a modern app context, most interactions keep you within the application, so the default arrow provides a more consistent, less distracting experience.

---

## Quick Rules

- **Primary buttons are black**, not blue
- **Blue is for links only** — never button backgrounds
- **Green = positive** (Accept, success)
- **Red = negative** (Reject, delete, errors)
- **Cyan = focus rings** — nothing else
- **Inter** is the only font
- **8px radius** on buttons, cards, inputs, dialogs
- **cursor-default** for in-app interactions, **cursor-pointer** for external links only

---

## Implementation

All CSS variables are defined in `src/app/globals.css`. Component styles come from shadcn/ui with minimal overrides.
