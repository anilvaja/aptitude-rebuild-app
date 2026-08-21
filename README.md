# Aptitude — Rebuilt Assessment Platform

A full rewrite of the original PHP aptitude-test app: Node.js/Express +
React, PostgreSQL via Prisma, everything containerized with Docker Compose.

---

## Quick start

Four steps: set up your environment file, start Docker, run the seeder once,
then log in.

### 1. Set up your `.env` file

From the project root (where `docker-compose.yml` lives):

```bash
cp .env.example .env
```

The defaults in `.env.example` work out of the box for local testing — you
don't have to edit anything to get started. Open `.env` if you want to
change the default admin login (see **Default credentials** below) or, once
you're ready to deploy somewhere real, to swap in strong generated secrets:

```bash
openssl rand -base64 48
```

Replace `POSTGRES_PASSWORD`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET`
with the output before putting this anywhere reachable over a network.

### 2. Start Docker

Make sure Docker Desktop is running, then from the project root:

```bash
docker compose up --build
```

First run takes a few minutes (builds both images, pulls Postgres, runs
migrations). You'll know it's ready when you see this in the logs:

```
Aptitude API listening on :4000
```

Leave this terminal running, or add `-d` to run in the background:

```bash
docker compose up --build -d
```

Check everything is healthy:

```bash
docker compose ps
```

You should see `postgres`, `backend`, and `frontend` all `Up`/`running`.

### 3. Run the seeder

This creates the **first admin account**, one time only. In a new terminal,
from the project root:

```bash
docker compose exec backend npm run seed
```

Expected output:

```
Created admin account for admin@aptitude.local. Log in and change the password.
```

If you run it again later, it won't duplicate the account:

```
Admin admin@aptitude.local already exists, skipping.
```

**Troubleshooting the seeder:**
| Problem | Fix |
|---|---|
| `no such service: backend` | Run the command from the project root, not a subfolder. |
| `SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env` | Your `.env` is missing those values, or isn't next to `docker-compose.yml`. |
| Connection/database errors | Postgres probably isn't ready yet — wait ~10 seconds after `docker compose up` and try again. |

### 4. Log in

Open **http://localhost:8080** in your browser.

---

## Default credentials

Set in `.env.example` under `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`, and
created by the seeder in step 3:

```
Email:    admin@aptitude.local
Password: Admin@12345
```

This is an **admin** account — from here you can add questions, build
tests, publish them, manage students, and grade written answers.

⚠️ **Change this password before using the app with real students.** There's
no in-app "change password" screen yet (see *Suggested next steps* below);
for now the quickest way is:

```bash
docker compose exec backend npx prisma studio
```

This opens Prisma Studio (a DB browser) on `http://localhost:5555` — open
the `User` table and update `passwordHash` with a new bcrypt hash, or drop
the row and re-run the seeder with a new `SEED_ADMIN_PASSWORD` in `.env`.

**Students** don't have default credentials — they create their own account
from the **"Create a student account"** link on the login page.

---

## Stopping / resetting

Stop everything (data preserved):
```bash
docker compose down
```

Stop and wipe the database completely (useful if you want a totally clean
slate — you'll need to re-run the seeder afterward):
```bash
docker compose down -v
```

---

## Why a rewrite instead of a patch

The original code (2013-era PHP) had structural problems that couldn't be
patched incrementally:

- **SQL injection everywhere** — queries were built by concatenating
  `$_REQUEST` values directly into SQL strings.
- **Plaintext passwords**, compared with `==`.
- **DB credentials (including a root account) hardcoded in source** and
  committed to git history.
- Used the `mysql_*` PHP extension, which was **removed from PHP entirely**
  in PHP 7 — the app doesn't run on any supported PHP version.
- No CSRF protection, no output escaping (XSS via question/answer content),
  naive session handling.

Every one of these is fixed by construction in the rewrite:

| Old problem | Fix |
|---|---|
| SQL injection | All queries go through Prisma's parameterized query builder — no string-built SQL anywhere. |
| Plaintext passwords | bcrypt (cost 12), verified with constant-time comparison. |
| Hardcoded DB creds | All secrets come from environment variables / `.env`, never committed. |
| No session security | Short-lived JWT access tokens (15 min) + rotating, hashed refresh tokens in `httpOnly`, `sameSite=strict` cookies. A stolen refresh token can only be replayed once before rotation invalidates it. |
| No rate limiting | Login endpoint limited to 10 attempts / 15 min per IP; global API rate limit as a backstop. |
| No input validation | Every request body validated with Zod schemas before touching the database. |
| No RBAC | Every admin route checks `role === "ADMIN"` server-side; students can only ever see/act on their own attempts. |
| Verbose error leaks | Central error handler returns generic messages; nothing about SQL, stack traces, or internals reaches the client. |

## New features (beyond the original)

- **Timed tests with server-enforced auto-submit.** Duration is the sum of
  each question's time budget (default 60s for MCQ, 300s for descriptive,
  admin-overridable per question per test). The timer is enforced
  server-side — even if a student closes the tab, the attempt auto-submits
  once the deadline passes.
- **Fixed pool, randomized order.** An admin selects the exact set of
  questions for a test. Each student attempt gets that same set shuffled
  into a random order, frozen at attempt start so refreshing never
  reshuffles.
- **Categories and negative marking**, configurable per question.
- **MCQ (auto-graded) and descriptive (human-graded) questions** in the same
  test, with a dedicated admin review queue for grading written answers.
- **Admin analytics**: overview stats, per-test score distribution, and
  per-question accuracy (to spot questions that are miscalibrated).
- Soft-delete ("retire") for questions/tests instead of hard delete, so
  historical attempts stay intact and auditable.

## Project layout

```
aptitude-rebuild/
├── backend/            Express API, Prisma schema, Dockerfile
├── frontend/            React (Vite) app, Dockerfile, nginx.conf
├── docker-compose.yml   Wires Postgres + backend + frontend together
└── .env.example         Root secrets for docker-compose
```

## Running locally without Docker (development)

Backend:
```bash
cd backend
cp .env.example .env   # point DATABASE_URL at a local Postgres
npm install
npx prisma migrate dev
npm run seed
npm run dev             # nodemon, http://localhost:4000
```

Frontend:
```bash
cd frontend
npm install
npm run dev              # http://localhost:5173
```

## Deploying to a VPS

- Put the app behind a reverse proxy (nginx or Traefik) that terminates TLS
  (Let's Encrypt) and forwards to the `frontend` and `backend` containers.
  Update `CORS_ORIGIN`, `PUBLIC_URL`, and `API_PUBLIC_URL` in `.env` to your
  real domain(s) once you do.
- Set `NODE_ENV=production` (already the default in `docker-compose.yml`).
- Replace every default secret in `.env` with a freshly generated one — see
  step 1 above.
- Take regular backups of the `pgdata` volume (`docker compose exec postgres
  pg_dump ...`).
- Rotate `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` if you ever suspect a
  leak — this immediately invalidates all sessions.

## Data model

See `backend/prisma/schema.prisma` for the full schema. Summary:

- **User** — students and admins, bcrypt password hash, active/inactive status.
- **Category** — question tags/topics.
- **Question** — MCQ or descriptive, marks, negative marks, per-question time
  budget, difficulty, category.
- **Test** — a named exam: a fixed pool of questions (via `TestQuestion`,
  which also allows per-test overrides of time/marks), shuffle and
  auto-submit flags, draft/published/archived status.
- **Attempt** — one student's run at a test: frozen shuffled question order,
  computed duration, status, final score once submitted.
- **AttemptAnswer** — one answer per question per attempt; auto-graded for
  MCQ, graded by an admin for descriptive.

## Suggested next steps

This scaffold covers the core rebuild. A few things worth adding before a
real production launch:

- Password reset / change-password flow (currently only registration and
  login exist).
- Email verification on registration.
- Audit log of admin actions (who created/edited which test or question).
- Server-side pagination for the question bank and student lists once they
  grow large.
- Automated tests (the scaffold has none yet — Jest/Vitest + Supertest would
  be a natural fit given the stack).
- A proper secrets manager (Docker secrets, or a VPS-level vault) instead of
  a plain `.env` file, if this ever handles sensitive student data at scale.
