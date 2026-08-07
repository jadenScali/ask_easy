# AskEasy

A real-time classroom Q&A platform built for live lectures at the University of Toronto. Students post questions anonymously or publicly, upvote what matters most, and get answers from instructors — all updating instantly during class. Professors see exactly what the room is confused about, right now.

## Why AskEasy?

In large lecture halls, most students never raise their hand. Questions go unasked, concepts go unclarified, and instructors are left guessing what landed and what didn't. Tools like Piazza are built for asynchronous discussion — not for the 50 minutes you're actually in the room.

AskEasy is built for that moment. It gives every lecture a live Q&A room where the most important questions surface automatically through upvoting, anonymous posting removes the social barrier to asking, and professors can present slides side-by-side with the chat without switching windows.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Production                           │
│                                                             │
│   Browser ──HTTPS──▶ Apache + mod_shib ──localhost──▶ App   │
│                            │                                │
│                            ▼                                │
│                      U of T IdP (SAML)                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                       │
│                                                             │
│   ┌──────────────────────────────────────────────────────┐  │
│   │              Node.js Custom Server (server.ts)       │  │
│   │                                                      │  │
│   │   ┌─────────────────┐    ┌────────────────────────┐  │  │
│   │   │  Next.js App    │    │   Socket.IO Server     │  │  │
│   │   │  (App Router)   │    │   (real-time events)   │  │  │
│   │   │  - Pages        │    │   - questions          │  │  │
│   │   │  - API routes   │    │   - answers/upvotes    │  │  │
│   │   │  - Auth         │    │   - slide sync         │  │  │
│   │   └────────┬────────┘    └──────────┬─────────────┘  │  │
│   └────────────┼──────────────────────── ┼───────────────┘  │
└────────────────┼─────────────────────────┼──────────────────┘
                 │                         │
        ┌────────▼────────┐     ┌──────────▼──────────┐
        │   PostgreSQL 16  │     │      Redis 7         │
        │   (via Prisma)   │     │  - Socket.IO pub/sub │
        │                  │     │  - Rate limiting     │
        │  Users, Courses  │     │  - Answer mode TTL   │
        │  Sessions, Q&A   │     │  - Session data      │
        │  Upvotes, Slides │     └─────────────────────┘
        └──────────────────┘
```

### How the pieces connect

| Component                           | Role                                                                                                                                                                       |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Custom server (`server.ts`)**     | Single Node.js process that boots both Next.js and Socket.IO on the same port. Strips Shibboleth headers from non-localhost connections to prevent spoofing.               |
| **Next.js App Router**              | Serves all pages and REST API routes (`/api/*`). Server Components fetch from PostgreSQL via Prisma; API routes handle auth, course/session management, and slide uploads. |
| **Socket.IO**                       | Handles all real-time events (questions, answers, upvotes, slide page changes). Uses a Redis adapter so multiple app instances share the same pub/sub channel.             |
| **PostgreSQL + Prisma**             | Single source of truth for all persistent data. Prisma handles the schema, migrations, and typed queries.                                                                  |
| **Redis**                           | Three jobs: Socket.IO pub/sub adapter, rate-limit counters (per-user sliding windows), and ephemeral answer-mode state (24-hour TTL).                                      |
| **Apache + mod_shib** _(prod only)_ | Terminates TLS, enforces Shibboleth SSO, and injects `utorid`/`mail`/`cn` headers before proxying to the app.                                                              |

---

## Tech Stack

| Layer            | Technology                                      |
| ---------------- | ----------------------------------------------- |
| Frontend         | Next.js 16, React 19, Tailwind CSS 4, Radix UI  |
| Backend          | Next.js API routes + custom Node.js HTTP server |
| Real-time        | Socket.IO with Redis adapter                    |
| Database         | PostgreSQL 16 (via Prisma ORM)                  |
| Cache / Pub-sub  | Redis 7                                         |
| Auth             | iron-session + Shibboleth header-based SSO      |
| Testing          | Vitest, Testing Library                         |
| Containerization | Docker & Docker Compose                         |

---

## Environment Variables

Both files below are gitignored and live in the project root. **Production does not use them** — the server reads its own file at `/home/easy/secrets/prod.env`, which is created by hand and never touched by a deploy.

### `.env` — base values

```bash
# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<password>
POSTGRES_DB=ask_easy

# Redis
REDIS_PASSWORD=<password>

# Session encryption key — generate with: openssl rand -hex 32
SESSION_SECRET=<64-char-hex>

# Cron job auth (for /api/cron/cleanup-sessions)
CRON_SECRET=<random-secret>

# Roles — comma-separated UTORids, case-insensitive
PROFESSOR_WHITELIST=utorid1,utorid2
ADMIN_WHITELIST=utorid1
```

`DATABASE_URL` and `REDIS_URL` are **not** listed here. Docker Compose builds them from the values above so the passwords have a single source of truth:

```yaml
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
```

### `.env.local` — local dev only

Loaded after `.env` and overrides it. Needed because `pnpm dev` runs the app outside Docker, so it must reach the containers on `localhost` rather than by service name.

```bash
DATABASE_URL=postgresql://postgres:<password>@localhost:5432/ask_easy
REDIS_URL=redis://:<password>@localhost:6379

# Fake SSO identity for local login
DEV_UTORID=yourutorid
DEV_NAME=Your Name
DEV_EMAIL=your.email@mail.utoronto.ca
DEV_ROLE=PROFESSOR   # or STUDENT
```

> **The `DEV_*` variables must never be set in production.** The auth route falls back to `DEV_UTORID` whenever the Shibboleth header is missing, so setting them on the server would allow unauthenticated logins.

| Variable                            | Required | Description                                                                 |
| ----------------------------------- | :------: | --------------------------------------------------------------------------- |
| `POSTGRES_USER` / `PASSWORD` / `DB` |   Yes    | Postgres credentials                                                        |
| `REDIS_PASSWORD`                    |   Yes    | Passed to the Redis container as `--requirepass`                            |
| `SESSION_SECRET`                    |   Yes    | Key for iron-session cookie encryption. Changing it logs everyone out.      |
| `PROFESSOR_WHITELIST`               |   Yes    | UTORids granted the PROFESSOR role on login. Everyone else is a STUDENT.    |
| `ADMIN_WHITELIST`                   |   Yes    | UTORids granted `/dashboard` access. Empty means nobody can administer.     |
| `CRON_SECRET`                       |   Yes    | Bearer token for the cleanup-sessions cron endpoint                         |
| `DATABASE_URL`                      |   Dev    | Only in `.env.local`; Compose derives it otherwise                          |
| `REDIS_URL`                         |   Dev    | Only in `.env.local`; Compose derives it otherwise                          |
| `DEV_UTORID`                        |   Dev    | Fake UTORid injected when Shibboleth is not present                         |
| `DEV_NAME`                          |   Dev    | Display name for the fake dev user                                          |
| `DEV_EMAIL`                         |   Dev    | Email for the fake dev user; defaults to `<utorid>@mail.utoronto.ca`        |
| `DEV_ROLE`                          |   Dev    | `PROFESSOR` or `STUDENT` — overrides whitelist lookup                       |
| `SOCKET_IO_USE_REDIS`               |    No    | Set to `"false"` to disable the Socket.IO Redis adapter. Enabled otherwise. |

Whitelists are read once at startup and cached, so restart the app after changing them.

---

## Running Locally (Development)

### Prerequisites

- [Node.js](https://nodejs.org/) v20+
- [pnpm](https://pnpm.io/) v8+
- [Docker](https://www.docker.com/) and Docker Compose

### 1. Clone and install dependencies

```bash
git clone https://github.com/jadenScali/ask_easy.git
cd ask_easy
pnpm install
```

### 2. Configure environment

Create `.env` and `.env.local` in the project root using the templates in [Environment Variables](#environment-variables) above. Both are gitignored, so a fresh clone has neither.

Put your own UTORid in `PROFESSOR_WHITELIST` and `ADMIN_WHITELIST`, and set `DEV_UTORID` to the same value so your fake dev login picks up those roles.

### 3. Start the database and Redis

```bash
docker-compose up -d postgres redis
```

### 4. Set up the database schema

```bash
pnpm db:generate            # build the Prisma client from schema.prisma
pnpm prisma migrate deploy  # apply all migrations
```

> **Do not use `pnpm db:push` or `pnpm db:setup`.** They change your database directly without creating a migration file, so the change never reaches anyone else or production. Schema changes always go through `pnpm db:migrate`, and the generated migration must be committed.

### 5. Start the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The app auto-reloads on changes.

### Switching branches

`git checkout` only updates tracked files. The Prisma client (`src/generated/`) and `node_modules/` are gitignored, so they keep whatever the previous branch left behind. Run this after switching to any branch that touches `prisma/schema.prisma` or `package.json`:

```bash
pnpm install        # lockfile may differ between branches
pnpm db:generate    # regenerate the Prisma client from this branch's schema
```

Then **restart `pnpm dev`** — the running server holds the old client in memory.

If the branch adds or removes migrations, also apply them:

```bash
pnpm prisma migrate deploy
pnpm prisma migrate status   # should report "Database schema is up to date"
```

If `migrate status` reports migrations applied to the database but missing locally (common when switching between branches with different migration history), reset the local database:

```bash
docker-compose down -v
docker-compose up -d postgres redis
pnpm prisma migrate deploy
```

#### Symptoms of skipping this

| Error                                                                                   | Cause                                         | Fix                                    |
| --------------------------------------------------------------------------------------- | --------------------------------------------- | -------------------------------------- |
| `The column X does not exist in the current database`                                   | Prisma client is from another branch's schema | `pnpm db:generate`, restart dev server |
| `Cannot find module ...`                                                                | Dependencies differ between branches          | `pnpm install`                         |
| `migration ... applied to the database but missing from the local migrations directory` | Migration history differs                     | Reset the local database as above      |

> **Always use `pnpm db:migrate` for schema changes, never `pnpm db:push`.** `db:push` updates your database without creating a migration file, so the change is invisible to everyone else and never reaches production. A missing migration will not surface until a database is rebuilt from scratch.

---

## Deployment

Merging to `main` deploys automatically. GitHub Actions builds and tests the code, pushes the image to Docker Hub, and a self-hosted runner on the VM pulls it, applies migrations, and restarts the app container.

Pull requests run the same build and tests but do not deploy. The workflow is [.github/workflows/cicd.yml](.github/workflows/cicd.yml).

---

## Available Scripts

| Script                       | Description                                        |
| ---------------------------- | -------------------------------------------------- |
| `pnpm dev`                   | Start development server with hot reload           |
| `pnpm build`                 | Build for production                               |
| `pnpm start`                 | Start production server                            |
| `pnpm lint`                  | Run ESLint                                         |
| `pnpm format`                | Format code with Prettier                          |
| `pnpm test`                  | Run unit tests (Vitest)                            |
| `pnpm test:integration`      | Run integration tests                              |
| `pnpm db:generate`           | Generate the Prisma client from `schema.prisma`    |
| `pnpm db:migrate`            | Create and apply a migration after a schema change |
| `pnpm prisma migrate deploy` | Apply existing migrations without creating one     |
| `pnpm db:studio`             | Open Prisma Studio GUI                             |
| `pnpm db:seed`               | Reset database (clears all tables — destructive)   |

`pnpm db:push` and `pnpm db:setup` exist but should not be used — see the warning in [step 4](#4-set-up-the-database-schema).

---

## Project Structure

```
src/
├── app/                  # Next.js App Router pages & API routes
│   ├── api/              # REST endpoints (auth, courses, sessions, questions, cron)
│   ├── classes/          # Course listing & management UI
│   ├── create-class/     # Course creation flow
│   ├── room/             # Live session room (chat + slide viewer)
│   └── admin/            # Admin dashboard (data overview, table wipe)
├── components/ui/        # Shared UI components (Radix-based)
├── lib/                  # Server utilities (auth, caching, validation, Prisma, Redis)
├── socket/               # Socket.IO server setup, event handlers, middleware
├── services/             # Business logic (sessions, questions, answers, slides)
└── utils/                # Shared types and helpers
prisma/
├── schema.prisma         # Database schema
├── migrations/           # Migration history
└── seed.ts               # Resets all tables (dev use only)
```

Professor and admin permissions are set with the `PROFESSOR_WHITELIST` and `ADMIN_WHITELIST` environment variables — see [docs/ADMIN-GUIDE.md](docs/ADMIN-GUIDE.md) for details.

---

## Team

Built by the AskEasy team at **GDG on Campus — UTM** (University of Toronto Mississauga).

- Marwan Yousef
- Jaden Scali
- Phineas Truong
- Jack Le
- Jad El Asmar
- Manjyot Birdi
