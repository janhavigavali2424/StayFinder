---
name: StayFinder Adaptive System
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#434655'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#4b41e1'
  on-secondary: '#ffffff'
  secondary-container: '#645efb'
  on-secondary-container: '#fffbff'
  tertiary: '#943700'
  on-tertiary: '#ffffff'
  tertiary-container: '#bc4800'
  on-tertiary-container: '#ffede6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#e2dfff'
  secondary-fixed-dim: '#c3c0ff'
  on-secondary-fixed: '#0f0069'
  on-secondary-fixed-variant: '#3323cc'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb596'
  on-tertiary-fixed: '#360f00'
  on-tertiary-fixed-variant: '#7d2d00'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 48px
  xl: 80px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
---

## Brand & Style

The design system is engineered to bridge the gap between institutional reliability and the aspirational lifestyle of modern students. The brand personality is **Professional, Accessible, and Empathetic**, prioritizing the high-stakes decision of finding a home away from home.

The visual style employs a **Modern Corporate** foundation infused with **Soft Glassmorphism**. This combination uses clean whitespace and structured layouts to establish trust, while translucent layers and subtle background blurs inject a contemporary, tech-forward energy that resonates with a younger demographic. The emotional response should be one of "effortless security"—where the complexity of property hunting is distilled into a clear, premium interface.

## Colors

The palette is anchored by **Royal Blue**, a color synonymous with stability and intelligence. This is supported by **Indigo** to provide depth in navigation and interactive states. 

**Functional Color Application:**
- **Primary & Secondary:** Used for branding, active navigation states, and primary information hierarchy.
- **Accent (Orange):** Reserved strictly for high-priority Call-to-Actions (CTAs) like "Book Now" or "Contact Owner" to ensure maximum conversion.
- **Verified (Emerald):** Denotes safety and trust; used for badges and authenticated listings.
- **Limited (Amber):** Communicates urgency and scarcity for low-inventory alerts.
- **Background:** A cool-toned Light Gray (#F8FAFC) reduces eye strain compared to pure white and provides a canvas for glassmorphic elevation.

## Typography

The design system utilizes **Inter** for its exceptional legibility and systematic feel. The type scale is designed to handle high-density information (amenities, pricing, locations) without sacrificing clarity.

**Usage Guidelines:**
- **Display & Headlines:** Use tighter letter spacing and heavier weights to create a strong visual anchor for property titles and marketing headers.
- **Body Text:** Standard weight for descriptions; use `body-md` as the default for property details to maximize information density on mobile.
- **Labels:** Used for metadata like "Price/Month" or "Verified" badges. These should often be paired with icons for immediate recognition.

## Layout & Spacing

This design system employs a **Fluid Grid** model with an 8px base unit. 

- **Desktop:** 12-column grid with 24px gutters and 64px external margins. Content containers should max out at 1280px.
- **Tablet:** 8-column grid with 24px gutters and 32px margins.
- **Mobile:** 4-column grid with 16px gutters and 16px margins.

**Rhythm:** Use `spacing-md` (24px) for padding within property cards and `spacing-lg` (48px) for vertical section separation. Components should follow a strict internal padding of `sm` (16px) to maintain a clean, airy feel consistent with a premium portal.

## Elevation & Depth

Visual hierarchy is established through **Ambient Shadows** and **Glassmorphism**.

1.  **Level 1 (Default Cards):** Use a subtle, large-radius shadow with a blue-tinted neutral color: `box-shadow: 0 4px 20px rgba(37, 99, 235, 0.05)`.
2.  **Level 2 (Active/Hover):** Increase shadow spread and opacity. 
3.  **Glassmorphism (Overlays & Filters):** Search bars, navigation headers, and floating maps should use a background blur of `12px` and a semi-transparent white fill `rgba(255, 255, 255, 0.7)`. A 1px white border with 20% opacity should be added to simulate a glass edge.

## Shapes

The shape language is defined by **High-Radius Geometry**. Following the `2` (Rounded) setting, all primary containers and cards use a 0.5rem base radius, but for this specific product, top-level containers like Property Cards and Hero Search Bars should utilize `rounded-2xl` (1.5rem / 24px) to emphasize the modern, friendly student aesthetic.

- **Buttons:** 0.75rem (12px) for a balanced professional look.
- **Input Fields:** 0.5rem (8px) for better structural alignment.
- **Badges:** Fully pill-shaped for "Verified" and "Limited" status indicators.

## Components

- **Buttons:** 
    - *Primary:* Royal Blue fill, white text, 12px radius. 
    - *CTA:* Orange (#F97316) fill, white text, bold weight. Use only for the final booking step.
    - *Secondary:* Indigo outline or light indigo background.
- **Cards (Property):** 1.5rem (24px) corner radius. Images should have a subtle inner shadow. Information layout: Title (Headline-sm), Price (Primary color, bold), Location (Label-md with icon).
- **Verified Badge:** Emerald Green background (10% opacity) with Emerald Green text and a checkmark icon. Pill-shaped.
- **Limited Badge:** Amber background (10% opacity) with Amber text and a "clock" icon. Pill-shaped.
- **Input Fields:** Search inputs should use the glassmorphism effect (blur + translucency) when floating over hero images.
- **Chips:** Small, rounded-lg elements for "AC," "Wifi," "Laundry" tags, using light-gray backgrounds and Indigo text.