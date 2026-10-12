---
name: Crisp Domesticity
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#4d4632'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#7f7660'
  outline-variant: '#d1c6ab'
  surface-tint: '#735c00'
  primary: '#735c00'
  on-primary: '#ffffff'
  primary-container: '#facc15'
  on-primary-container: '#6c5700'
  inverse-primary: '#eec200'
  secondary: '#555e74'
  on-secondary: '#ffffff'
  secondary-container: '#d7dff9'
  on-secondary-container: '#5a6278'
  tertiary: '#636036'
  on-tertiary: '#ffffff'
  tertiary-container: '#d7d3a0'
  on-tertiary-container: '#5d5b32'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffe083'
  primary-fixed-dim: '#eec200'
  on-primary-fixed: '#231b00'
  on-primary-fixed-variant: '#574500'
  secondary-fixed: '#d9e2fc'
  secondary-fixed-dim: '#bdc6e0'
  on-secondary-fixed: '#121b2e'
  on-secondary-fixed-variant: '#3e475b'
  tertiary-fixed: '#e9e5b0'
  tertiary-fixed-dim: '#cdc996'
  on-tertiary-fixed: '#1e1c00'
  on-tertiary-fixed-variant: '#4a4821'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-hero:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.025em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  title-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: 0em
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  caption:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 3rem
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

The visual identity embodies calm reliability, domestic lightness, and orderly warmth tailored for the urban coastal context of Kozhikode, Kerala. Balancing pristine hygiene with warm Kerala hospitality, the system avoids cold, clinical sanitization aesthetics in favor of cheerful, methodical precision.

The design style relies on **Minimalism with Warm Tactility**:
- Abundant negative space echoing freshly ventilated, immaculate spaces.
- Subtle, breathable divider structures paired with sunlit, citrus-tinted focal anchors.
- Crisp utilitarian layouts that establish immediate trust, transparent pricing, and effortless scheduling.

## Colors

The palette is engineered around clean linen whites, deep coastal slate, and daylight yellow accents.

- **Primary (`#FACC15`)**: An energetic warm yellow representing radiant cleanliness and renewed spaces. Used for primary calls to action, badges, and focal interactive states. Pair strictly with Dark Slate (`#172033`) text for high-contrast accessibility.
- **Primary Hover (`#EAB308`)**: Rich amber-yellow for interactive hover and focus feedback.
- **Tertiary Tint (`#FEF9C3`)**: A delicate sunlit cream used for active state fills, contextual highlights, service tag backgrounds, and notification strips.
- **Secondary (`#172033`)**: Deep slate acting as the anchor foundation for primary typography, structural icons, and deep contrast panels.
- **Neutral (`#64748B`)**: Balanced cool gray for supporting metadata, field placeholders, subtle iconography, and descriptive body copy.
- **Surfaces & Borders**: Pure White (`#FFFFFF`) serves as the base canvas, alternating with Soft Canvas (`#F7F8FA`) for nested groupings and subtle containment borders (`#E2E8F0`).

## Typography

The type system is uniform, relying on **Inter** to project systematic clarity, neatness, and legibility across complex operational interfaces (booking calendars, pricing breakdowns, real-time laundry manifests).

- Display and headline levels leverage negative letter tracking to build authority and structural density.
- Body levels maintain generous vertical line metrics to preserve readability in dense service descriptions and multilingual localization points.
- Label styling features tight, medium-weight tracking designed for quick parsing across tabular and service status indicators.

## Layout & Spacing

A fluid 12-column grid system governs desktop views, transitioning into a 6-column grid for tablets, and a 4-column column structure for mobile displays. 

- **Outer Margins**: Desktop layouts use `margin` (3rem) anchored against max-width containers (1280px). Mobile screens use `margin-mobile` (1.25rem) to maximize screen area for booking modules.
- **Rhythm & Padding**: Component spacing operates in disciplined 4px/8px multiples, maintaining generous separation between functional clusters to convey uncluttered order.
- **Reflow**: Operational interfaces (e.g., date pickers, laundry load configurations, address inputs) collapse cleanly from horizontally balanced cards into full-width stacked sheets on mobile.

## Elevation & Depth

Visual hierarchy avoids heavy layered drop shadows, using surface division and faint boundary outlines instead:

- **Flat Layering**: Pure `#FFFFFF` surfaces sit atop `#F7F8FA` background canvases to indicate interaction regions.
- **Hairline Outlines**: Elements use 1px solid borders (`#E2E8F0`) to establish shape, eliminating heavy blur radii.
- **Ambient Accent Shadows**: When active or floating elements (such as bottom booking sheets or pinned checkout summaries) require lift, they utilize an ultra-diffused, ambient shadow: `0 8px 24px -4px rgba(23, 32, 51, 0.06)`.
- **Active Card Elevation**: Interactive cards hover slightly using `0 4px 12px -2px rgba(23, 32, 51, 0.04)` combined with a subtle border tint shift to `#FACC15`.

## Shapes

The geometric identity is defined by a consistent 16px radius curve (`rounded-lg`), creating friendly, approachable silhouettes without devolving into childish bubble aesthetics:

- **Structural Containers & Cards**: Set to standard 16px (`1rem`) radius.
- **Buttons and Input Fields**: Match the 16px corner profile for visual continuity across interactive blocks.
- **Status Pills and Counter Tags**: Fully circular pill geometry (`9999px`) to offset and distinguish operational tags from card containers.

## Components

### Buttons
- **Primary Button**: Background `#FACC15`, text `#172033` (Inter SemiBold), border none. Hover state transitions to `#EAB308`. Active state deepens slightly with standard `scale(0.99)` tap feedback. Height 48px, horizontal padding 24px, 16px border-radius.
- **Secondary Button**: Background `#FFFFFF`, text `#172033`, 1px border `#E2E8F0`. Hover state triggers background `#F7F8FA`.
- **Tertiary/Ghost**: Background transparent, text `#172033`, hover background `#FEF9C3`.

### Input Fields & Selectors
- Background `#FFFFFF`, 1px solid `#E2E8F0` border, 16px corner radius. Placeholder text rendered in `#64748B`. Focus state transitions border to `#FACC15` with a 3px ring of `rgba(250, 204, 21, 0.25)`. Includes left-aligned outline icons (20px stroke).

### Chips & Filter Tags
- **Default**: Background `#F7F8FA`, text `#64748B`, 1px border `#E2E8F0`, rounded pill shape.
- **Selected**: Background `#FEF9C3`, text `#172033`, 1px border `#FACC15`, with 600 font weight.

### Cards & Service Tiles
- Default surfaces are `#FFFFFF`, framed with a 1px border in `#E2E8F0` and 16px corner radius. Padding is structured at 24px (`space-lg`). Includes crisp outline iconography (24px, 1.75px stroke width) in `#172033`.

### Selection Controls (Checkboxes & Radios)
- Rounded square (checkboxes, 6px radius) and circular (radios) frames with a 1.5px `#E2E8F0` stroke. Checked state fills with `#FACC15`, showing a dark slate `#172033` checkmark or inner pip.

### Service-Specific Elements
- **Weight / Load Stepper**: Counter elements wrapped in `#F7F8FA` troughs with 16px corners, using `#FFFFFF` circular buttons for subtraction and addition.
- **Progress Tracker**: Fine 2px progress tracks in `#E2E8F0`, filled with `#FACC15` to communicate order status (Pickup, Washing, Ironing, Out for Delivery) paired with `#172033` milestone indicators.