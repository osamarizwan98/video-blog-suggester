# Project Master Context & Architectural Blueprint: Production RAG Search Engine

## 1. Project Overview & Goal
We are building a production-ready **RAG (Retrieval-Augmented Generation) Content Search Engine**.
- **Core Purpose:** Ingest all YouTube videos (transcripts) and blog articles (Markdown/HTML) into a vector database, enabling users to search any topic and get exact deep-links to the **specific timestamp in the YouTube video** or the **exact heading section in the blog article**.
- **UI Philosophy:** Keep the frontend intentionally minimal (a clean, single-page search interface with authentication state, search input, and deep-linked results). All architectural complexity lives in the backend ingestion pipeline, chunking accuracy, vector retrieval, and security.

---

## 2. Approved Tech Stack & Infrastructure
- **Framework:** Next.js (App Router), React (with React Compiler enabled), TypeScript (strict mode), Tailwind CSS.
- **Database & Vector Store:** Neon Serverless PostgreSQL with `pgvector` extension enabled.
  - *Environment Isolation:* Separate `production` and `dev` database branches on Neon.
- **ORM & Migrations:** Drizzle ORM + `drizzle-kit` (SQL migrations stored in `src/db/migrations`).
- **Environment Validation:** `@t3-oss/env-nextjs` + `zod` (strict separation of client and server env variables).
- **Authentication:** Better Auth using **GitHub OAuth only** (no email/password, no custom auth pages—minimal login/logout + user name & avatar display).
- **Durable Background Jobs:** Vercel Workflows (`workflow`) for long-running, retryable content ingestion pipelines.
- **Hosting & CI/CD:** Vercel (deployed from GitHub with PR-based workflow).
- **Code Quality & Security:** GitHub branch protection on `main` + CodeRabbit automated PR reviews.

---

## 3. Non-Negotiable Architecture Decisions & Coding Standards

### A. TypeScript & Type Safety
- **Zero `any` or non-null assertions (`!`):** Never use `process.env.VAR!` or `as any`.
- **Literal Types over Enums:** Use `as const` objects/arrays instead of TypeScript `enum` to avoid runtime overhead.
- **Strict Env Validation:**
  - All environment variables must be validated in `src/data/client-env.ts` and `src/data/server-env.ts` using T3 Env.
  - Transform empty strings (`""`) to `undefined` so missing secrets fail immediately at startup/build.

### B. Database & Drizzle ORM Rules
- **Naming Convention:** Use `snake_case` for all database table and column names (`casing: "snake_case"` in Drizzle).
- **Modular Structure:**
  - `src/db/db.ts`: Neon + Drizzle database client instance.
  - `src/db/schema.ts`: Central re-export of all table schemas from `src/db/schemas/*`.
  - `src/db/relations.ts`: Explicit Drizzle relations using `defineRelations`.
- **Vector Storage:** Store text chunks alongside their vector embeddings (`vector` column via `pgvector`) and rich navigation metadata.

### C. RAG Ingestion & Chunking Strategy (Critical)
- **Blog Articles:**
  - Preserve **Markdown heading hierarchy** (`H1 > H2 > H3`) as metadata on every chunk.
  - Search results must construct anchor deep-links pointing directly to the matching section heading.
- **YouTube Videos:**
  - Fetch video metadata and timestamped transcripts.
  - Chunk transcripts semantically while preserving the **exact `start_time` (in seconds)** for each chunk so clicking a result opens the YouTube video at `&t=<seconds>s`.
- **Idempotency & Deduplication:** Track ingested video IDs and article slugs/hashes so re-running workflows updates changed content without duplicating chunks.

### D. Durable Workflows (Vercel Workflows)
- Never run bulk ingestion inside standard serverless API routes (which time out).
- Use **Vercel Workflows** so each video/article is processed as an isolated, durable step (`"use step"`).
- Built-in resilience: Handle external API rate limits (e.g., YouTube/AI provider limits) gracefully using durable sleep/retry mechanisms without losing progress or wasting compute.

### E. Security & Rate Limiting
- **Rate Limiting:** Protect all search endpoints/server actions with rate limiting (per authenticated user / IP) to prevent abuse and AI embedding cost spikes.
- **Graceful Error Handling:** Return structured error states (e.g., rate limit exceeded, search failure) and render clean UI feedback instead of unhandled exceptions.
- **Git Workflow:** Never commit directly to `main`. Always work on feature branches and validate against TypeScript (`tsc --noEmit`) and linting before opening a PR.

---

## 4. Target Directory Structure
```text
src/
├── app/
│   ├── api/auth/[...all]/route.ts   # Better Auth catch-all route
│   ├── layout.tsx
│   └── page.tsx                     # Minimal search UI + auth header
├── data/
│   ├── client-env.ts                # T3 Env client schema
│   └── server-env.ts                # T3 Env server schema
├── db/
│   ├── db.ts                        # Drizzle + Neon instance
│   ├── schema.ts                    # Schema barrel export
│   ├── relations.ts                 # Drizzle table relations
│   ├── schemas/                     # Modular tables (auth, sources, chunks)
│   └── migrations/                  # Drizzle SQL migrations
├── lib/
│   ├── auth.ts                      # Better Auth server config (GitHub OAuth)
│   └── auth-client.ts               # Better Auth client hooks
├── workflows/
│   ├── ingest-youtube.ts            # Durable YouTube ingestion workflow
│   └── ingest-blogs.ts              # Durable Blog ingestion workflow
└── services/
    ├── chunking.ts                  # Heading-aware & timestamp-aware chunkers
    ├── embeddings.ts                # Embedding generation wrapper
    └── search.ts                    # Vector similarity search + deep-link builder