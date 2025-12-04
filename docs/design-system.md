# Descript Design System Reference

> A comprehensive guide to recreating Descript's visual design language for SaaS applications using Tailwind CSS and shadcn/ui.

## Design Philosophy

Descript uses a **clean, professional aesthetic** with subtle depth. The design emphasizes:
- High contrast text for readability
- Subtle, semi-transparent hover/interaction states
- Consistent 8px grid system
- Rounded corners with `8px` as the primary radius
- Keyboard-first accessibility with visible focus rings

---

## Colors

### Grey Scale (Primary Palette)

The grey scale is the foundation of the design system. Note the semantic naming: lower numbers are lighter in light mode.

```css
/* Light Mode */
--grey-0: #ffffff;        /* Background */
--grey-5: #ffffff;        /* Popover/elevated background */
--grey-50: #f2f2f2;       /* Surface/card background */
--grey-200: #cccccc;      /* Borders, dividers */
--grey-400: #818183;      /* Secondary text, placeholders, icons */
--grey-600: #656567;      /* Secondary text (darker) */
--grey-800: #343434;      /* Primary text */

/* Semi-transparent overlays */
--grey-30-a: rgba(0, 0, 0, 0.03);   /* Input backgrounds */
--grey-50-a: rgba(0, 0, 0, 0.05);   /* Hover states */
--grey-100-a: rgba(0, 0, 0, 0.10);  /* Borders */
--grey-400-a: rgba(0, 0, 0, 0.45);  /* Scrims/overlays */
```

**Tailwind 4.1 mapping suggestion:**
```css
@theme {
  --color-background: #ffffff;
  --color-foreground: #343434;
  --color-muted: #f2f2f2;
  --color-muted-foreground: #818183;
  --color-border: rgba(0, 0, 0, 0.10);
  --color-input: rgba(0, 0, 0, 0.03);
}
```

### Accent Colors

| Color   | 200 (Light)  | 500 (Primary) | 800 (Dark/Text) | Use Case |
|---------|--------------|---------------|-----------------|----------|
| Blue    | `#5fa7ff`    | `#1a5eff`     | `#0043e0`       | Primary actions, links |
| Cyan    | `#3cbeff`    | `#008bcc`     | `#0065b3`       | Selection, focus rings |
| Purple  | `#cc99ff`    | `#7b24ff`     | `#6600cc`       | Premium/upgrade, accents |
| Red     | `#ff7077`    | `#f72736`     | `#a80000`       | Destructive, errors, recording |
| Green   | `#80c595`    | `#00975a`     | `#00663a`       | Success, confirmation |
| Amber   | `#ffbd61`    | `#cc7300`     | `#984f06`       | Warnings, caution |
| Orange  | `#ff9673`    | `#e54e00`     | `#b83700`       | Attention |

**Key brand color:**
```css
--blue-500: #1a5eff;  /* Primary action blue */
--cyan-600: #007bc2;  /* Focus ring color */
```

### Semantic Colors

```css
/* Borders */
--border-color: var(--grey-100-a);  /* rgba(0,0,0,0.10) */

/* Focus */
--focus-ring-color: var(--cyan-600);  /* #007bc2 */

/* Destructive */
--destructive: var(--red-500);  /* #f72736 */

/* Upgrade/Premium */
--upgrade-primary: var(--purple-800);  /* #6600cc */
--upgrade-background: #f7f2fc;
```

---

## Typography

### Font Family
```css
--font-family: 'Inter', system-ui, sans-serif;
--font-family-mono: 'Noto Sans Mono', system-ui, monospace;
```

### Type Scale

| Name | Size | Weight | Line Height | Letter Spacing | Use |
|------|------|--------|-------------|----------------|-----|
| `headline-1` | 48px | 400 | 64px | -1.06px | Page titles |
| `headline-2` | 36px | 400 | 48px | -0.79px | Section headers |
| `headline-3` | 24px | 400 | 32px | -0.46px | Card titles |
| `headline-4` | 18px | 500 | 32px | -0.25px | Subheadings |
| `body-1-regular` | 16px | 400 | 24px | -0.18px | Body text |
| `body-1-medium` | 16px | 600 | 24px | -0.18px | Emphasized body |
| `body-2-regular` | 14px | 400 | 21px | -0.08px | Secondary text |
| `body-2-medium` | 14px | 600 | 21px | -0.08px | Labels |
| `label-1-regular` | 12px | 400 | 16px | 0.001px | UI labels |
| `label-1-medium` | 12px | 600 | 16px | 0.001px | Button text, emphasized labels |
| `label-2-regular` | 11px | 400 | 16px | 0.055px | Small text, tooltips |
| `badge` | 9px | 500 | 16px | 0.14px | Badges |

**Tailwind setup:**
```css
@theme {
  --font-size-xs: 0.6875rem;   /* 11px - label-2 */
  --font-size-sm: 0.75rem;     /* 12px - label-1 */
  --font-size-base: 0.875rem;  /* 14px - body-2 */
  --font-size-lg: 1rem;        /* 16px - body-1 */
  --font-size-xl: 1.125rem;    /* 18px - headline-4 */
  --font-size-2xl: 1.5rem;     /* 24px - headline-3 */
  --font-size-3xl: 2.25rem;    /* 36px - headline-2 */
  --font-size-4xl: 3rem;       /* 48px - headline-1 */
}
```

---

## Spacing & Sizing

### Base Unit
The design uses an **8px grid system** with occasional 4px adjustments.

### Common Spacings
```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
```

### Component Heights
| Component | Height |
|-----------|--------|
| Button (small) | 24px |
| Button (medium) | 32px |
| Button (large) | 48px |
| Input field | 32px |
| Dense input | 24px |
| Menu item | 32px |
| Tab trigger | 32px |
| Avatar (default) | 32px |

---

## Border Radius

```css
--radius-sm: 2px;    /* Checkboxes, small chips */
--radius-md: 4px;    /* Small buttons, tooltips, avatars */
--radius-lg: 6px;    /* Menu items, nested elements */
--radius-xl: 8px;    /* Buttons, cards, inputs, dialogs, menus */
--radius-full: 9999px;  /* Pills, switches, avatars (rounded) */
```

**Primary radius for most components: `8px`**

---

## Shadows & Elevation

```css
/* Tooltips */
--elevation-1: 0px 2px 4px rgba(0, 0, 0, 0.16);

/* Buttons, dropdowns, popovers */
--elevation-5: 0px 8px 16px rgba(0, 0, 0, 0.12),
               0px 8px 8px rgba(0, 0, 0, 0.08);

/* Modals, large dialogs */
--elevation-10: 0px 120px 136px rgba(0, 0, 0, 0.12),
                0px 16px 38px rgba(0, 0, 0, 0.16);
```

---

## Animation & Transitions

### Duration
```css
--duration-faster: 150ms;  /* Quick feedback */
--duration-fast: 350ms;    /* Standard transitions */
```

### Easing Functions
```css
--ease-linear: cubic-bezier(0, 0, 1, 1);
--ease-casual: cubic-bezier(0.25, 1, 0.5, 1);     /* Natural feel */
--ease-productive: cubic-bezier(0.22, 1, 0.36, 1); /* Primary easing - slightly bouncy */
--ease-expressive: cubic-bezier(0.87, 0, 0.13, 1); /* Dramatic animations */
```

**Default transition:**
```css
transition: all 350ms cubic-bezier(0.22, 1, 0.36, 1);
```

---

## Components

### Buttons

**Sizes:**
- Small: `h-6 px-2 text-xs rounded`
- Medium: `h-8 px-4 text-sm rounded-lg` (default)
- Large: `h-12 px-4 text-sm rounded-lg`

**Variants:**

| Variant | Background | Text | Border |
|---------|------------|------|--------|
| Primary (black) | `linear-gradient(0deg, #262626, #404040)` | white | `inset 0 0 0 1px rgba(255,255,255,0.16)` |
| Secondary | white | grey-800 | `1px solid var(--border-color)` |
| Light | transparent | grey-800 | none |
| Destructive | red-500 | white | none |
| Upgrade | purple-800 | white | none |

**Hover states:**
- Primary/Black: Overlay `rgba(255,255,255,0.08)` on background
- Secondary/Light: Background `var(--grey-50-a)` (5% black)

**Disabled state:**
```css
opacity: 0.3;  /* or var(--state-inactive) */
```

**Focus ring:**
```css
box-shadow: 0 0 0 1px var(--grey-0), 0 0 0 3px var(--cyan-600);
```

### Input Fields

**Base styling:**
```css
min-height: 32px;
border-radius: 8px;
background: var(--grey-30-a);  /* rgba(0,0,0,0.03) */
padding: 0 8px;
color: var(--grey-800);
font-size: 12px;
```

**States:**
- Hover: `border: 2px solid var(--border-color)`
- Focus: `border: 2px solid var(--cyan-600)` (focus ring color)
- Error: `border: 2px solid var(--red-500)`
- Disabled: `opacity: 0.3; pointer-events: none`

**Placeholder:** `color: var(--grey-400)`

### Checkboxes

```css
/* Unchecked */
width: 12px;
height: 12px;
border: 1px solid var(--grey-800);
border-radius: 2px;

/* Checked */
background: var(--grey-800);
border: none;
/* Check icon in white */
```

### Switches

```css
/* Track */
width: 32px;
height: calc(32px * 0.6);  /* 19.2px */
border-radius: 9999px;
background: transparent;
box-shadow: inset 0 0 0 1px var(--grey-800);

/* Track (on) */
background: var(--grey-800);

/* Thumb */
height: 100%;
aspect-ratio: 1/1;
border-radius: 50%;
background: white;
border: 1px solid var(--grey-800);
```

### Cards

```css
background: var(--grey-5);  /* white */
border-radius: 8px;
border: 1px solid var(--border-color);
padding: 8px;
```

### Dialogs/Modals

```css
background: var(--grey-0);
border: 1px solid var(--border-color);
border-radius: 8px;
box-shadow: var(--elevation-10);
max-width: 424px;

/* Overlay */
background: rgba(0, 0, 0, 0.30);
```

**Header:**
```css
padding: 0 16px;
min-height: 32px;
font-weight: 600;
font-size: 12px;
```

### Popovers & Menus

```css
background: var(--grey-0);
border: 1px solid var(--border-color);
border-radius: 8px;
box-shadow: var(--elevation-5);
background-clip: padding-box;
```

**Menu items:**
```css
min-height: 32px;
padding: 0 8px;
border-radius: 6px;  /* internal items */
font-size: 12px;
color: var(--grey-800);
```

**Hover state (menu items):**
```css
background: var(--grey-50-a);  /* rgba(0,0,0,0.05) */
```

### Tooltips

```css
background: var(--grey-800);  /* dark */
color: var(--grey-0);  /* white */
border-radius: 4px;
padding: 4px 8px;
font-size: 11px;
box-shadow: var(--elevation-1);
```

### Tabs

```css
/* Tab list container */
background: var(--grey-50);  /* #f2f2f2 */
border-radius: 8px;
padding: 0 1px;

/* Active tab */
background: var(--grey-0);  /* white */
border: 1px solid var(--grey-100-a);
border-radius: 6px;
```

### Badges

```css
/* Notification dot */
height: 10px;
width: 10px;
border-radius: 50%;
background: var(--red-500);
border: 2px solid var(--grey-0);

/* Count badge */
height: 20px;
padding: 2px 6px;
border-radius: 8px;
background: var(--grey-400-a);
color: var(--grey-0);
font-size: 9px;
```

### Avatar

```css
width: 32px;
height: 32px;
border-radius: 4px;  /* or 50% for rounded */
background: var(--grey-50-a);
font-size: 11px;
font-weight: 400;
color: var(--grey-800);
```

### Toasts

```css
background: var(--grey-0);
border: 1px solid var(--border-color);
border-radius: 8px;
box-shadow: var(--elevation-5);
min-height: 40px;
padding: 0 8px;
font-size: 12px;
color: var(--grey-800);
```

---

## Focus & Accessibility

### Focus Ring Pattern

```css
/* Standard focus ring (external) */
box-shadow: 0 0 0 1px var(--grey-0), 0 0 0 3px var(--cyan-600);

/* Inset focus ring (for contained elements) */
box-shadow: inset 0 0 0 2px var(--cyan-600);
```

**Implementation note:** Focus rings only show for keyboard navigation. Use `[data-keyboard-focus]` or `:focus-visible` to conditionally show.

### Disabled State
```css
opacity: 0.3;  /* Light mode */
opacity: 0.42; /* Dark mode */
pointer-events: none;
```

---

## Dark Mode

Descript uses a class-based dark mode with `.dark-ok` class. Colors are swapped by reassigning CSS variables:

```css
.dark-ok {
  --grey-0: #222222;
  --grey-5: #262626;
  --grey-50: #1b1b1b;
  --grey-200: #404040;
  --grey-400: #8f8f8f;
  --grey-800: #eaeaea;

  --grey-30-a: rgba(255, 255, 255, 0.10);
  --grey-50-a: rgba(255, 255, 255, 0.08);
  --grey-100-a: rgba(255, 255, 255, 0.16);

  --border-color: rgba(255, 255, 255, 0.16);
  --state-inactive: 0.42;
}
```

**Pattern:** In dark mode, semantic colors stay the same but the RGB values are swapped to their dark equivalents, maintaining the same visual hierarchy.

---

## Applying to shadcn/ui + Tailwind 4.1

### CSS Variables Setup

```css
@layer base {
  :root {
    /* Core */
    --background: 0 0% 100%;
    --foreground: 0 0% 20%;

    /* Muted */
    --muted: 0 0% 95%;
    --muted-foreground: 0 0% 50%;

    /* Card/Popover */
    --card: 0 0% 100%;
    --card-foreground: 0 0% 20%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 20%;

    /* Primary (Black button style) */
    --primary: 0 0% 20%;
    --primary-foreground: 0 0% 100%;

    /* Secondary */
    --secondary: 0 0% 95%;
    --secondary-foreground: 0 0% 20%;

    /* Accent (hover states) */
    --accent: 0 0% 0% / 0.05;
    --accent-foreground: 0 0% 20%;

    /* Destructive */
    --destructive: 356 93% 56%;
    --destructive-foreground: 0 0% 100%;

    /* Border & Input */
    --border: 0 0% 0% / 0.10;
    --input: 0 0% 0% / 0.03;
    --ring: 195 100% 38%;

    /* Radius */
    --radius: 0.5rem;
  }

  .dark {
    --background: 0 0% 13%;
    --foreground: 0 0% 92%;
    --muted: 0 0% 11%;
    --muted-foreground: 0 0% 56%;
    --border: 0 0% 100% / 0.16;
    --input: 0 0% 100% / 0.10;
    --accent: 0 0% 100% / 0.08;
  }
}
```

### Key Overrides for shadcn Components

**Button:**
```tsx
// Add gradient to default variant
className="bg-gradient-to-t from-[#262626] to-[#404040] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]"
```

**Input:**
```tsx
className="h-8 rounded-lg bg-black/[0.03] border-0 focus:ring-2 focus:ring-cyan-600"
```

**Card:**
```tsx
className="rounded-lg border border-black/10 bg-white"
```

---

## Quick Reference Cheatsheet

| Element | Border Radius | Height | Font Size | Key Color |
|---------|---------------|--------|-----------|-----------|
| Button (md) | 8px | 32px | 12px | grey-800 text |
| Input | 8px | 32px | 12px | grey-800 text |
| Card | 8px | — | — | grey-5 bg |
| Dialog | 8px | — | 12px | grey-0 bg |
| Menu | 8px | — | 12px | grey-0 bg |
| Menu item | 6px | 32px | 12px | grey-50-a hover |
| Tooltip | 4px | — | 11px | grey-800 bg |
| Checkbox | 2px | 12px | — | grey-800 |
| Switch | 9999px | 19px | — | grey-800 |
| Badge | 8px | 20px | 9px | grey-400-a bg |
| Avatar | 4px | 32px | 11px | grey-50-a bg |

---

## Brand Notes

- **Primary action buttons are black**, not blue (unlike many SaaS apps)
- **Blue is reserved for links and selection states**
- **Cyan is the focus color** - provides clear visual feedback
- **Purple is the "upgrade" color** - used for premium features
- **Inter is the primary font** - clean, modern, highly legible
- **Minimal use of shadows** - elevation is subtle, mostly for popovers
- **Animation is quick and snappy** - 150-350ms with productive easing

