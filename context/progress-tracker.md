# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Feature 07: Wire Editor Home & Workspace Navigation — Complete

## Current Goal

- Ready for the next feature specification (Collaborative Canvas / Liveblocks / React Flow).

## Completed

- `01-design-system`: shadcn/ui installed and configured with Tailwind v4, lucide-react installed, `lib/utils.ts` created with `cn()` helper, all required UI components added (Button, Card, Dialog, Input, Tabs, Textarea, ScrollArea), `app/globals.css` configured with dark-only theme wired to project design tokens.
- `02-editor`: Editor chrome shell components created — `components/editor/editor-navbar.tsx` (fixed-height top navbar with `PanelLeftOpen`/`PanelLeftClose` sidebar toggle, left/center/right sections, dark background with bottom border) and `components/editor/project-sidebar.tsx` (floating overlay sidebar that slides in from the left without pushing page content, accepts `isOpen`/`onClose` props, shadcn Tabs with My Projects + Shared tabs showing empty placeholder states, full-width New Project button with Plus icon at the bottom). Dialog pattern documented — use existing color tokens from `globals.css`; no actual dialogs built yet. All components compile with zero TypeScript errors.
- `03-auth`: Clerk authentication wired into Next.js 16. `@clerk/ui` installed. `proxy.ts` at project root with protected-first strategy — all routes protected except `/sign-in` and `/sign-up`. Root layout wraps app with `ClerkProvider` using Clerk `dark` theme + CSS variable overrides (`colorPrimary`, `colorBackground`, `borderRadius`) — no hardcoded colors. Sign-in and sign-up pages created with two-panel layout (branding left, Clerk form right on large screens; form only on small screens). Root `/` redirects authenticated users to `/editor`, unauthenticated to `/sign-in`. `UserButton` added to editor navbar right section. App restructured with route groups: `(auth)` for sign-in/sign-up (no editor chrome), `(editor)` for editor pages (with EditorShell). `npm run build` passes.
- `04-project-dialogues`: Built the `/editor` home screen and project dialogs/sidebar actions using mock data. Defined `types/project.ts` with project interface and initial mock data. Created `lib/slug.ts` with robust slug generation and validation (`SLUG_MIN_LENGTH`, `SLUG_MAX_LENGTH`, regex pattern, and duplicate check). Created `hooks/use-project-dialogs.tsx` managing dialog state, form state, live slug validation, and loading state via `ProjectDialogsProvider` and `useProjectDialogs`. Created `components/editor/project-dialogs.tsx` rendering Create Project (with live slug preview and validation error display), Rename Project (with prefilled name, current name in description, auto-focus, Enter submission, and scoped slug uniqueness check), and Delete Project (destructive confirmation only, no input, destructive button styling). Updated `components/editor/project-sidebar.tsx` to list mock projects, wired rename and delete actions for owned projects, hid actions for shared projects, wired create dialog to the New Project button, and added a mobile backdrop scrim to close the sidebar on tap. Updated `app/(editor)/editor/page.tsx` with a minimal centered layout (heading, description, and New Project button with Plus icon). `npm run build` and `npm run lint` pass with zero errors.
- `05-prisma`: Implemented Prisma data models, cached client singleton, and initial database migration. Created `prisma/models/project.prisma` containing `ProjectStatus` enum (`DRAFT`, `ARCHIVED`), `Project` model (with `ownerId` mapped to Clerk user, `name`, optional `description`, `status`, optional `canvasJsonPath`, timestamps, and separate indexes on `ownerId` and `createdAt`), and `ProjectCollaborator` model (with relation to `Project` featuring `onDelete: Cascade`, `email`, `createdAt`, `@@unique([projectId, email])`, `@@index([email])`, and `@@index([projectId, createdAt])`). Created `lib/prisma.ts` as a cached singleton branching by `DATABASE_URL` (uses `accelerateUrl` when starting with `prisma+postgres://`, otherwise direct `@prisma/adapter-pg`), cached on `globalThis` in development. Generated Prisma client to `app/generated/prisma`. Executed migration `20261002114713_init` against PostgreSQL database. Verified live query connectivity and passed `npm run build` and `npm run lint`.
- `06-project-apis`: Created backend REST API endpoints for projects under `app/api/projects`. Implemented `GET /api/projects` (lists current user's projects with collaborators ordered by `createdAt: desc`), `POST /api/projects` (creates project using authenticated Clerk `userId` as `ownerId`, defaults missing name to `Untitled Project`, and generates CUID ID via schema), `PATCH /api/projects/[projectId]` (renames project, requires valid non-empty name, enforces 401 for unauthenticated and 403 for non-owners), and `DELETE /api/projects/[projectId]` (deletes project with cascade deletion of collaborators, enforces 401 for unauthenticated and 403 for non-owners). Verified `npm run build` and `npm run lint` pass with zero errors.
- `07-wire-editor-home`: Wired the editor home sidebar and dialogs to the real backend project API. Created `lib/projects.ts` data helper (`getUserProjects`) caching owned and shared project retrieval server-side. Made `app/(editor)/editor/page.tsx` a Server Component with zero client-side fetching for initial load. Passed `ownedProjects` and `sharedProjects` from `app/(editor)/layout.tsx` into `EditorShell` and `ProjectSidebar`. Created `hooks/use-project-actions.tsx` (`useProjectActions` and `ProjectActionsProvider`), managing create, rename, and delete dialog state and API mutations. In create flow: generates unique suffix, slugifies name into aligned Liveblocks room ID preview, calls `POST /api/projects`, and navigates to the workspace. In rename flow: pre-fills project name, calls `PATCH /api/projects/[id]`, and triggers `router.refresh()`. In delete flow: displays project name, calls `DELETE /api/projects/[id]`, redirects to `/editor` if deleting the active workspace, or triggers `router.refresh()`. Updated `components/editor/project-sidebar.tsx` and `components/editor/project-dialogs.tsx`. Verified `npm run build` and `npm run lint` pass with zero errors.
- `project-workspace-route`: Implemented the dynamic project workspace route at `app/(editor)/editor/[projectId]/page.tsx` to resolve the 404 on project creation and project selection. Added cached `getProjectWithAccess` helper in `lib/projects.ts` verifying project existence and Clerk user access (owner or collaborator) with `notFound()` boundary enforcement. Created `components/editor/project-workspace-view.tsx` rendering the active project header, room ID, status badge, role indicator, rename/delete actions, and technical canvas placeholder matching dark design tokens. Updated `components/editor/project-sidebar.tsx` with `usePathname` active route highlighting. Generated dynamic metadata with `generateMetadata`. Verified `npm run build` registers `ƒ /editor/[projectId]` and `npm run lint` passes with zero errors.

## In Progress

- None.

## Next Up

- Ready for next feature specification (collaborative canvas integration or starter templates).

## Open Questions

- None currently pending.

## Architecture Decisions

- shadcn/ui v4.21.0 uses Tailwind v4 CSS-based configuration (no `tailwind.config.js`). CSS variables are defined in `app/globals.css` via `:root`. Dark-only theme — no `.dark` class toggle.
- `lib/utils.ts` exports `cn` from the `cn` package (shadcn v4 standard), which merges Tailwind classes using `clsx` + a Tailwind-aware merge engine.
- shadcn components live in `components/ui/` and must not be modified (per `ai-workflow-rules.md`).
- Editor chrome components (`editor-navbar`, `project-sidebar`) are Client Components (`"use client"`) — they manage interactive state (sidebar open/close, tab selection) and event handlers.
- Project sidebar is a fixed-position floating overlay (`position: fixed`, `z-index: 30`) so it does not push page content. It slides in/out via CSS `translate-x` transitions.
- Auth uses `proxy.ts` (Next.js 16 convention, replaces `middleware.ts`). Protected-first: everything locked down by default, only `/sign-in(.*)` and `/sign-up(.*)` are public.
- `ClerkProvider` wraps the app inside `<body>` in the root layout (current SDK convention). The `dark` theme from `@clerk/ui/themes` is used as the base with CSS variable overrides.
- App uses Next.js route groups to separate auth pages `(auth)` from editor pages `(editor)`. Root layout provides ClerkProvider + fonts; `(editor)/layout.tsx` adds EditorShell; auth pages render without editor chrome.
- Initial load data fetching is handled entirely on the server in `(editor)/layout.tsx` via `getUserProjects()` wrapped with React `cache()`, passing owned and shared projects down to `EditorShell` and `ProjectSidebar` without client-side waterfalls.
- Project actions, dialog state, and API mutations are encapsulated in `hooks/use-project-actions.tsx` (`useProjectActions`), providing consistent room ID generation, redirect logic, and cache refreshes across editor components.
- Liveblocks room ID and project ID are kept aligned during creation by formatting the ID as `${slug}-${uniqueSuffix}` and passing it to `POST /api/projects`.
- Dynamic project workspace routing (`app/(editor)/editor/[projectId]/page.tsx`) uses Next.js 16 async `params` resolution. Access control is enforced server-side via cached `getProjectWithAccess` in `lib/projects.ts`, triggering `notFound()` if the project does not exist or if the user is neither owner nor collaborator.
- Active project highlighting in `ProjectSidebar` uses `usePathname` matching `/editor/${project.id}` to visually indicate current workspace selection without disrupting sliding overlay mechanics.
- SSL connection normalization: `DATABASE_URL` uses explicit `?sslmode=verify-full`, and `lib/prisma.ts` enforces `sslmode=verify-full` defensively to prevent `pg-connection-string` deprecation warnings on PostgreSQL connections.

## Session Notes

- layout.tsx was fixed to import from `./globals.css` (correct App Router path) instead of `@/styles/globals.css`.
- `app/globals.css` contains `@import "tailwindcss"`, `@import "tw-animate-css"`, `@import "shadcn/tailwind.css"`, plus project dark theme tokens, plus shadcn CSS variable mappings all wired to the dark token values.
- Tailwind utility names for project tokens follow the `@theme inline` pattern in `globals.css`: `bg-bg-surface`, `bg-bg-elevated`, `border-border-default`, `text-text-primary`, `text-text-secondary`, `text-text-muted`, etc.
- `@clerk/nextjs` is at `^7.9.7` (current SDK, Core 3). Uses `isAuthenticated` (not `!!userId`), `auth.protect()` (not `auth().protect()`), `Show` (not `SignedIn`/`SignedOut`), themes from `@clerk/ui/themes` (not `@clerk/themes`).
- Prisma migration `20261002114713_init` created and applied successfully to PostgreSQL database. Verified client connectivity and query execution.
- REST API routes created for projects (`GET`, `POST`, `PATCH`, `DELETE`) with strict auth and ownership gating.
- Editor home sidebar and dialogs wired end-to-end to real PostgreSQL project data through server-rendered layout and `useProjectActions` hook.
- Fixed 404 navigation error when creating projects or selecting them from the sidebar by implementing `app/(editor)/editor/[projectId]/page.tsx` and `components/editor/project-workspace-view.tsx`.
- Added `getProjectWithAccess` to `lib/projects.ts` with React `cache()` for deduped access control between page rendering and `generateMetadata`.
- Fixed SSL mode warning in PostgreSQL connection string by enforcing `sslmode=verify-full`.
- Verified `npm run build` registers `ƒ /editor/[projectId]` and passes cleanly alongside `npm run lint`.
