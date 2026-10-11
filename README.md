# Ghost AI — Agentic Architecture Planning & Specification Platform

An agentic planning and diagramming application built for software teams. Submit a natural-language prompt (e.g., *"Design a scalable e-commerce backend"*), and an AI agent autonomously plans and places nodes and edges onto a shared React Flow canvas in real-time. Teammates can watch the AI construct the architecture live, jump in to collaboratively refine it, and generate a comprehensive, downloadable Markdown technical specification with a single click.

---

## 📋 <a name="table">Table of Contents</a>

1. ✨ [Introduction](#introduction)
2. ⚙️ [Tech Stack](#tech-stack)
3. 🔋 [Features](#features)
4. 🤸 [Quick Start](#quick-start)
5. 📜 [Available Scripts](#available-scripts)
6. 📁 [Project Structure](#project-structure)

---

## <a name="introduction">✨ Introduction</a>

**Ghost AI** bridges the gap between high-level system design conversations and technical implementation:

- **AI Architecture Agent**: Translates architectural requirements into interactive node-and-edge system graphs on a live canvas.
- **Multiplayer Collaboration**: Enables real-time co-editing with live cursors, presence avatars, and synced canvas operations powered by Liveblocks.
- **Automated Spec Generation**: Converts graph structures and design context into full, multi-section Markdown technical specifications that teams can view, preview, and download directly.

---

## <a name="tech-stack">⚙️ Tech Stack</a>

- **[Next.js 16](https://nextjs.org/)** — Full-stack React framework with App Router, server actions, and API routes.
- **[React 19](https://react.dev/)** — Declarative UI library powering interactive canvas and modal components.
- **[TypeScript](https://www.typescriptlang.org/)** — Type safety across canvas models, AI schemas, and database queries.
- **[React Flow (@xyflow/react)](https://reactflow.dev/)** — Customizable node-based diagramming canvas with drag-and-drop, custom nodes, and edge management.
- **[Liveblocks](https://liveblocks.io/)** — Real-time multiplayer synchronization for canvas state, live cursors, and presence awareness.
- **[Clerk](https://clerk.com/)** — User authentication, protected routes, and session management.
- **[Trigger.dev](https://trigger.dev/)** — Durable background task execution for long-running AI design and spec generation workloads.
- **[Google Gemini](https://ai.google.dev/) & [OpenRouter](https://openrouter.ai/)** — LLM providers for reasoning, canvas graph generation, and technical specification writing.
- **[Prisma ORM](https://www.prisma.io/)** — Type-safe PostgreSQL database client and schema management.
- **[PostgreSQL](https://www.postgresql.org/)** — Relational database storing projects, collaborator access, task runs, and spec metadata.
- **[Vercel Blob](https://vercel.com/docs/storage/vercel-blob)** — Secure cloud storage for generated Markdown specifications and canvas snapshots.
- **[Tailwind CSS v4](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)** — Modern design system and accessible component primitives.

---

## <a name="features">🔋 Features</a>

👉 **AI Architecture Agent**: Submit a plain-English prompt; Gemini / OpenRouter designs and places nodes and edges directly onto the live canvas via Trigger.dev background tasks and the Liveblocks Node SDK.

👉 **Multiplayer Canvas**: Synchronized node/edge updates, live cursor coordinates, and collaborator avatars in real-time.

👉 **Interactive Canvas Controls**: Custom node shapes, inline double-click editing, color selection toolbars, edge routing, and minimap navigation.

👉 **AI Spec Generation**: Convert the visual graph into a comprehensive, multi-section Markdown technical specification in the background.

👉 **In-App Spec Preview & Download**: Preview generated Markdown specs with formatted typography directly inside an accessible modal, and download `.md` files with a single click.

👉 **Persistent Storage**: Project and task run metadata persisted in PostgreSQL; specs and canvas snapshots stored in Vercel Blob with resilient local fallbacks.

👉 **Clerk Authentication**: Global route protection via Next.js proxy middleware, secure per-user project ownership, and role-based sharing.

👉 **Project Management**: Create, rename, delete, and switch between personal and shared projects from an overlay sidebar.

👉 **Canvas Auto-Save**: Debounced background persistence ensures canvas work is never lost.

👉 **One-Click Sharing**: Copy project links with instant user-feedback confirmation.

---

## <a name="quick-start">🤸 Quick Start</a>

Follow these steps to run Ghost AI locally on your machine.

### Prerequisites

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/en) (v20+ recommended)
- [npm](https://www.npmjs.com/)
- PostgreSQL database instance (local or hosted, e.g., Supabase / Neon)

### 1. Clone the Repository

```bash
git clone https://github.com/<your-username>/<your-repo-name>.git
cd <your-repo-name>
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory (you can copy from `.env.example`):

```bash
cp .env.example .env
```

Fill in the required credentials:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Liveblocks Real-Time Collaboration
LIVEBLOCKS_SECRET_KEY=sk_...
NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=pk_...

# Trigger.dev Background Tasks
TRIGGER_SECRET_KEY=tr_dev_...
NEXT_PUBLIC_TRIGGER_PUBLIC_API_KEY=tr_pub_...

# Database (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/ghost_ai?schema=public"

# AI Model Provider (Google Gemini and/or OpenRouter)
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSy...
OPENROUTER_API_KEY=sk-or-v1-...

# Optional model overrides:
# GEMINI_MODEL=gemini-2.0-flash
# GEMINI_SPEC_MODEL=gemini-2.0-flash

# Storage (Vercel Blob)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...

# Application Base URL
APP_URL=http://localhost:3000
```

> **Where to get keys:**
> - [Clerk](https://clerk.com)
> - [Liveblocks](https://liveblocks.io)
> - [Trigger.dev](https://trigger.dev)
> - [Google AI Studio](https://aistudio.google.com) / [OpenRouter](https://openrouter.ai)
> - [Vercel Blob](https://vercel.com/dashboard/stores)

### 4. Initialize Database Schema

Push the Prisma models to your PostgreSQL database:

```bash
npx prisma generate
npx prisma db push
```

### 5. Start the Application

In your first terminal, start the Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Start Trigger.dev Background Worker

In a second terminal, run the Trigger.dev development worker so AI design and spec generation tasks execute:

```bash
npx trigger.dev@latest dev
```

---

## <a name="available-scripts">📜 Available Scripts</a>

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start the Next.js development server at `localhost:3000` |
| `npm run build` | Build the application for production |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint checks across the codebase |
| `npx prisma generate` | Regenerate the Prisma Client from schema definitions |
| `npx prisma db push` | Synchronize Prisma schema directly with the database |
| `npx prisma studio` | Open Prisma Studio database management GUI |
| `npx trigger.dev dev` | Start the local Trigger.dev background worker process |

---

## <a name="project-structure">📁 Project Structure</a>

```
.
├── app/
│   ├── api/                   # API endpoints (auth, projects, AI design, specs)
│   ├── editor/                # Editor home and canvas room route pages
│   ├── generated/prisma/      # Generated Prisma client and models
│   ├── sign-in/               # Clerk sign-in page
├── components/
│   ├── canvas/                # React Flow canvas, custom nodes, edges, cursors
│   ├── editor/                # Shell layout, navbar, project sidebar, AI sidebar, modals
│   └── ui/                    # Reusable shadcn/ui components
├── hooks/                     # Custom hooks (workspace, project actions, autosave)
├── lib/                       # Core utilities (Prisma client, Liveblocks, spec storage)
├── prisma/                    # Prisma configuration and multi-file schema models
│   └── models/                # Project, collaborator, spec, and task run models
├── trigger/                   # Trigger.dev background tasks
│   ├── design-agent.ts        # AI graph design generation task
│   └── generate-spec.ts       # AI technical specification generation task
└── types/                     # Shared TypeScript interfaces and schemas
```

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
