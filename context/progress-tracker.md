# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Feature 04: Project Dialogs — Complete

## Current Goal

- Ready for the next feature specification.

## Completed

- `01-design-system`: shadcn/ui installed and configured with Tailwind v4, lucide-react installed, `lib/utils.ts` created with `cn()` helper, all required UI components added (Button, Card, Dialog, Input, Tabs, Textarea, ScrollArea), `app/globals.css` configured with dark-only theme wired to project design tokens.
- `02-editor`: Editor chrome shell components created — `components/editor/editor-navbar.tsx` (fixed-height top navbar with `PanelLeftOpen`/`PanelLeftClose` sidebar toggle, left/center/right sections, dark background with bottom border) and `components/editor/project-sidebar.tsx` (floating overlay sidebar that slides in from the left without pushing page content, accepts `isOpen`/`onClose` props, shadcn Tabs with My Projects + Shared tabs showing empty placeholder states, full-width New Project button with Plus icon at the bottom). Dialog pattern documented — use existing color tokens from `globals.css`; no actual dialogs built yet. All components compile with zero TypeScript errors.
- `03-auth`: Clerk authentication wired into Next.js 16. `@clerk/ui` installed. `proxy.ts` at project root with protected-first strategy — all routes protected except `/sign-in` and `/sign-up`. Root layout wraps app with `ClerkProvider` using Clerk `dark` theme + CSS variable overrides (`colorPrimary`, `colorBackground`, `borderRadius`) — no hardcoded colors. Sign-in and sign-up pages created with two-panel layout (branding left, Clerk form right on large screens; form only on small screens). Root `/` redirects authenticated users to `/editor`, unauthenticated to `/sign-in`. `UserButton` added to editor navbar right section. App restructured with route groups: `(auth)` for sign-in/sign-up (no editor chrome), `(editor)` for editor pages (with EditorShell). `npm run build` passes.
- `04-project-dialogues`: Built the `/editor` home screen and project dialogs/sidebar actions using mock data. Defined `types/project.ts` with project interface and initial mock data. Created `hooks/use-project-dialogs.tsx` managing dialog state, form state, and loading state via `ProjectDialogsProvider` and `useProjectDialogs`. Created `components/editor/project-dialogs.tsx` rendering Create Project (with live slug preview), Rename Project (with prefilled name, current name in description, auto-focus, and Enter submission), and Delete Project (destructive confirmation only, no input, destructive button styling). Updated `components/editor/project-sidebar.tsx` to list mock projects, wired rename and delete actions for owned projects, hid actions for shared projects, wired create dialog to the New Project button, and added a mobile backdrop scrim to close the sidebar on tap. Updated `app/(editor)/editor/page.tsx` with a minimal centered layout (heading, description, and New Project button with Plus icon). `npm run build` and `npm run lint` pass with zero errors.

## In Progress

- None yet.

## Next Up

- Define the next feature unit per product roadmap.

## Open Questions

- Add unresolved product or implementation questions here.

## Architecture Decisions

- shadcn/ui v4.21.0 uses Tailwind v4 CSS-based configuration (no `tailwind.config.js`). CSS variables are defined in `app/globals.css` via `:root`. Dark-only theme — no `.dark` class toggle.
- `lib/utils.ts` exports `cn` from the `cn` package (shadcn v4 standard), which merges Tailwind classes using `clsx` + a Tailwind-aware merge engine.
- shadcn components live in `components/ui/` and must not be modified (per `ai-workflow-rules.md`).
- Editor chrome components (`editor-navbar`, `project-sidebar`) are Client Components (`"use client"`) — they manage interactive state (sidebar open/close, tab selection) and event handlers.
- Project sidebar is a fixed-position floating overlay (`position: fixed`, `z-index: 30`) so it does not push page content. It slides in/out via CSS `translate-x` transitions.
- Auth uses `proxy.ts` (Next.js 16 convention, replaces `middleware.ts`). Protected-first: everything locked down by default, only `/sign-in(.*)` and `/sign-up(.*)` are public.
- `ClerkProvider` wraps the app inside `<body>` in the root layout (current SDK convention). The `dark` theme from `@clerk/ui/themes` is used as the base with CSS variable overrides.
- App uses Next.js route groups to separate auth pages `(auth)` from editor pages `(editor)`. Root layout provides ClerkProvider + fonts; `(editor)/layout.tsx` adds EditorShell; auth pages render without editor chrome.
- Project dialogs state, form state, and loading state are centralized in `useProjectDialogsState` and exposed via `ProjectDialogsProvider` in `hooks/use-project-dialogs.tsx` so all editor surfaces (page, sidebar, dialogs) share consistent state cleanly without prop drilling.
- Sidebar mobile overlay uses a backdrop scrim behind the sidebar (`z-20`, `md:hidden`) to allow tap-to-dismiss without altering desktop floating overlay behavior.

## Session Notes

- layout.tsx was fixed to import from `./globals.css` (correct App Router path) instead of `@/styles/globals.css`.
- `app/globals.css` contains `@import "tailwindcss"`, `@import "tw-animate-css"`, `@import "shadcn/tailwind.css"`, plus project dark theme tokens, plus shadcn CSS variable mappings all wired to the dark token values.
- Tailwind utility names for project tokens follow the `@theme inline` pattern in `globals.css`: `bg-bg-surface`, `bg-bg-elevated`, `border-border-default`, `text-text-primary`, `text-text-secondary`, `text-text-muted`, etc.
- `@clerk/nextjs` is at `^7.9.7` (current SDK, Core 3). Uses `isAuthenticated` (not `!!userId`), `auth.protect()` (not `auth().protect()`), `Show` (not `SignedIn`/`SignedOut`), themes from `@clerk/ui/themes` (not `@clerk/themes`).
- Mock projects differentiate owned vs shared projects (`isOwner` boolean).
- Live slug generation dynamically converts names to kebab-case slugs as the user types.
