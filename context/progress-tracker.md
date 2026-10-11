# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Feature 29: Spec UI Integration (`29-spec-ui-integration`) — Complete

## Current Goal

- Ready for next feature specification or user verification.

## Completed

- `29-spec-ui-integration`: Integrated spec generation results and technical specification viewing/downloading into the editor AI sidebar Specs tab (`context/feature-specs/29-spec-ui-integration.md`):
  1. **Spec List in AI Sidebar (`components/editor/ai-sidebar.tsx`)**:
     - Fetches metadata list from `GET /api/projects/[projectId]/specs` when the project is active and Specs tab is viewed.
     - Displays formatted `filename` and `createdAt` timestamp for each spec.
     - Added an empty state with a "Generate Spec" action triggering `POST /api/ai/spec` with current canvas nodes, edges, and chat history.
     - Kept items compact, interactive, and scrollable within the existing sidebar layout without altering global state.
  2. **Spec Preview Modal (`components/editor/spec-preview-modal.tsx`)**:
     - Accessible preview modal built with shadcn `Dialog`, `ScrollArea`, and `Button`.
     - Fetches spec Markdown content on demand via `GET /api/projects/[projectId]/specs/[specId]/download` (safe backend proxy, no direct Vercel Blob URLs in client).
     - Semantic Markdown renderer supporting headings (`h1`-`h4`), ordered/unordered lists, code blocks, inline code, blockquotes, and dividers with theme styling.
     - Transient content lifecycle: Markdown text is cleared upon modal close to prevent long-term storage in frontend state.
     - Includes keyboard navigation, close button, and header download action.
  3. **Browser File Download**:
     - Download buttons on both spec list cards and the preview modal trigger native browser file downloads through `downloadSpecFile(projectId, specId)`.
     - Preserves sanitized server-generated attachment filename.
  4. **Prisma Client Dev Cache Resilience (`lib/prisma.ts`)**:
     - Added auto-refresh check to `lib/prisma.ts` singleton to detect if `globalThis.prisma` in `next dev` lacks newer models (such as `projectSpec` or `taskRun`), recreating the client immediately.
     - Wrapped exported `prisma` with a delegating `Proxy` to prevent stale client reference issues during Hot Module Replacement (HMR).
  5. **UserButton & Sign Out Availability (`components/editor/editor-navbar.tsx`, `components/editor/project-sidebar.tsx`)**:
     - Removed `!isWorkspace` gating that hid the Clerk `<UserButton />` in the workspace canvas view.
     - Added subtle divider between `<PresenceAvatars />` and `<UserButton />` when collaborators are active per Feature 19.
     - Added an explicit "Sign Out" button to the `ProjectSidebar` footer.
  6. **Verification**:
     - TypeScript check (`npx tsc --noEmit`) passes with 0 errors.
     - ESLint (`npm run lint`) passes with 0 warnings/errors.
     - Production build (`npm run build`) compiles cleanly with all routes verified.

- `28-spec-persistence-download`: Persisted generated technical specifications with Vercel Blob and Prisma metadata, integrated auto-persistence into the Trigger.dev task, and added secure download and management routes (`context/feature-specs/28-spec-persistence-download.md`):
  1. **Prisma ProjectSpec Model (`prisma/models/spec.prisma`, `prisma/models/project.prisma`, `lib/prisma.ts`)**:
     - Defined `ProjectSpec` model with `id` (`@id @default(cuid())`), `projectId` (foreign key to `Project` with cascade delete), `filePath` (Vercel Blob URL or local fallback path), and `createdAt` timestamp.
     - Added `specs ProjectSpec[]` relation to `Project` model.
     - Exported `ProjectSpec` type from `lib/prisma.ts`.
     - Generated Prisma Client via `npx prisma generate` and synced database schema using `npx prisma db push`.
  2. **Spec Storage Infrastructure (`lib/spec-storage.ts`)**:
     - Created `saveProjectSpec(projectId, markdownContent, customSpecId?)` uploading Markdown content to Vercel Blob at `specs/${projectId}/${specId}.md` (handling both public and private stores transparently with resilient local disk fallback `.data/specs/${projectId}/...`).
     - Created `fetchSpecContent(filePath)` retrieving raw Markdown content from private/public Vercel Blob streams or local files.
  3. **Auto-Persistence in Generation Task (`trigger/generate-spec.ts`)**:
     - Updated `executeGenerateSpec` to automatically invoke `saveProjectSpec` upon successful Markdown generation.
     - Records `specId` and `filePath` in Trigger.dev run metadata (`metadata.set("specId", ...)`).
  4. **Secure Download Route (`app/api/projects/[projectId]/specs/[specId]/download/route.ts`)**:
     - Implemented `GET /api/projects/[projectId]/specs/[specId]/download`.
     - Authenticates user session with Clerk (`auth()`).
     - Verifies user access to the project (`getProjectAccess(projectId)`), returning 403 on forbidden/unauthorized.
     - Verifies spec ownership and project association (`spec.projectId === projectId`), returning 404 if missing.
     - Fetches Markdown content using `spec.filePath` without exposing underlying private storage credentials.
     - Returns downloadable attachment with `Content-Type: text/markdown; charset=utf-8` and `Content-Disposition: attachment; filename="<project>-spec-<id>.md"`.
  5. **Spec Management Route (`app/api/projects/[projectId]/specs/route.ts`)**:
     - Added `GET` endpoint to list all `ProjectSpec` metadata for a project.
     - Added `POST` endpoint to persist a spec directly with Zod validation.
  6. **Verification**:
     - Verified `npx prisma db push` synced PostgreSQL table in 4.78s.
     - Verified `npx tsc --noEmit` exits with 0 errors.
     - Verified `npm run lint` exits with 0 warnings/errors.
     - Verified `npm run build` compiles production Next.js application with all routes registered.

- `27-spec-generation-flow`: Implemented the backend flow for AI-powered Markdown spec generation, including API trigger route, token access route, and Trigger.dev `generate-spec` task (`context/feature-specs/27-spec-generation-flow.md`):
  1. **Spec Trigger Route (`app/api/ai/spec/route.ts`)**:
     - Created `POST /api/ai/spec` accepting `{ roomId, chatHistory, nodes, edges }`.
     - Validates input body with Zod schema.
     - Authenticates user session with Clerk (`auth()`).
     - Resolves project access strictly from `roomId` via `getProjectAccess(roomId)`; never trusts client-supplied `projectId`.
     - Triggers the `generate-spec` task via `tasks.trigger<typeof generateSpec>("generate-spec", payload)`.
     - Persists a `TaskRun` record in Prisma (`runId`, `projectId`, `userId`) for ownership tracking and access control.
     - Returns `{ runId }` to the client.
  2. **Spec Token Route (`app/api/ai/spec/token/route.ts`)**:
     - Created `POST /api/ai/spec/token` accepting `{ runId }`.
     - Validates input body with Zod schema.
     - Authenticates current user with Clerk.
     - Verifies `TaskRun` ownership against the authenticated `userId`.
     - Generates and returns a scoped Trigger.dev public access token with 1-hour expiration (`expirationTime: "1h"`).
  3. **Spec Generation Task (`trigger/generate-spec.ts`)**:
     - Implemented `generateSpec` task (id: `"generate-spec"`) using `@trigger.dev/sdk`.
     - Validates payload with Zod (`generateSpecPayloadSchema`).
     - Normalizes nodes, edges, and chat history into structured prompt context.
     - Automatically falls back to fetching room storage from Liveblocks if nodes or edges are omitted or empty.
     - Uses Gemini through `@ai-sdk/google` (`createGoogleGenerativeAI`) with multi-model fallback (`gemini-2.5-flash`, `gemini-2.0-flash`, `gemini-1.5-flash`) and fallback to OpenRouter.
     - Updates run metadata/status for realtime tracking via `metadata.set` and broadcasts progress to Liveblocks `ai-status-feed` (`taskType: "spec"`).
     - Returns generated spec content directly as plain Markdown task output.
  4. **Verification**:
     - Verified `npx tsc --noEmit` exits with 0 errors.
     - Verified `npm run lint` exits with 0 warnings/errors.
     - Verified `npm run build` compiles production Next.js application with both routes registered (`/api/ai/spec` and `/api/ai/spec/token`).

- `26-design-agent-frontend`: Wired up the AI sidebar so users can submit design prompts, track AI task runs in real time via Trigger.dev's `useRealtimeRun`, show a compact status strip above the input during active runs, display green `#62C073` accents, and reflect AI-driven canvas updates through Liveblocks (`context/feature-specs/26-design-agent-frontend.md`):
  1. **Prompt Submission Flow (`components/editor/ai-sidebar.tsx`, `app/api/ai/design/route.ts`)**:
     - User submission immediately publishes user chat message to the room-scoped `ai-chat` feed.
     - Calls `POST /api/ai/design` with `{ prompt, roomId }`.
     - `app/api/ai/design/route.ts` generates a public access token scoped to the triggered run via `triggerAuth.createPublicToken({ scopes: { run: run.id } })` and returns `{ success: true, runId: run.id, publicToken: token }`.
     - Stores `runId` and `publicToken` in local state and clears the prompt draft.
  2. **Real-time Run Tracking with Trigger.dev (`components/editor/ai-sidebar.tsx`)**:
     - Installed `@trigger.dev/react-hooks` and wired `useRealtimeRun(activeRunId, { accessToken: publicToken, onComplete: handleRunComplete })`.
     - Tracks run lifecycle across `QUEUED`, `DEQUEUED`, `EXECUTING`, and `WAITING` statuses.
     - While run is active: disables prompt textarea, disables submit button, and renders spinning loader.
     - When run completes (`COMPLETED`): automatically pushes final Ghost AI response message with generated summary to `ai-chat` feed and resets run state.
     - When run fails or errors occur (`FAILED`, `CRASHED`, `CANCELED`, `SYSTEM_FAILURE` or hook connection error): posts error notification message into `ai-chat` feed and cleanly resets run state.
  3. **Compact Active Status Strip (`components/editor/ai-sidebar.tsx`)**:
     - Reads the single latest validated message from `ai-status-feed` (or workspace activity).
     - Renders a compact status bar above the chat input with dark base (`bg-[#111113]`, `border-[#222226]`) and `#62C073` green accent + spinning loader.
     - Conditionally rendered strictly when an AI run is active (`isRunActive`).
  4. **UI Styling & Tokens (`components/editor/ai-sidebar.tsx`)**:
     - User chat bubble styled with green accent background (`#62C073`) and dark text (`#080809`) for contrast.
     - AI chat bubbles styled with elevated dark background (`bg-[#1a1a1e]`), light text (`text-[#E6E6E6]`), and Ghost AI tag.
     - Submit button styled with `#62C073` green background and dark text when enabled; dimmed when disabled or empty; displays spinning loader while running.
  5. **Collaborative Liveblocks Canvas Updates**:
     - Zero manual mutations to nodes/edges on frontend; relies entirely on collaborative Liveblocks CRDT storage (`useLiveblocksFlow`) to automatically reflect AI modifications across all connected clients.
  6. **Verification**:
     - Verified `npx tsc --noEmit` exits with 0 errors.
     - Verified `npm run lint` exits with 0 warnings/errors.
     - Verified `npm run build` compiles production Next.js app with exit code 0.

- `25-sidebar-chat-feed`: Implemented real-time room chat in the AI sidebar using a dedicated Liveblocks `ai-chat` feed separate from `ai-status-feed` (`context/feature-specs/25-sidebar-chat-feed.md`):
  1. **Chat Message Schema & Validation (`types/tasks.ts`)**:
     - Defined `aiChatMessagePayloadSchema` with Zod including `sender` (`string` or object with `id`, `name`, `avatar`, `color`), `role` (`"user" | "assistant" | "system"`), `content` (non-empty string), and `timestamp`.
     - Created `validateAiChatMessage` to validate incoming chat feed messages before rendering.
  2. **Liveblocks Feed Typings & Auth Setup (`liveblocks.config.ts`, `app/api/liveblocks-auth/route.ts`)**:
     - Extended `FeedMessageData` with `sender`, `role`, and `content`.
     - Ensured both `ai-chat` and `ai-status-feed` are created on room session authorization.
  3. **Sidebar Chat Feed Wiring (`components/editor/ai-sidebar.tsx`)**:
     - Subscribed to `ai-chat` using `useFeedMessages("ai-chat")` and ensured feed creation via `useCreateFeed()`.
     - Validated incoming messages and rendered them in chronological order.
     - Displayed sender name (with individual presence colors), formatted timestamp, and styled message bubbles (user messages right-aligned in cyan accent, collaborators left-aligned in elevated dark surface).
     - Auto-scrolls chat to bottom on new messages.
     - Preserved empty state with starter prompts.
  4. **Message Sending & Error Handling (`components/editor/ai-sidebar.tsx`)**:
     - Enabled sending messages to `ai-chat` via `useCreateFeedMessage()` using current user info (`useSelf()`).
     - Clears the textarea input after a successful send.
     - Renders a dismissible error banner if sending fails.
     - Sending state disabled when sending or when AI is active.
  5. **Clean Separation of Feeds**:
     - `ai-chat` strictly handles collaborative chat messages between participants.
     - `ai-status-feed` strictly handles AI progress and presence updates.
     - No mixing between feeds or background tasks.
  6. **Verification**:
     - Verified `npx tsc --noEmit` exits with 0 errors.
     - Verified `npm run lint` exits with 0 warnings/errors.
     - Verified `npm run build` generates production build with code 0.

- `24-ai-presence-state`: Implemented shared AI activity indicators, Liveblocks `ai-status-feed`, feed message validation, live cursor thinking spinners, and AI sidebar input state gating (`context/feature-specs/24-ai-presence-state.md`):
  1. **Feed Payload Schema & Message Validation (`types/tasks.ts`)**:
     - Defined `aiStatusFeedPayloadSchema` using Zod supporting `status`, optional `text` field, `message`, `summary`, `taskType` (`"design" | "spec" | "general"`), `timestamp`, and `userId`.
     - Created `validateAiStatusFeedMessage` to validate incoming feed messages with safe parse and fallback normalization before rendering in UI.
  2. **Liveblocks Feed & Room Event Typings (`liveblocks.config.ts`)**:
     - Typed `FeedMetadata` and `FeedMessageData` in `declare global { interface Liveblocks }`.
     - Extended `RoomEvent` to support `ai-status-feed` event format alongside `AI_STATUS`.
  3. **Thinking Indicators on Live Cursors (`components/canvas/live-cursors.tsx`)**:
     - Read `other.presence?.thinking` (and fallback `isThinking`).
     - Rendered `<Loader2 className="h-3 w-3 animate-spin text-white shrink-0" />` inside the collaborator cursor name badge when `thinking: true`.
     - Dynamically hidden when `thinking` is false or missing.
  4. **Shared AI Status Feed & Sidebar Thinking State (`components/editor/ai-sidebar.tsx`)**:
     - Subscribed to `ai-status-feed` using `@liveblocks/react`'s `useFeedMessages("ai-status-feed")` and ensured feed creation on mount via `useCreateFeed()`.
     - Extracted and validated only the single most recent status message.
     - Computed combined `isAiWorking` state across local submission, feed status (`start`, `thinking`, `processing`), collaborator thinking presence (`useOthers()`), and broadcast activity events.
     - Rendered small thinking status indicator in the sidebar header and message area displaying validated `text`/`message`.
     - Disabled chat textarea with dedicated placeholder while AI is actively working in the room.
     - Displayed loading state with spinning loader on the send button (`Generating...`).
     - Kept the rest of the sidebar usable (tabs, close button, spec actions, scrolling).
  5. **Workspace Shell & Canvas Isolation (`components/editor/workspace-shell.tsx`, `components/canvas/canvas.tsx`)**:
     - Wrapped workspace content in `CanvasWrapper` so `AiSidebar` accesses `RoomProvider` context directly.
     - Memoized `Canvas` component with `React.memo` preventing canvas re-renders when sidebar toggles or generation states update.
  6. **Real-time Server Feed Emission (`trigger/design-agent.ts`, `app/api/liveblocks-auth/route.ts`)**:
     - Guaranteed `ai-status-feed` is created on room session auth.
     - Emitted feed messages via `liveblocks.createFeedMessage` on task start, processing, completion, and error.
  7. **Verification**:
     - Verified `npx tsc --noEmit` exits with 0 errors.
     - Verified `npm run lint` exits with 0 warnings/errors.
     - Verified `npm run build` generates production bundle successfully.

- `23-design-agent-logic`: Implemented the full AI design agent interpreting user prompts, collaboratively mutating the canvas through Liveblocks CRDT storage, rendering real-time AI presence & live cursor, broadcasting status updates, and integrating with the AI sidebar (`context/feature-specs/23-design-agent-logic.md`):
  1. **AI Design Task Implementation (`trigger/design-agent.ts`)**:
     - Added `executeDesignAgent` callable by Trigger.dev `designTask` or direct invocation.
     - Integrated model resolution: supports `GEMINI_API_KEY` via `@ai-sdk/google` (`gemini-2.5-flash`) or `OPENROUTER_API_KEY` via `@openrouter/ai-sdk-provider` (`google/gemini-2.5-flash-lite` with fallback to `openai/gpt-4o-mini`).
     - Reads existing room storage via `liveblocks.getStorageDocument(roomId, "json")` to provide current graph context to the LLM.
     - System prompt enforces exact technical node shapes (`rectangle`, `diamond`, `circle`, `pill`, `cylinder`, `hexagon`), official 8 color pairs (`NODE_COLORS`), and clear hierarchical column/layer layout with strict non-overlapping bounds and standard connection handles (`right` -> `left`).
     - Implemented action execution for all 7 actions: `add_node`, `move_node`, `resize_node`, `update_node_data`, `delete_node` (with cascade edge removal), `add_edge`, and `delete_edge`.
     - Applies changes via `liveblocks.mutateStorage` on `flow.nodes` and `flow.edges` LiveMaps, preserving existing collaborative CRDT synchronization.
  2. **AI Presence & Live Cursors**:
     - Updates ephemeral AI presence using `liveblocks.setPresence(roomId, { userId: "ghost-ai", data: { cursor, thinking: true }, userInfo: { name: "Ghost AI", color: "#6457F9" }, ttl })`.
     - Animates the AI cursor to the location of newly placed/moved nodes on the canvas.
     - Appears in `LiveCursors` as a purple pointer with "Ghost AI" name badge, and in `PresenceAvatars` navbar stack.
     - Clears presence with `cursor: null`, `thinking: false`, and `ttl: 2` in a `finally` block on completion or error.
  3. **Shared Status Feed & Live Broadcasts**:
     - Broadcasts `AI_STATUS` events at key steps: `start`, `processing`, `complete`, and `error`.
     - Typed `RoomEvent` in `liveblocks.config.ts`.
     - Added `AiActivityStatus` to `WorkspaceContext` (`hooks/use-workspace.tsx`).
     - `PresenceSync` (`components/editor/presence-sync.tsx`) listens to room broadcast events via `useEventListener` and feeds updates into `WorkspaceContext` for all collaborators in the room.
  4. **AI Sidebar Integration (`components/editor/ai-sidebar.tsx` & `components/editor/workspace-shell.tsx`)**:
     - Passed `roomId` and `projectId` to `AiSidebar`.
     - Replaced placeholder demo timeouts with live fetch to `POST /api/ai/design`.
     - Renders live thinking indicator with active step messages in the chat feed and submitting button state.
     - Automatically posts completed assistant messages summarizing generated architectures or errors.
  5. **Verification**:
     - Tested `executeDesignAgent` against Liveblocks room with `npx tsx` — generated 5 nodes and 4 edges with correct shapes, colors, and layout.
     - Cleaned up test storage.
     - Verified `npx tsc --noEmit`, `npm run lint`, and `npm run build` all pass with 0 errors and 0 warnings.

- `22-design-agent-api`: Implemented backend infrastructure for design generation with Trigger.dev (`context/feature-specs/22-design-agent-api.md`):
  1. **TaskRun model & Prisma schema (`prisma/models/task-run.prisma`, `project.prisma`, `lib/prisma.ts`)**:
     - Added `TaskRun` model with `runId` (unique), `projectId`, `project` relation (`onDelete: Cascade`), `userId`, and `createdAt`.
     - Added index on `runId` and compound index on `[userId, projectId]`.
     - Synchronized PostgreSQL database with `npx prisma db push` and generated client with `npx prisma generate`.
     - Re-exported `TaskRun` type in `lib/prisma.ts`.
  2. **Design task (`trigger/design-agent.ts` & `src/trigger/design-agent.ts`)**:
     - Defined `designTask` using `task()` with ID `"design-agent"`.
     - Accepts typed payload `{ prompt: string, roomId: string, projectId?: string }`.
     - Logs payload and returns `{ success: true, prompt, roomId, projectId }` without invoking AI providers yet per specification boundaries.
     - Configured `trigger.config.ts` dirs to include both `./trigger` and `./src/trigger`.
  3. **Design trigger route (`app/api/ai/design/route.ts`)**:
     - Created `POST /api/ai/design`.
     - Enforces Clerk authentication (`await auth()`).
     - Validates input body (`prompt`, `roomId`, `projectId`).
     - Verifies project access (owner or collaborator) via `getProjectAccess`.
     - Triggers `designTask` via Trigger.dev (`tasks.trigger<typeof designTask>("design-agent", ...)`).
     - Persists `TaskRun` record in Prisma mapping `runId`, `projectId`, and `userId`.
     - Returns `{ runId }` to the client.
  4. **Token route (`app/api/ai/design/token/route.ts`)**:
     - Created `POST /api/ai/design/token`.
     - Enforces Clerk authentication.
     - Validates `runId` from body.
     - Verifies task run ownership against `prisma.taskRun.findUnique`.
     - Issues a run-scoped public token via Trigger.dev SDK `auth.createPublicToken({ scopes: { read: { runs: [runId] } } })`.
     - Returns `{ token }` to the client.
  5. **Validation & configuration**:
     - Configured `eslint.config.mjs` to ignore `.trigger/**`, `app/generated/**`, `.data/**`, and `.agents/**`.
     - Verified `npx tsc --noEmit`, `npm run lint`, and `npm run build` pass cleanly with zero errors and zero warnings.

- `trigger-setup`: Initialized Trigger.dev in the project following the official setup skill:
  1. **Dependencies**: Verified `@trigger.dev/sdk` (`^4.7.3`) in `dependencies` and `@trigger.dev/build` (`^4.7.3`) in `devDependencies`.
  2. **Configuration (`trigger.config.ts`)**: Configured project reference (`proj_oepumbxznsaltzwlocpb`), runtime (`node-24`), log level, retry strategy, and task directory pointing to `./src/trigger`.
  3. **Tasks scaffolded (`src/trigger/example.ts`)**: Created initial `helloWorld` task defined with `task()` from `@trigger.dev/sdk`.
  4. **TypeScript and gitignore**: Verified `trigger.config.ts` in `tsconfig.json` `include` array and `.trigger` in `.gitignore`.
  5. **Validation**: Verified `npx tsc --noEmit`, `npm run lint`, and `npm run build` pass with zero errors.

- `current-issues`: Resolved all 6 workspace editor issues documented in `context/current-issues.md`:
  1. **Issue 2: Collaborative node and edge deletion (`components/canvas/canvas.tsx`)**:
     - Added keydown event listener to canvas wrapper and window listening for `Delete` and `Backspace` keys.
     - Early-exits when the active event target is an `input`, `textarea`, `select`, or `contenteditable` / textbox element.
     - Retrieves currently selected nodes using `useNodes()` filtered by `node.selected` and currently selected edges using `useEdges()` filtered by `edge.selected`.
     - Automatically resolves all connected edges for selected nodes via `@xyflow/react`'s `getConnectedEdges`.
     - Deletes nodes and all associated edges via Liveblocks collaborative mutation helper (`onDelete({ nodes, edges })`), ensuring real-time synchronized deletion across all connected participants.
     - Configured `deleteKeyCode={null}` on `<ReactFlow>` to disable built-in non-collaborative keyboard deletion.
  2. **Issue 3: Node connection handles (`components/canvas/canvas-node.tsx`)**:
     - Enabled all 4 connection handles (`Position.Top`, `Position.Right`, `Position.Bottom`, `Position.Left`) with explicit `isConnectable={isConnectable}`, `isConnectableStart={true}`, and `isConnectableEnd={true}`.
     - Added `pointer-events-auto cursor-crosshair` with `z-10` above shape bodies ensuring handles on all sides are immediately hoverable and connectable.
     - Verified handle IDs (`top`, `right`, `bottom`, `left`) match edge definitions and sync across Liveblocks edges.
  3. **Issue 4: Drag and drop position offset (`components/canvas/canvas.tsx`)**:
     - Updated `handleDrop` to accurately calculate canvas coordinates via `screenToFlowPosition({ x: event.clientX, y: event.clientY })`.
     - Places the node center at the exact drop cursor position (`position.x - size.width / 2`, `position.y - size.height / 2`).
     - Added explicit `style: { width: size.width, height: size.height }` to newly created node objects so React Flow and handle bounds have exact dimensions from the initial render.
     - Added `event.stopPropagation()` and removed duplicate `onDrop` from `<ReactFlow>` to prevent redundant drop execution.
  4. **Issue 5: Auto-zoom on first node drop (`components/canvas/canvas.tsx`)**:
     - Removed automatic `fitView` prop from `<ReactFlow>`, preventing viewport jump and auto-zoom when the first node is dropped onto an empty canvas.
     - Viewport stays exactly where the user left it. Retained smooth animated `fitView` calls for template imports and saved project hydration.
  5. **Issue 6: Collaborator avatar image error (`next.config.ts`)**:
     - Added `img.clerk.com` to `images.remotePatterns` with `protocol: "https"` in `next.config.ts`.
  6. **Issue 7: Remove UserButton from workspace navbar (`components/editor/editor-navbar.tsx`)**:
     - Conditionally rendered `<UserButton />` only when `!isWorkspace`, keeping it on the editor home navbar (`/editor`) while removing it from the workspace navbar (`/editor/[roomId]`).
     - Removed trailing divider after collaborator avatars in workspace view.
  7. **Multi-node box selection & marquee enhancement (`components/canvas/canvas.tsx` & `app/globals.css`)**:
     - Configured `selectionMode={SelectionMode.Partial}` and `multiSelectionKeyCode={["Meta", "Control"]}` on `<ReactFlow>`.
     - Users can drag a selection box across multiple nodes (by holding `Shift` + dragging the mouse across the canvas) or `Ctrl`/`Cmd` + click individual nodes.
     - Styled the React Flow selection marquee box in `app/globals.css` with a translucent cyan fill (`rgba(0, 200, 212, 0.08)`) and dashed cyan border matching the project dark theme.
     - Pressing `Delete` or `Backspace` deletes all selected nodes and their connected edges collaboratively in one transaction.
  8. **Validation**: Verified `npx tsc --noEmit`, `npm run lint`, and `npm run build` pass with zero errors.

- `21-canvas-autosave`: Implemented debounced canvas autosave, Vercel Blob storage, Prisma metadata persistence, empty-room initial loading, and navbar save status indicator (`context/feature-specs/21-canvas-autosave.md`):
  1. **Package installation**: Installed `@vercel/blob` to handle canvas snapshot artifact uploads.
  2. **Schema verification (`prisma/models/project.prisma`)**: Verified `canvasJsonPath` on `Project` model stores the returned Vercel Blob URL reference while keeping Prisma responsible for relational metadata only.
  3. **Canvas API routes (`app/api/projects/[projectId]/canvas/route.ts`)**:
     - `PUT`: Authenticates user, verifies project access (owner or collaborator), uploads `{ nodes, edges }` JSON snapshot to Vercel Blob (`canvas/{projectId}.json`) with `addRandomSuffix: false` and `allowOverwrite: true` to modify the existing blob in-place without creating duplicate files, cleans up legacy suffix-based blobs, and updates `canvasJsonPath` on the Prisma `Project` record.
     - `GET`: Authenticates user, verifies project access, retrieves `canvasJsonPath` from Prisma, fetches the JSON state using `@vercel/blob`'s authenticated `get()` (for private stores) or standard fetch (for public/local stores), and returns `{ nodes, edges, url }`.
  4. **Autosave hook (`hooks/use-canvas-autosave.ts`)**:
     - Created `useCanvasAutosave` hook watching canvas nodes and edges.
     - Strips ephemeral selection/dragging properties to only trigger saves on structural/visual changes.
     - Debounces network writes by 2000ms.
     - Intelligently pauses and delays autosave execution while a user is actively typing in a textarea or input (`document.activeElement?.tagName === "TEXTAREA" | "INPUT"`), triggers save promptly 600ms after input blur, and chains a follow-up save if edits occur while a save request is already in-flight.
     - Tracks save status: `"idle" | "saving" | "saved" | "error"`.
     - Exposes manual `saveNow()` trigger and `markAsSaved()` for server hydration sync.
     - Created alias exports in `hooks/useCanvasAutosave.ts` and `hook/use-canvas-autosave.ts`.
  5. **Typing ergonomics & canvas re-render isolation (`canvas-node.tsx`, `workspace-shell.tsx`, `use-workspace.tsx`)**:
     - Updated inline label editing in `components/canvas/canvas-node.tsx` to maintain fast local draft editing while typing and commit to React Flow and Liveblocks CRDT only on blur or Enter, matching `canvas-edge.tsx`. Set selection range to end of text on focus instead of selecting all text.
     - Memoized `<CanvasWrapper roomId={project.id} />` in `components/editor/workspace-shell.tsx` and wrapped `CanvasWrapper` with `React.memo` to ensure the Liveblocks canvas never re-renders or unmounts when navbar save status or workspace sidebar changes.
     - Memoized `WorkspaceContext` value and used `useRef` for `onSaveHandler` in `hooks/use-workspace.tsx` to prevent cascading render loops during autosave.
  6. **Empty-room initial loading & collaboration preservation (`components/canvas/canvas.tsx`)**:
     - On editor load, checks if the Liveblocks room has existing nodes or edges.
     - If the room already has nodes or edges, skips server loading entirely to prevent overwriting active collaboration.
     - If the room is empty and the project has a saved canvas blob URL, fetches saved state, populates Liveblocks CRDT storage (`loadSavedCanvas` mutation) and React Flow state, and smoothly fits view.
     - Autosave is gated until initial room inspection completes, preventing saving empty state over existing blobs.
  7. **Save status indicator in editor navbar (`components/editor/editor-navbar.tsx` & `hooks/use-workspace.tsx`)**:
     - Added `saveStatus`, `setSaveStatus`, `setOnSave`, and `triggerSave` to `WorkspaceContext`.
     - Added Save button in the editor navbar displaying dynamic status indicators:
       - Saving: spinning `Loader2` icon and `Saving...` label.
       - Saved: green `Check` icon (`text-state-success`) and `Saved` label.
       - Error: red `AlertCircle` icon (`text-state-error`) and `Error` label (clickable to retry).
       - Idle: `Save` icon and `Save` label.
     - Clicking the Save button triggers manual immediate save.
  8. Verified `npx tsc --noEmit`, `npm run lint`, and `npm run build` pass with zero errors and zero warnings.

- `20-ai-sidebar-shell`: Completed AI sidebar shell and separated into dedicated component (`context/feature-specs/20-ai-sidebar-shell.md`):
  1. **Component separation (`ai-sidebar.tsx`)**: Created `components/editor/ai-sidebar.tsx` preserving floating position (`fixed right-0 top-12 z-30 w-80 md:w-88`), background (`bg-bg-surface/95 backdrop-blur-md`), borders (`border-l border-border-default`), shadow (`shadow-2xl`), and slide-in transition (`translate-x-0` / `translate-x-full duration-300`). Wired into `WorkspaceShell`.
  2. **Sidebar header**: Rendered header with title `AI Workspace` (`text-text-primary text-sm font-semibold`), subtitle `Collaborate with Ghost AI` (`text-text-muted text-xs`), bot icon badge, and close button aligned to the right.
  3. **Two-tab layout**: Implemented shadcn `Tabs` with `AI Architect` and `Specs` tabs, styled with `bg-accent-ai` active tab highlights and muted inactive tab labels.
  4. **AI Architect tab**:
     - Scrollable chat area with responsive message list.
     - Empty state with bot icon, description, and 3 starter prompt chips (`Design an e-commerce backend`, `Create a chat app architecture`, `Build a CI/CD pipeline`) styled as soft pills (`bg-bg-subtle border border-border-default text-accent-ai-text`).
     - Distinct chat bubble styling: user messages right-aligned with `bg-accent-primary-dim border-2 border-accent-primary/50 text-text-primary`, assistant messages left-aligned with `bg-bg-elevated border border-border-default text-text-primary`.
     - Sticky bottom input area with auto-resizing textarea (72px min, 160px max), send button (`bg-accent-ai text-white`), Enter-to-submit, and Shift+Enter for newlines.
  5. **Specs tab**:
     - Rendered `Generate Spec` action button using `bg-accent-ai text-white`.
     - Demo spec card (`bg-bg-elevated border border-border-default`) with `FileText` icon, title, description snippet, and disabled download button.
  6. Verified `npx tsc --noEmit`, `npm run lint`, and `npm run build` pass with zero errors and zero warnings.

- `19-presence-avatars-cursor`: Implemented collaborative presence avatars and live multiplayer cursors (`context/feature-specs/19-presence-avatars-cursor.md`):
  1. **Shared presence type (`liveblocks.config.ts`)**: Configured `cursor` (`{ x: number; y: number } | null`) and `thinking: boolean` (along with `isThinking?: boolean`) in Liveblocks Presence. Updated `CanvasWrapper` with default `thinking: false`.
  2. **Collaborative presence sync (`presence-sync.tsx` & `use-workspace.tsx`)**: Created `PresenceSync` component inside `CanvasWrapper` room provider syncing active room participants into `WorkspaceContext` without triggering unnecessary re-renders on high-frequency cursor movements.
  3. **Participant avatar group (`presence-avatars.tsx`)**: Created display-only `PresenceAvatars` component:
     - Automatically resolves current user identity from Clerk session (`useUser().user?.id`) and strictly excludes current user from the collaborator avatars list.
     - Displays profile photos when available, falling back to uppercase name initials.
     - Overlapping stack of up to 5 collaborator avatars with subtle ring (`ring-2 ring-bg-surface`) for high contrast on the dark canvas.
     - Displays `+N` overflow badge chip when more than 5 collaborators are present.
     - Sized to match Clerk UserButton (`h-7 w-7 sm:h-8 sm:w-8`).
  4. **Navbar integration & home preservation (`editor-navbar.tsx`)**:
     - Positioned presence avatars in the top-right corner of the editor canvas view alongside the Clerk UserButton, visually separated from main workspace actions.
     - Shows a thin divider between collaborator avatars and `UserButton` ONLY when at least one collaborator exists.
     - When no collaborators are present, renders only `UserButton` with no divider.
     - Completely preserves editor home navbar (`isWorkspace = false`) so no presence UI or dividers appear on the home screen.
  5. **Collaborative live cursors (`live-cursors.tsx` & `canvas.tsx`)**:
     - Wired `onMouseMove` on React Flow to broadcast cursor coordinates via `updateMyPresence({ cursor: screenToFlowPosition(...) })`.
     - Wired `onMouseLeave` and window `blur` to clear cursor position to `null`.
     - Created `LiveCursors` rendering colored pointer SVG and name badge pill for other participants only, matching each participant's presence color (`other.info?.color`).
     - Fully isolated with `pointer-events-none` so live cursors never block canvas interactions.
  6. Verified `npx tsc --noEmit`, `npm run lint`, and `npm run build` pass with zero errors and zero warnings.

- `18-starter-template`: Implemented pre-built starter architecture templates library, modal with SVG previews, and collaborative canvas replacement (`context/feature-specs/18-starter-template.md`):
  1. **Template library (`starter-templates.ts`)**: Defined `CanvasTemplate` interface and exported `CANVAS_TEMPLATES` containing 3 rich architectures:
     - `microservices-architecture`: Cloud services with API gateway, auth, microservices, Redis caching, and persistent PostgreSQL database.
     - `cicd-pipeline`: Automated build, test, container packaging, quality gate, and multi-stage deployment pipeline.
     - `event-driven-system`: Pub/sub message broker (Kafka), asynchronous event consumers, streaming analytics, push dispatch, and cold storage archiving.
     - Created reusable `createNode` and `createEdge` helper constructors mapping cleanly to shared canvas types (`CanvasNode`, `CanvasEdge`, `NodeShape`, and `NODE_COLORS`).
  2. **Starter templates modal (`starter-templates-modal.tsx`)**: Created responsive shadcn Dialog displaying templates in a grid with:
     - Lightweight SVG diagram preview: automatically calculates bounds from node coordinates, renders shape variants (`circle`, `diamond`, `hexagon`, `pill`, `rectangle`) with color fills, subtle borders, centered text labels, and dashed connecting lines between node centers without requiring a React Flow instance.
     - Template metadata (name, description, node count, edge count).
     - Import action button triggering canvas replacement and closing modal.
  3. **Navbar integration (`editor-navbar.tsx`)**: Added a dedicated `Templates` button with `LayoutTemplate` icon to the editor navbar for workspaces, opening the templates dialog via `useWorkspace().openTemplatesModal()`.
  4. **Canvas import & collaborative synchronization (`canvas.tsx`)**:
     - Built `replaceCanvasWithTemplate` Liveblocks mutation that completely clears existing nodes and edges in collaborative CRDT storage (`flow.nodes` and `flow.edges`) and populates the template nodes and edges.
     - Replaced local React Flow nodes and edges (`reactFlow.setNodes` and `reactFlow.setEdges`).
     - Smoothly animated viewport fitting (`reactFlow.fitView({ duration: 400, padding: 0.2 })`).
  5. Verified `npx tsc --noEmit`, `npm run lint`, and `npm run build` pass with zero errors.

- `17-canvas-ergonomics`: Implemented floating control bar, zoom, Liveblocks history undo/redo, keyboard shortcuts, and removed minimap (`context/feature-specs/17-canvas-ergonomics.md`):
  1. **Floating control bar (`CanvasControlBar`)**: Created `components/canvas/canvas-control-bar.tsx` rendering a pill-shaped bar at the bottom-left of the canvas (`bottom-6 left-6 z-25 bg-bg-surface/90 border border-border-default rounded-full shadow-2xl backdrop-blur-md`). Divided into two groups separated by a thin vertical divider (`bg-border-default`):
     - Zoom controls: Zoom out (`ZoomOut`), Fit view (`Maximize`), Zoom in (`ZoomIn`).
     - History controls: Undo (`Undo2`), Redo (`Redo2`).
  2. **Zoom integration**: Connected zoom controls to React Flow instance (`zoomIn`, `zoomOut`, `fitView`) with smooth 300ms animations (`{ duration: 300 }`).
  3. **Liveblocks history**: Connected undo and redo to Liveblocks room history (`useUndo`, `useRedo`). Disabled and visually dimmed buttons (`opacity-30 cursor-not-allowed`) when `!canUndo` or `!canRedo` via `useCanUndo()` and `useCanRedo()`.
  4. **Keyboard shortcuts (`useKeyboardShortcuts`)**: Created `hooks/useKeyboardShortcuts.ts` (and kebab-case alias `hooks/use-keyboard-shortcuts.ts`) listening for window keyboard events:
     - Zoom in: `+` or `=` (with smooth 300ms animation).
     - Zoom out: `-` or `_` (with smooth 300ms animation).
     - Undo: `Cmd/Ctrl + Z`.
     - Redo: `Cmd/Ctrl + Shift + Z` and `Cmd/Ctrl + Y`.
     - Intelligently ignores all shortcuts when focus is inside text inputs, textareas, or contenteditable fields (e.g. node and edge label editing).
  5. **Minimap removed**: Removed `<MiniMap>` and its import from `components/canvas/canvas.tsx`.
  6. Verified `npx tsc --noEmit`, `npm run lint`, and `npm run build` pass with zero errors.

- `16-edge-behavior`: Implemented edge connections, right-angle routing, and inline edge labels (`context/feature-specs/16-edge-behavior.md`):
  1. **Node connection handles**: Configured connection handles on all 4 sides (top, right, bottom, left) of every node with `ConnectionMode.Loose`, `isConnectableStart={true}`, and `isConnectableEnd={true}`, allowing connections between any two handles on the canvas. Styled handles as subtle white dots with dark borders (`bg-text-primary border-2 border-bg-base rounded-full`), hidden by default and smoothly fading in on node hover.
  2. **Custom canvas edge renderer (`canvasEdge`)**: Created `components/canvas/canvas-edge.tsx` utilizing `getSmoothStepPath` for clean right-angle routing with rounded corners (`borderRadius={8}`), SVG `<marker>` arrowhead matching stroke color, stroke ends rounded (`strokeLinecap="round"`), and dimmed stroke at rest (`rgba(240, 240, 244, 0.45)`) brightening on hover (`#f0f0f4`) and highlighting in cyan when selected (`var(--accent-primary)`).
  3. **Invisible wide interaction hitbox**: Layered an invisible preceding `<path>` with `strokeWidth={20}` and `stroke="transparent"` ahead of the visible line, enabling effortless mouse hover and click interactions without increasing the visible line thickness.
  4. **Inline edge label editing**: Double-clicking an edge opens an inline label editor rendered via `EdgeLabelRenderer` and centered precisely using `labelX` and `labelY` coordinates from `getSmoothStepPath`. Utilizes an auto-growing input with mirror `<span>` matching the label styling. Saves on `blur`, `Enter`, or `Escape`. Displays saved labels as subtle pill badges (`bg-bg-surface/95 border border-border-default text-text-primary px-2 py-0.5 rounded-full text-xs shadow-md`). Shows a faint hint pill (`+ Add label`) when an edge is selected without a label. Configured `nodrag nopan` and event propagation isolation to prevent canvas panning/dragging while typing.
  5. **Collaborative synchronization**: Defined `CanvasEdgeData` in `types/canvas.ts`, configured atomic edge label synchronization (`edges.sync: { "*": { label: "atomic" } }`) in `useLiveblocksFlow`, and updated `components/canvas/canvas.tsx` with default edge options and type casting to ensure all connections create `canvasEdge` instances synchronized across Liveblocks CRDT and React Flow.
  6. Verified `npx tsc --noEmit`, `npm run lint`, and `npm run build` pass with zero errors.

- `01-design-system`: shadcn/ui installed and configured with Tailwind v4, lucide-react installed, `lib/utils.ts` created with `cn()` helper, all required UI components added (Button, Card, Dialog, Input, Tabs, Textarea, ScrollArea), `app/globals.css` configured with dark-only theme wired to project design tokens.
- `02-editor`: Editor chrome shell components created — `components/editor/editor-navbar.tsx` (fixed-height top navbar with `PanelLeftOpen`/`PanelLeftClose` sidebar toggle, left/center/right sections, dark background with bottom border) and `components/editor/project-sidebar.tsx` (floating overlay sidebar that slides in from the left without pushing page content, accepts `isOpen`/`onClose` props, shadcn Tabs with My Projects + Shared tabs showing empty placeholder states, full-width New Project button with Plus icon at the bottom). Dialog pattern documented — use existing color tokens from `globals.css`; no actual dialogs built yet. All components compile with zero TypeScript errors.
- `03-auth`: Clerk authentication wired into Next.js 16. `@clerk/ui` installed. `proxy.ts` at project root with protected-first strategy — all routes protected except `/sign-in` and `/sign-up`. Root layout wraps app with `ClerkProvider` using Clerk `dark` theme + CSS variable overrides (`colorPrimary`, `colorBackground`, `borderRadius`) — no hardcoded colors. Sign-in and sign-up pages created with two-panel layout (branding left, Clerk form right on large screens; form only on small screens). Root `/` redirects authenticated users to `/editor`, unauthenticated to `/sign-in`. `UserButton` added to editor navbar right section. App restructured with route groups: `(auth)` for sign-in/sign-up (no editor chrome), `(editor)` for editor pages (with EditorShell). `npm run build` passes.
- `04-project-dialogues`: Built the `/editor` home screen and project dialogs/sidebar actions using mock data. Defined `types/project.ts` with project interface and initial mock data. Created `lib/slug.ts` with robust slug generation and validation (`SLUG_MIN_LENGTH`, `SLUG_MAX_LENGTH`, regex pattern, and duplicate check). Created `hooks/use-project-dialogs.tsx` managing dialog state, form state, live slug validation, and loading state via `ProjectDialogsProvider` and `useProjectDialogs`. Created `components/editor/project-dialogs.tsx` rendering Create Project (with live slug preview and validation error display), Rename Project (with prefilled name, current name in description, auto-focus, Enter submission, and scoped slug uniqueness check), and Delete Project (destructive confirmation only, no input, destructive button styling). Updated `components/editor/project-sidebar.tsx` to list mock projects, wired rename and delete actions for owned projects, hid actions for shared projects, wired create dialog to the New Project button, and added a mobile backdrop scrim to close the sidebar on tap. Updated `app/(editor)/editor/page.tsx` with a minimal centered layout (heading, description, and New Project button with Plus icon). `npm run build` and `npm run lint` pass with zero errors.
- `05-prisma`: Implemented Prisma data models, cached client singleton, and initial database migration. Created `prisma/models/project.prisma` containing `ProjectStatus` enum (`DRAFT`, `ARCHIVED`), `Project` model (with `ownerId` mapped to Clerk user, `name`, optional `description`, `status`, optional `canvasJsonPath`, timestamps, and separate indexes on `ownerId` and `createdAt`), and `ProjectCollaborator` model (with relation to `Project` featuring `onDelete: Cascade`, `email`, `createdAt`, `@@unique([projectId, email])`, `@@index([email])`, and `@@index([projectId, createdAt])`). Created `lib/prisma.ts` as a cached singleton branching by `DATABASE_URL` (uses `accelerateUrl` when starting with `prisma+postgres://`, otherwise direct `@prisma/adapter-pg`), cached on `globalThis` in development. Generated Prisma client to `app/generated/prisma`. Executed migration `20261002114713_init` against PostgreSQL database. Verified live query connectivity and passed `npm run build` and `npm run lint`.
- `06-project-apis`: Created backend REST API endpoints for projects under `app/api/projects`. Implemented `GET /api/projects` (lists current user's projects with collaborators ordered by `createdAt: desc`), `POST /api/projects` (creates project using authenticated Clerk `userId` as `ownerId`, defaults missing name to `Untitled Project`, and generates CUID ID via schema), `PATCH /api/projects/[projectId]` (renames project, requires valid non-empty name, enforces 401 for unauthenticated and 403 for non-owners), and `DELETE /api/projects/[projectId]` (deletes project with cascade deletion of collaborators, enforces 401 for unauthenticated and 403 for non-owners). Verified `npm run build` and `npm run lint` pass with zero errors.
- `07-wire-editor-home`: Wired the editor home sidebar and dialogs to the real backend project API. Created `lib/projects.ts` data helper (`getUserProjects`) caching owned and shared project retrieval server-side. Made `app/(editor)/editor/page.tsx` a Server Component with zero client-side fetching for initial load. Passed `ownedProjects` and `sharedProjects` from `app/(editor)/layout.tsx` into `EditorShell` and `ProjectSidebar`. Created `hooks/use-project-actions.tsx` (`useProjectActions` and `ProjectActionsProvider`), managing create, rename, and delete dialog state and API mutations. In create flow: generates unique suffix, slugifies name into aligned Liveblocks room ID preview, calls `POST /api/projects`, navigates to the workspace, and refreshes the shared project list. In rename flow: pre-fills project name, calls `PATCH /api/projects/[id]`, and triggers `router.refresh()`. In delete flow: displays project name, calls `DELETE /api/projects/[id]`, redirects to `/editor` and refreshes the shared project list if deleting the active workspace, or triggers `router.refresh()` otherwise. Updated `components/editor/project-sidebar.tsx` and `components/editor/project-dialogs.tsx`. Verified `npm run build` and `npm run lint` pass with zero errors.
- `08-editor-workspace-shell`: Built the `/editor/[roomId]` server component workspace shell with access verification. Created `lib/project-access.ts` with `getCurrentUserIdentity` and `getProjectAccess`. Redirects unauthenticated users to `/sign-in`. Created `components/editor/access-denied.tsx` with centered layout, lock icon, and return link for unauthorized or non-existent projects. Created `hooks/use-workspace.tsx` managing workspace state, active project synchronization, and AI sidebar toggle. Created `components/editor/workspace-shell.tsx` with full-viewport layout, dark dot-grid canvas placeholder filling remaining space, and collapsible right sidebar placeholder for future AI chat. Updated `components/editor/editor-navbar.tsx` showing project name and actions. Verified `npm run build` registers `ƒ /editor/[roomId]` with zero errors.
- `09-share-dialog`: Implemented project sharing and collaborator management. Wired the `Share` button in `EditorNavbar` to open `ShareDialog`. Created `components/editor/share-dialog.tsx` featuring project link copy with temporary `Copied!` feedback, collaborator invitation by email (owners only), collaborator removal (owners only), and read-only collaborator list for non-owners. Built REST endpoints `GET /api/projects/[projectId]/collaborators` (lists collaborators enriched with Clerk display names and avatar images via Clerk Backend API), `POST /api/projects/[projectId]/collaborators` (invites collaborator, validates email and prevents duplicate/owner self-invite, enriches with Clerk), and `DELETE /api/projects/[projectId]/collaborators` / `[collaboratorId]` (removes collaborator with strict server-side owner enforcement). Verified `npm run build` passes with zero errors.
- `10-liveblocks-setup`: Implemented realtime collaboration infrastructure using Liveblocks. Configured `liveblocks.config.ts` defining `Presence` (`cursor`, `isThinking`) and `UserMeta` (`id`, `name`, `avatar`, `color`, and aliases). Installed `@liveblocks/node`. Created `lib/liveblocks.ts` providing cached `Liveblocks` node client singleton and deterministic cursor color helper (`getUserColor`) mapping user IDs across a fixed palette of 10 accessible, high-contrast dark-canvas colors. Implemented `POST /api/liveblocks-auth` route verifying Clerk authentication and project access via `getProjectAccess`, ensuring room creation via `liveblocks.getOrCreateRoom`, and issuing session tokens with enriched user details and full room permissions.
- `11-base-canvas`: Integrated `@xyflow/react` and `@liveblocks/react-flow`. Maintained server-side workspace page (`app/(editor)/editor/[roomId]/page.tsx`). Created shared canvas types in `types/canvas.ts` defining `NodeShape`, `NODE_SHAPES`, `NODE_COLORS`, `CanvasNodeData`, `CanvasNode`, and `CanvasEdge`. Created `components/canvas/canvas-wrapper.tsx` configuring `LiveblocksProvider` (connected to `/api/liveblocks-auth`), `RoomProvider` (room ID, initial presence `cursor: null`), `ErrorBoundary` (with dark-themed `CanvasError` fallback), and `ClientSideSuspense` (with `CanvasLoading`). Built `components/canvas/canvas.tsx` using `useLiveblocksFlow` with `suspense: true`, loose connection mode, dark color mode, dot background, minimap, and multi-user cursors (`<Cursors />`). Replaced canvas placeholder in `WorkspaceShell`.
- `12-shape-panel`: Added bottom floating shape panel and drag-and-drop node creation. Created `components/canvas/shape-panel.tsx` rendering floating pill-shaped toolbar at bottom-center of canvas with draggable icon buttons for all 6 shapes (`rectangle`, `diamond`, `circle`, `pill`, `cylinder`, `hexagon`) using Lucide stroke icons and sensible default sizes. Wired `onDragOver` and `onDrop` handlers to canvas container in `components/canvas/canvas.tsx`, converting screen coordinates to canvas space with `useReactFlow().screenToFlowPosition` and generating unique node IDs (`${shape}-${Date.now()}-${counter}`). Created basic custom node renderer `components/canvas/canvas-node.tsx` for `canvasNode` type with centered label and 4 connection handles.
- `current-issues-canvas-sidebar-dnd-fixes`: Addressed all visual, sidebar, and drag-and-drop issues from `context/current-issues.md` and screenshot:
  1. **Infinite flush canvas**: Replaced nested 3-column card layout with edge-to-edge full viewport canvas (`absolute inset-0 h-full w-full overflow-hidden bg-bg-base`) with dotted background pattern extending seamlessly underneath all chrome. Removed borders, box-shadows, and card styling. Added `proOptions={{ hideAttribution: true }}` to strip React Flow watermark.
  2. **Overlaid floating sidebars**: Converted both `ProjectSidebar` (left) and AI Assistant sidebar (right) into floating overlays (`position: fixed`, `top: 12`, `z-30`, `bg-bg-surface/95 backdrop-blur-md shadow-2xl`) that float directly over the canvas without pushing or resizing canvas space. Fixed left sidebar toggling to completely slide off-screen with `-translate-x-full opacity-0 pointer-events-none invisible` when closed with zero remnants peeking out.
  3. **Drag-and-drop pipeline & shape toolbar**: Added `draggable` and `pointer-events-none` on shape icon elements in `ShapePanel` to ensure reliable HTML5 drag initiation. Added `onDragOver` and `onDrop` to both wrapper and `<ReactFlow>` component. Centered new nodes around cursor with `screenToFlowPosition` and dispatched `NodeAddChange<CanvasNode>` via `onNodesChange` to synchronize with Liveblocks and React Flow. Added click/Enter-to-add support in the bottom toolbar.
  4. **Build and runtime stability**: Added `experimental: { cpus: 1, workerThreads: false }` in `next.config.ts` to prevent Windows multi-threaded worker crash (`0xc0000409`), and added ESLint avatar directive in `ShareDialog`. Typecheck (`tsc --noEmit`), `npm run lint`, and `npm run build` all pass with 0 errors and 0 warnings.

## In Progress

- None.

## Next Up

- Ready for the next feature specification (e.g. Node selection, custom rendering, or shape-specific visuals).

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
- Dynamic project workspace routing (`app/(editor)/editor/[roomId]/page.tsx`) uses Next.js 16 async `params` resolution. Access control is enforced server-side via `getProjectAccess` in `lib/project-access.ts`, rendering `AccessDenied` if the project does not exist or if the user is neither owner nor collaborator, and redirecting unauthenticated users to `/sign-in`.
- Active project highlighting in `ProjectSidebar` uses `usePathname` matching `/editor/${project.id}` to visually indicate current workspace selection without disrupting sliding overlay mechanics.
- SSL connection normalization: `DATABASE_URL` uses explicit `?sslmode=verify-full`, and `lib/prisma.ts` enforces `sslmode=verify-full` defensively to prevent `pg-connection-string` deprecation warnings on PostgreSQL connections.
- Workspace layout state (`hooks/use-workspace.tsx`) manages active project synchronization, AI sidebar collapse/expand toggle, and share dialog open/close state.
- Collaborators storage and Clerk enrichment: Collaborators are persisted in PostgreSQL by email (`ProjectCollaborator`). Display names and avatar images are resolved at request time using Clerk Backend API (`clerkClient().users.getUserList`), falling back to email when no Clerk user exists. No local user table is created.
- Project sharing access model: Only the project owner can invite or remove collaborators (enforced server-side in API routes). Collaborators are presented with a read-only member list and cannot manage access.
- Liveblocks cached Node client singleton in `lib/liveblocks.ts` is cached on `globalThis` in development. Uses a fallback initialization key for build-time safety when `LIVEBLOCKS_SECRET_KEY` is not supplied.
- Liveblocks Auth Endpoint (`POST /api/liveblocks-auth`) enforces Clerk authentication, verifies project access via `getProjectAccess`, ensures room creation via `liveblocks.getOrCreateRoom`, and grants full read/write access via `session.allow(roomId, session.FULL_ACCESS)` with enriched user metadata and deterministic cursor color.
- Next.js 16 Webpack configuration: Configured `"build": "next build --webpack"` and `config.cache = false` in `next.config.ts` to prevent Node 22 WasmHash cache corruption and Turbopack PostCSS worker crashes on Windows environments.
- Collaborative React Flow Canvas: Managed via `useLiveblocksFlow` from `@liveblocks/react-flow` inside `ReactFlowProvider` and `RoomProvider`. Real-time multi-user cursor tracking is rendered via `<Cursors />`. Drag-and-drop shape creation converts screen coordinates using `useReactFlow().screenToFlowPosition` and adds new `canvasNode` instances directly into synced Liveblocks storage.

## Session Notes

- Project creation validates optional client-supplied room IDs against slug constraints and returns `409` for unique-ID conflicts; omitted IDs continue to use Prisma's CUID default.
- layout.tsx was fixed to import from `./globals.css` (correct App Router path) instead of `@/styles/globals.css`.
- `app/globals.css` contains `@import "tailwindcss"`, `@import "tw-animate-css"`, `@import "shadcn/tailwind.css"`, plus project dark theme tokens, plus shadcn CSS variable mappings all wired to the dark token values.
- Tailwind utility names for project tokens follow the `@theme inline` pattern in `globals.css`: `bg-bg-surface`, `bg-bg-elevated`, `border-border-default`, `text-text-primary`, `text-text-secondary`, `text-text-muted`, etc.
- `@clerk/nextjs` is at `^7.9.7` (current SDK, Core 3). Uses `isAuthenticated` (not `!!userId`), `auth.protect()` (not `auth().protect()`), `Show` (not `SignedIn`/`SignedOut`), themes from `@clerk/ui/themes` (not `@clerk/themes`).
- Prisma migration `20261002114713_init` created and applied successfully to PostgreSQL database. Verified client connectivity and query execution.
- REST API routes created for projects (`GET`, `POST`, `PATCH`, `DELETE`) with strict auth and ownership gating.
- Editor home sidebar and dialogs wired end-to-end to real PostgreSQL project data through server-rendered layout and `useProjectActions` hook.
- Implemented `/editor/[roomId]` workspace shell (`app/(editor)/editor/[roomId]/page.tsx`) with server-side identity and access verification (`lib/project-access.ts`), rendering `AccessDenied` for unauthorized/missing projects.
- Implemented `ShareDialog` and collaborator REST APIs (`/api/projects/[projectId]/collaborators` and `[collaboratorId]`) with Clerk Backend API enrichment, clipboard link copying with `Copied!` feedback, email invite validation, and role-based permissions.
- Implemented Liveblocks setup: `liveblocks.config.ts`, `lib/liveblocks.ts`, and `POST /api/liveblocks-auth`.
- Implemented base collaborative canvas: `types/canvas.ts`, `components/canvas/canvas-wrapper.tsx`, `components/canvas/canvas.tsx`, `components/canvas/canvas-loading.tsx`, `components/canvas/canvas-error.tsx`.
- Implemented shape panel and drag-and-drop node creation (`context/feature-specs/12-shape-panel.md`):
  1. Floating pill-shaped toolbar at bottom-center of canvas (`components/canvas/shape-panel.tsx`) with draggable icon buttons for all 6 shapes (`rectangle`, `diamond`, `circle`, `pill`, `cylinder`, `hexagon`).
  2. Drag payload serialization in `handleDragStart` including shape and default dimensions (`rectangle`: 160x80 wider than tall, `circle`: 90x90 square, `diamond`: 130x130 slightly larger for labels, `pill`: 150x60, `cylinder`: 120x90, `hexagon`: 130x90) with multi-format dataTransfer support (`application/reactflow`, `application/json`, `text/plain`) and `effectAllowed = "all"`.
  3. Dragover and drop handling in canvas (`components/canvas/canvas.tsx`): converts screen coordinates to canvas space using `useReactFlow().screenToFlowPosition`, generates unique node ID (`${shape}-${Date.now()}-${counter}`), and creates new node with empty label, default node color (`#1F1F1F`), and dragged shape.
  4. Real-time Liveblocks CRDT synchronization: typed `Storage` in `liveblocks.config.ts`, configured `initialStorage` in `components/canvas/canvas-wrapper.tsx`, configured `nodes.sync: { "*": { label: "atomic", color: "atomic", shape: "atomic" } }` in `useLiveblocksFlow`, and used `addNodeToStorage` mutation with `position: "atomic"` and `data: "atomic"` alongside React Flow change dispatching.
  5. Basic custom node renderer (`components/canvas/canvas-node.tsx`) rendering every shape as a simple bordered rectangle with centered label and 4 connection handles per Feature 12 unit specifications.
- `13-node-shape`: Implemented proper shape rendering and ghost drag preview (`context/feature-specs/13-node-shape.md`):
  1. Replaced placeholder node renderer in `components/canvas/canvas-node.tsx` with proper shape variants for all 6 shapes (`rectangle`, `diamond`, `circle`, `pill`, `cylinder`, `hexagon`).
  2. CSS styling for `rectangle` (`rounded-xl`), `pill` (`rounded-full`), and `circle` (`rounded-full aspect-square`).
  3. SVG shapes for `diamond` (polygon), `hexagon` (symmetric horizontal polygon), and `cylinder` (isometric body path and 3D top cap ellipse) using dynamic `width` and `height` dimensions with `vectorEffect="non-scaling-stroke"`, scaling with node size.
  4. Subtle borders at rest (`--border-default`) and highlighted/glowing borders when selected (`--accent-primary` with glow drop-shadow and thicker stroke/ring). Connection handles at Top, Right, Bottom, and Left appear on node hover. Text labels centered inside node with text color mapped from `NODE_COLORS`.
  5. Shape drag preview (`components/canvas/shape-drag-preview.tsx`): when dragging from the shape panel, displays a ghost preview attached to the cursor matching the shape variant and default size with semi-transparent fill and dashed accent stroke/border. Automatically cleaned up upon drop or drag cancellation.
  6. Connected node rendering directly to existing collaborative Liveblocks CRDT and React Flow state.
- `14-node-editing`: Implemented node resizing and inline label editing (`context/feature-specs/14-node-editing.md`):
  1. Integrated `@xyflow/react` `NodeResizer` in `components/canvas/canvas-node.tsx`, displayed when node is selected, with dark canvas styled handles (`!w-2 !h-2 !bg-bg-elevated !border !border-accent-primary !rounded-xs`) and subtle lines (`!border-accent-primary/60`).
  2. Minimum node dimensions enforced (`minWidth={shape === "circle" ? 60 : 70}`, `minHeight={shape === "circle" ? 60 : 40}`) and aspect ratio preserved for circles (`keepAspectRatio={shape === "circle"}`).
  3. Node resizing updates dimensions through the existing `@liveblocks/react-flow` and React Flow sync flow (`case "dimensions"` with `setAttributes: true`).
  4. Implemented inline label editing: double-clicking a node or label area opens a centered `<textarea>` directly over the label with matching font styling, padding, and zero layout shift.
  5. Shows centered placeholder text (`"Empty node"`) when label is empty.
  6. Real-time typing synchronization via local draft state, React Flow `updateNodeData`, and Liveblocks `updateNodeLabel` CRDT storage mutation.
  7. Closes editing on `blur`, `Escape`, or `Enter` (without Shift).
  8. Configured `nodrag nopan select-text` classes and stopped event propagation on pointer/mouse/key events to prevent text editing interactions from dragging or panning the canvas or triggering canvas hotkeys.
- `15-nodes-color-toolbar`: Implemented floating color toolbar for selected nodes (`context/feature-specs/15-nodes-color-toolbar.md`):
  1. Integrated `@xyflow/react` `NodeToolbar` positioned above selected nodes with `offset={12}` and dark glass styling (`bg-bg-surface/95 border border-border-default rounded-full shadow-2xl backdrop-blur-md`).
  2. Rendered interactive color swatches for all 8 predefined background/text color pairs from `NODE_COLORS` in `types/canvas.ts`.
  3. Active swatches display clear selection state (`scale-110 border-white ring-2 ring-white/80 ring-offset-1` with center indicator dot in paired text color).
  4. Hovering a swatch displays a tight, controlled glow based on its paired text color (`boxShadow: 0 0 8px 1px ${colorPair.text}90`).
  5. Configured `nodrag nopan` and stopped event propagation on swatch interactions to prevent node dragging or canvas panning.
  6. Selecting a swatch immediately updates both background and paired text color in the local React Flow state (`updateNodeData`) and synchronizes across collaborators via Liveblocks CRDT storage mutation (`updateNodeColor`).
  7. Added `textColor?: string` to `CanvasNodeData` in `types/canvas.ts` and configured atomic synchronization (`textColor: "atomic"`) in `components/canvas/canvas.tsx`.
- Verified `npm run build` and `npm run lint` pass with zero errors.
