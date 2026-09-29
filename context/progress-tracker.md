# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Feature 02: Editor Chrome — Complete

## Current Goal

- Define the immediate implementation goal here.

## Completed

- `01-design-system`: shadcn/ui installed and configured with Tailwind v4, lucide-react installed, `lib/utils.ts` created with `cn()` helper, all required UI components added (Button, Card, Dialog, Input, Tabs, Textarea, ScrollArea), `app/globals.css` configured with dark-only theme wired to project design tokens.
- `02-editor`: Editor chrome shell components created — `components/editor/editor-navbar.tsx` (fixed-height top navbar with `PanelLeftOpen`/`PanelLeftClose` sidebar toggle, left/center/right sections, dark background with bottom border) and `components/editor/project-sidebar.tsx` (floating overlay sidebar that slides in from the left without pushing page content, accepts `isOpen`/`onClose` props, shadcn Tabs with My Projects + Shared tabs showing empty placeholder states, full-width New Project button with Plus icon at the bottom). Dialog pattern documented — use existing color tokens from `globals.css`; no actual dialogs built yet. All components compile with zero TypeScript errors.

## In Progress

- None yet.

## Next Up

- Add the next planned feature unit here.

## Open Questions

- Add unresolved product or implementation questions here.

## Architecture Decisions

- shadcn/ui v4.21.0 uses Tailwind v4 CSS-based configuration (no `tailwind.config.js`). CSS variables are defined in `app/globals.css` via `:root`. Dark-only theme — no `.dark` class toggle.
- `lib/utils.ts` exports `cn` from the `cn` package (shadcn v4 standard), which merges Tailwind classes using `clsx` + a Tailwind-aware merge engine.
- shadcn components live in `components/ui/` and must not be modified (per `ai-workflow-rules.md`).
- Editor chrome components (`editor-navbar`, `project-sidebar`) are Client Components (`"use client"`) — they manage interactive state (sidebar open/close, tab selection) and event handlers.
- Project sidebar is a fixed-position floating overlay (`position: fixed`, `z-index: 30`) so it does not push page content. It slides in/out via CSS `translate-x` transitions.

## Session Notes

- layout.tsx was fixed to import from `./globals.css` (correct App Router path) instead of `@/styles/globals.css`.
- `app/globals.css` contains `@import "tailwindcss"`, `@import "tw-animate-css"`, `@import "shadcn/tailwind.css"`, plus project dark theme tokens, plus shadcn CSS variable mappings all wired to the dark token values.
- Tailwind utility names for project tokens follow the `@theme inline` pattern in `globals.css`: `bg-bg-surface`, `bg-bg-elevated`, `border-border-default`, `text-text-primary`, `text-text-secondary`, `text-text-muted`, etc.
