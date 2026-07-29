---
name: PCtrl
description: A precise remote-workstation operations console.
colors:
  canvas: "#0b0e11"
  surface: "#13181d"
  surface-raised: "#1a2128"
  line: "#2a343e"
  ink: "#eef3f7"
  muted: "#9aa9b5"
  signal: "#54d88b"
  electric: "#5dcff5"
  caution: "#f7bc4d"
  danger: "#f26d70"
typography:
  display:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "clamp(2rem, 4vw, 3.5rem)"
    fontWeight: 650
    lineHeight: 1
  body:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  mono:
    fontFamily: "var(--font-geist-mono), ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 500
  label:
    fontFamily: "var(--font-geist-mono), ui-monospace, monospace"
    fontSize: "10px"
    fontWeight: 500
    letterSpacing: "0.08em"
rounded:
  control: "8px"
  surface: "12px"
spacing:
  compact: "8px"
  standard: "16px"
  section: "28px"
components:
  button-primary:
    backgroundColor: "{colors.electric}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
---

# Design System: PCtrl

## Overview

**Creative North Star: "The Calibrated Power Instrument"**

PCtrl reads like a considered field instrument for remote infrastructure: flat, dark, direct, and precise. It avoids gaming language, glass surfaces, ambient neon, and decorative sci-fi. Cyber character comes from measured notation, compact telemetry, command-line texture, and purposeful signal color.

## Colors

Dark graphite gives machine state a stable ground; color is reserved for state, focus, and consequence.

- **Signal Green** (`#54d88b`): normal hardware and successful command state.
- **Electric Cyan** (`#5dcff5`): navigation, primary action, and focus.
- **Caution Amber** (`#f7bc4d`): degraded or uncertain conditions.
- **Danger Red** (`#f26d70`): destructive action and failure.

**The Signal Rule.** State color is never decoration; each color names a real operational condition.

## Typography

Use a clean sans-serif for navigation and decisions. Reserve the mono face for measurements, IDs, ASCII markers, and terminal output.

## Layout

The desktop shell uses a narrow navigation rail and a flexible operational canvas. Views remain distinct by task: Dashboard for system state, Sessions for workspaces, Sunshine for streaming management. At narrow widths, the rail becomes a compact horizontal strip and grids stack.

## Elevation & Depth

Depth comes from tonal separation and one-pixel dividers, not shadows or transparency. Raised controls use `surface-raised`; primary work areas sit on `surface`.

## Shapes

Surfaces use 12px corners only at major boundaries. Controls use 8px corners. Avoid pills except compact status tags.

## Components

### Buttons
- Primary actions are cyan-filled with dark text.
- Secondary actions are flat outlined controls.
- Destructive actions are red-tinted outlines until confirmation.

### Navigation
- The active item carries a cyan edge marker and a tonal background.
- Navigation uses a short label and a simple line icon, never decorative badges.

### Terminal
- Terminal output is a flat black field with a thin border, monospace type, and green prompt. It is a dedicated session mode, never a floating overlay.

## Do's and Don'ts

### Do:
- **Do** place voltage and grid state where they can be read before acting on power.
- **Do** use ASCII dividers and measurement notation sparingly to reinforce the instrument character.
- **Do** keep destructive controls isolated from routine actions.

### Don't:
- **Don't** use glass blur, gradients, glow halos, or decorative neon.
- **Don't** combine distinct task views into a single overloaded screen.
- **Don't** use equal icon cards as the primary page structure.
