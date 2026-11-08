---
name: VisionForge Stitch Design System
version: "1.0.0"
spec: "Stitch DESIGN.md Specification v1"
author: "VisionForge Studio"
platform: "Web & Edge CV Workstation"
framework: "Tailwind CSS v3 / React 18 / TypeScript"
theme_modes: ["dark", "light"]
default_theme: "dark"
aesthetic: "Apple-inspired Industrial Glassmorphism with Cupertino Precision"
---

# VisionForge Studio — Design System Specification (`DESIGN.md`)

> **Google Stitch Standard Specification**: This document serves as the single source of truth for all UI/UX tokens, component aesthetics, surface layering, typography, and micro-interactions across VisionForge Studio. AI coding agents and human designers must reference these rules to ensure consistent, premium interfaces.

---

## 1. Design Philosophy & Core Principles

1. **Clarity (Content is King):** The computer vision canvas, video scrubbers, and annotation bounding boxes take priority. The UI framing stays translucent, refined, and non-intrusive.
2. **Deference (UI Never Competes):** Chromes, headers, and toolbars serve the machine learning workflow. Muted graphite backgrounds make colored bounding boxes and loss curves stand out with maximum visual contrast.
3. **Depth & Hierarchy:** Layered translucent surfaces (`surface-0` through `surface-glass`) create an intuitive sense of elevation without harsh flat borders.
4. **Cupertino Ergonomics:** Pill-shaped interactive targets (`border-radius: 980px`), touch targets $\ge 44\text{px}$, and fluid spring transitions (`cubic-bezier(0.16, 1, 0.3, 1)`).

---

## 2. Machine-Readable Design Tokens

```json
{
  "tokens": {
    "colors": {
      "dark": {
        "bg_primary": "#080c14",
        "bg_surface": "#0f1524",
        "bg_card": "#131b2e",
        "bg_glass": "rgba(19, 27, 46, 0.75)",
        "border_subtle": "rgba(255, 255, 255, 0.08)",
        "border_specular": "rgba(255, 255, 255, 0.15)",
        "text_primary": "#f8fafc",
        "text_secondary": "#94a3b8",
        "text_muted": "#64748b"
      },
      "light": {
        "bg_primary": "#f8fafc",
        "bg_surface": "#ffffff",
        "bg_card": "#f1f5f9",
        "bg_glass": "rgba(255, 255, 255, 0.85)",
        "border_subtle": "rgba(0, 0, 0, 0.06)",
        "border_specular": "rgba(0, 0, 0, 0.12)",
        "text_primary": "#0f172a",
        "text_secondary": "#475569",
        "text_muted": "#94a3b8"
      },
      "brand": {
        "blue": "#0071e3",
        "blue_hover": "#0077ed",
        "indigo": "#6366f1",
        "emerald": "#10b981",
        "amber": "#f59e0b",
        "rose": "#f43f5e",
        "cyan": "#06b6d4"
      }
    },
    "typography": {
      "font_family_sans": "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Inter', system-ui, sans-serif",
      "font_family_mono": "'SF Mono', 'JetBrains Mono', Menlo, Monaco, Consolas, monospace",
      "scale": {
        "hero": { "size": "32px", "line_height": "1.15", "weight": "700", "tracking": "-0.03em" },
        "title": { "size": "22px", "line_height": "1.25", "weight": "600", "tracking": "-0.02em" },
        "headline": { "size": "16px", "line_height": "1.35", "weight": "600", "tracking": "-0.01em" },
        "body": { "size": "14px", "line_height": "1.5", "weight": "400", "tracking": "-0.005em" },
        "caption": { "size": "12px", "line_height": "1.4", "weight": "500", "tracking": "0em" },
        "micro": { "size": "10px", "line_height": "1.3", "weight": "600", "tracking": "0.04em" }
      }
    },
    "radii": {
      "pill": "980px",
      "modal": "28px",
      "card": "20px",
      "inner": "12px",
      "badge": "9999px"
    },
    "shadows": {
      "glass": "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
      "ambient": "0 20px 40px -15px rgba(0, 0, 0, 0.5)",
      "subtle": "0 2px 10px rgba(0, 0, 0, 0.08)",
      "glow_blue": "0 0 20px rgba(0, 113, 227, 0.35)",
      "glow_emerald": "0 0 20px rgba(16, 185, 129, 0.35)"
    },
    "transitions": {
      "spring": "all 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
      "snappy": "all 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)",
      "fade": "opacity 0.25s ease, transform 0.25s ease"
    }
  }
}
```

---

## 3. Surface Layering Architecture

VisionForge implements a 4-tier surface elevation system:

| Level | Token | Tailwind Equiv | Purpose |
| :--- | :--- | :--- | :--- |
| **0** | `surface-canvas` | `bg-[#080c14]` (dark) / `bg-[#f8fafc]` (light) | Root background behind all panes |
| **1** | `surface-bar` | `bg-[#0f1524]/90` (dark) / `bg-white/90` (light) | Top Header, Left Sidebar, Footer |
| **2** | `surface-card` | `bg-[#131b2e]/80` (dark) / `bg-white` (light) | Feature panels, metrics cards, inspectors |
| **Glass** | `surface-glass` | `backdrop-blur-2xl bg-black/60` | Modals, Command Palette, Product Tour |

Every glassmorphic container features a **1px specular rim light**:
```css
border: 1px solid rgba(255, 255, 255, 0.08);
box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.06);
```

---

## 4. Component Standards

### 4.1 Buttons & Interactive Pills
* **Pill Shape Standard:** All primary action buttons must use `rounded-full` (`border-radius: 980px`).
* **Active Scale Feedback:** Buttons scale to `scale-[0.98]` on `:active` with smooth cubic-bezier return.
* **Touch Target:** Minimum height of `44px` on mobile/tablet and `36px` on compact desktop toolbars.

### 4.2 Status Badges
* Rounded capsule with a pulsing 2px dot indicator.
* Example: `[● Ready]` (Emerald), `[● Training]` (Indigo), `[● Alert]` (Amber).

### 4.3 Data Scrubbers & Sliders
* Custom range slider tracks with `accent-color: #0071e3`.
* 6px height track with circular thumb and subtle glow on active drag.

---

## 5. Agent Instructions for Google Stitch & Coding Assistants

When authoring new views or modifying existing components in VisionForge:
1. **Always read this `DESIGN.md` first.**
2. **Never use harsh solid borders (`border-gray-500`).** Always use subtle translucent borders (`border-white/[0.08]` in dark mode or `border-slate-200` in light mode).
3. **Always preserve the Apple glassmorphism aesthetic.** Use `backdrop-blur-xl` or `backdrop-blur-2xl` with subtle shadows.
4. **Ensure responsive touch safety.** Minimum 44px clickable target size for buttons on mobile viewports.
5. **Support dual theme.** Every component must cleanly adapt between dark mode (`#080c14`) and light mode (`#f8fafc`).
