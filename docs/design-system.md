# Undercurrent Design System

A Descript-inspired design system for Tailwind CSS 4.1 and shadcn/ui components.

---

## Philosophy

Descript's design language is **clean, minimal, and professional** with a focus on clarity and ease of use. The aesthetic feels modern but not trendy—functional but not cold. Key principles:

- **Generous whitespace** - Let content breathe
- **Clear hierarchy** - Typography and color guide the eye
- **Subtle depth** - Soft shadows and borders, not heavy effects
- **Consistent patterns** - Predictable interactions across the app

---

## Colors

### Primary Palette

| Name | Hex | Usage |
|------|-----|-------|
| **Blurple** | `#6366F1` | Primary actions, links, accent highlights |
| **Blurple Hover** | `#4F46E5` | Hover state for primary elements |
| **Black** | `#1A1A1A` | Primary text, headings |
| **White** | `#FFFFFF` | Backgrounds, cards |
| **Off-white** | `#FAFAFA` | Page backgrounds, subtle contrast |

### Neutral Palette (Grays)

| Name | Hex | Usage |
|------|-----|-------|
| **Gray 50** | `#F9FAFB` | Subtle backgrounds |
| **Gray 100** | `#F3F4F6` | Sidebar backgrounds, hover states |
| **Gray 200** | `#E5E7EB` | Borders, dividers |
| **Gray 300** | `#D1D5DB` | Disabled states, placeholder text |
| **Gray 400** | `#9CA3AF` | Secondary text, icons |
| **Gray 500** | `#6B7280` | Muted text |
| **Gray 600** | `#4B5563` | Body text |
| **Gray 700** | `#374151` | Strong secondary text |
| **Gray 800** | `#1F2937` | Near-black text |
| **Gray 900** | `#111827` | Darkest text |

### Accent Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Coral** | `#F472B6` | Speaker names, highlights, special UI |
| **Green** | `#10B981` | Success states, positive actions |
| **Red** | `#EF4444` | Error states, destructive actions |
| **Amber** | `#F59E0B` | Warning states |

### Dark Theme Considerations

For timeline/editing contexts, Descript uses darker surfaces:
- **Surface Dark** | `#2D2D2D` | Dark panels, timeline background
- **Surface Darker** | `#1E1E1E` | Deeper dark surfaces

---

## Typography

### Font Family

**Primary:** Inter (Variable)
- Available via Google Fonts or self-hosted
- Use variable font for performance: `Inter var`

```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

### Type Scale

| Name | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| **Display** | 32px / 2rem | 600 | 1.2 | Page titles |
| **Heading 1** | 24px / 1.5rem | 600 | 1.3 | Section headers |
| **Heading 2** | 20px / 1.25rem | 600 | 1.4 | Card titles, modal headers |
| **Heading 3** | 16px / 1rem | 600 | 1.5 | Subsection headers |
| **Body** | 14px / 0.875rem | 400 | 1.5 | Default text |
| **Body Small** | 13px / 0.8125rem | 400 | 1.5 | Secondary info, timestamps |
| **Caption** | 12px / 0.75rem | 400 | 1.4 | Labels, helper text |
| **Micro** | 11px / 0.6875rem | 500 | 1.3 | Badges, tiny labels |

### Font Weights

- **Regular (400)** - Body text, descriptions
- **Medium (500)** - Emphasis, navigation items, labels
- **Semibold (600)** - Headings, buttons, important UI

---

## Spacing

Use a consistent 4px base grid. Tailwind's default spacing works well:

| Token | Value | Usage |
|-------|-------|-------|
| `1` | 4px | Tight spacing, icon gaps |
| `2` | 8px | Default element gaps |
| `3` | 12px | Small component padding |
| `4` | 16px | Standard padding, gaps |
| `5` | 20px | Medium spacing |
| `6` | 24px | Section spacing |
| `8` | 32px | Large gaps between sections |
| `10` | 40px | Page-level spacing |
| `12` | 48px | Major section breaks |

---

## Border Radius

Descript uses soft, rounded corners throughout:

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-sm` | 4px | Small elements, badges |
| `rounded` | 6px | Default (inputs, small buttons) |
| `rounded-md` | 8px | Cards, dropdowns |
| `rounded-lg` | 12px | Modals, larger cards |
| `rounded-xl` | 16px | Feature cards |
| `rounded-full` | 9999px | Pills, avatars, toggle buttons |

---

## Shadows

Subtle, layered shadows for depth without heaviness:

```css
/* Card shadow - subtle elevation */
--shadow-card: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1);

/* Dropdown/popover shadow */
--shadow-dropdown: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);

/* Modal shadow */
--shadow-modal: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);

/* Hover lift */
--shadow-hover: 0 4px 12px rgba(0, 0, 0, 0.1);
```

---

## Components

### Buttons

**Primary Button**
- Background: Blurple (`#6366F1`)
- Text: White
- Padding: `10px 16px` (py-2.5 px-4)
- Border radius: `rounded-lg` (8px)
- Font: 14px, weight 500
- Hover: Darker blurple (`#4F46E5`)

**Secondary Button**
- Background: White
- Border: 1px solid Gray 200
- Text: Gray 700
- Same padding/radius as primary
- Hover: Gray 50 background

**Ghost Button**
- Background: Transparent
- Text: Gray 600
- Hover: Gray 100 background

**Pill Button (action chips)**
- Background: White
- Border: 1px solid Gray 200
- Border radius: `rounded-full`
- Padding: `8px 16px`
- Often includes emoji prefix

### Inputs

**Text Input**
- Background: White
- Border: 1px solid Gray 200
- Border radius: `rounded-md` (8px)
- Padding: `10px 12px`
- Font: 14px
- Focus: Blurple ring (2px), border color blurple
- Placeholder: Gray 400

**Select/Dropdown**
- Same styling as text input
- Chevron icon on right
- Dropdown panel: White background, `shadow-dropdown`, rounded-lg

**Toggle Switch**
- Track: Gray 200 (off), Blurple (on)
- Thumb: White with subtle shadow
- Size: 40px × 24px

### Cards

**Standard Card**
- Background: White
- Border: 1px solid Gray 200 OR no border with shadow
- Border radius: `rounded-lg` (12px)
- Padding: 16-24px
- Hover (if interactive): Subtle shadow lift

**Feature Card (like "Popular features")**
- Larger padding (24px)
- May include image/illustration
- Title: Heading 3 weight
- Description: Body Small, Gray 500

### Navigation

**Sidebar**
- Background: Gray 50 or White
- Width: ~240px
- Item padding: `8px 12px`
- Active item: Gray 100 background, Gray 900 text
- Inactive item: Gray 600 text
- Section headers: Caption size, Gray 400, uppercase optional

**Tabs**
- Horizontal row of text links
- Active: Blurple text or underline
- Inactive: Gray 500 text
- Padding between: 24px

### Tables

- Header: Caption size, Gray 500, uppercase or sentence case
- Header background: Transparent or Gray 50
- Row height: ~52px
- Row hover: Gray 50 background
- Cell padding: `12px 16px`
- Borders: Only horizontal dividers (Gray 200)

### Modals / Dialogs

- Overlay: Black at 50% opacity
- Panel: White background, `shadow-modal`
- Border radius: `rounded-xl` (16px)
- Header padding: 24px
- Content padding: 24px
- Max width: Varies (480px for small, 640px for medium, 800px for large)
- Close button: Top right, icon only

### Avatars

- Shape: Circle (`rounded-full`)
- Sizes: 24px (small), 32px (default), 40px (large), 64px (profile)
- Border: Optional 2px white border for overlapping avatars
- Fallback: Gray background with initials

---

## Icons

Use a consistent icon set. Recommended: **Lucide Icons** (works great with shadcn)

- Size: 16px (small), 20px (default), 24px (large)
- Stroke width: 1.5px or 2px
- Color: Inherit from text color

---

## Animations & Transitions

Keep animations subtle and quick:

```css
/* Default transition */
transition: all 150ms ease;

/* Hover transitions */
transition: background-color 150ms ease, box-shadow 150ms ease;

/* Modal entrance */
animation: fadeIn 200ms ease, scaleIn 200ms ease;

/* Dropdown */
animation: slideDown 150ms ease;
```

---

## Layout Patterns

### Sidebar + Content Layout

```
┌──────────────────────────────────────────────┐
│ Header (56px)                                │
├──────────┬───────────────────────────────────┤
│ Sidebar  │ Main Content                      │
│ (240px)  │                                   │
│          │                                   │
│          │                                   │
│          │                                   │
└──────────┴───────────────────────────────────┘
```

### Content Max Widths

- Narrow content (forms, settings): 480-640px
- Standard content: 800-960px
- Wide content (tables, grids): 1200px
- Full width with max: `max-w-7xl` (1280px)

---

## Tailwind CSS 4.1 Configuration

```css
/* In your CSS file with Tailwind 4.1 */
@theme {
  --color-blurple: #6366F1;
  --color-blurple-hover: #4F46E5;
  --color-coral: #F472B6;
  
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  
  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1);
  --shadow-dropdown: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-modal: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}
```

---

## shadcn/ui Theming Notes

When setting up shadcn/ui, use these CSS variables in your theme:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 10%;
  
  --card: 0 0% 100%;
  --card-foreground: 0 0% 10%;
  
  --primary: 239 84% 67%;        /* Blurple */
  --primary-foreground: 0 0% 100%;
  
  --secondary: 0 0% 96%;
  --secondary-foreground: 0 0% 32%;
  
  --muted: 0 0% 96%;
  --muted-foreground: 0 0% 45%;
  
  --accent: 330 81% 71%;          /* Coral */
  --accent-foreground: 0 0% 100%;
  
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 100%;
  
  --border: 0 0% 90%;
  --input: 0 0% 90%;
  --ring: 239 84% 67%;            /* Blurple for focus rings */
  
  --radius: 0.5rem;
}
```

---

## Quick Reference: Common Patterns

### Page Header
```html
<div class="flex items-center justify-between pb-6">
  <h1 class="text-2xl font-semibold text-gray-900">Page Title</h1>
  <div class="flex gap-3">
    <Button variant="secondary">Secondary</Button>
    <Button>Primary Action</Button>
  </div>
</div>
```

### Card Grid
```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <!-- Cards -->
</div>
```

### Settings Row
```html
<div class="flex items-center justify-between py-4 border-b border-gray-200">
  <div>
    <p class="text-sm font-medium text-gray-900">Setting Name</p>
    <p class="text-sm text-gray-500">Description of the setting</p>
  </div>
  <Switch />
</div>
```

