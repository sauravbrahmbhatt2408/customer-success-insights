# Customer Success Insights

A small app for customer success teams. Track customers, log calls, meetings and emails, and get
an AI summary of each interaction with sentiment, action items and risks. A dashboard shows the
health of the book of business.

Backend: FastAPI, async SQLAlchemy, PostgreSQL, Redis, Gemini. Frontend: Next.js (App Router),
Redux Toolkit with RTK Query, Tailwind, shadcn/ui, recharts.

## Features

- Email and password auth with three roles: admin, manager and CSM.
- Customers: list with search and filters (status, plan, owner), create, edit, delete.
- Interactions: log meetings, calls, emails and support tickets, with filters by customer, type,
  sentiment and date range.
- AI insight for every interaction: summary, sentiment, action items and risks, generated in the
  background. Failed runs can be regenerated.
- Dashboard: headline numbers, interactions per day, sentiment and status breakdowns, recent risks,
  customers with no contact in 30+ days and recent activity. Cached in Redis per scope.
- User management for admins (role and active status).
- Light and dark theme, and layouts that work from phones to wide screens.

## Running it

You need Git and Docker.

```bash
git clone https://github.com/sauravbrahmbhatt2408/customer-success-insights.git
cd customer-success-insights
cp .env.example .env
docker compose up --build
```

- App: http://localhost:3000
- API docs: http://localhost:8000/docs

The api container runs migrations and loads demo data on start. Postgres is published on port
5433 so it doesn't clash with a local install.

Without a `GEMINI_API_KEY` the app uses a fixed fake insight, so everything works offline. Get a
free key from [Google AI Studio](https://aistudio.google.com/apikey) to use real summaries.

### Accounts

| Role    | Name              | Email                | Password   |
| ------- | ----------------- | -------------------- | ---------- |
| Admin   | Neha Kapoor       | admin@csinsights.io  | Welcome123 |
| Manager | Maria Lopez       | maria@csinsights.io  | Welcome123 |
| CSM     | Saurav Brahmbhatt | saurav@csinsights.io | Welcome123 |
| CSM     | Daniel Kim        | daniel@csinsights.io | Welcome123 |

The admin comes from `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

### Without Docker for the app code

Start only the databases with `docker compose up postgres redis`, then (on Windows use
`.venv\Scripts\` instead of `.venv/bin/`):

```bash
cd backend
python -m venv .venv && .venv/bin/pip install -r requirements-dev.txt
.venv/bin/alembic upgrade head && .venv/bin/python seed.py
.venv/bin/uvicorn app.main:app --reload

cd ../frontend
npm install && npm run dev
```

### Tests and lint

The tests use real Postgres and Redis from compose. The test database is created automatically.

```bash
cd backend
.venv/bin/pytest
.venv/bin/ruff check . && .venv/bin/ruff format --check .

cd ../frontend
npm run lint && npm run build
```

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Async SQLAlchemy URL (`postgresql+asyncpg://...`) |
| `REDIS_URL` | Redis for the dashboard cache |
| `JWT_SECRET` | Signs access and refresh tokens. Use a long random value in production |
| `ACCESS_TOKEN_EXPIRE_MINUTES` / `REFRESH_TOKEN_EXPIRE_DAYS` | Token lifetimes (30 min / 7 days) |
| `COOKIE_SECURE` | `true` when served over HTTPS |
| `CORS_ORIGINS` | JSON list of allowed origins. Only needed if the API is called directly from a browser |
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Gemini settings. Empty key means fake insights |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | First admin, created by `seed.py` |
| `BACKEND_URL` (frontend, build time) | Where Next.js proxies `/api/*` |
| `TEST_DATABASE_URL` / `TEST_REDIS_URL` | Optional overrides for the tests |

## Project structure

```
backend/
  app/
    main.py          app setup, routers, error handler
    config.py        settings from environment
    database.py      async engine, session, declarative base
    security.py      password hashing and JWTs
    deps.py          db session, current user, role checks, pagination
    cache.py         Redis client and dashboard cache helpers
    models/          users, customers, interactions, insights
    schemas/         request and response models
    routers/         auth, users, customers, interactions, dashboard
    services/        ai.py (Gemini), dashboard.py (aggregate queries)
  alembic/           migrations
  seed.py            admin and demo data
  tests/             pytest suite against real Postgres and Redis
frontend/
  src/
    app/             (auth) login/register, (dashboard) pages behind the session guard
    components/      forms, tables, charts, sidebar, shadcn/ui primitives
    store/           Redux store, auth slice, RTK Query API
    lib/             axios client with refresh handling, zod schemas
    types/           shared TypeScript types
docker-compose.yml   postgres, redis, api, web
render.yaml          Render blueprint for the backend
```

## API

All routes are under `/api/v1` except `GET /health`. Interactive docs are at `/docs`.

| Method and path | Who | Notes |
| --- | --- | --- |
| `POST /auth/register` | anyone | Always creates a CSM |
| `POST /auth/login` | anyone | Access token in the body, refresh token in an httpOnly cookie |
| `POST /auth/refresh`, `POST /auth/logout` | anyone | Read or clear the refresh cookie |
| `GET /auth/me`, `PATCH /auth/me` | signed in | Profile and password change |
| `GET /users`, `PATCH /users/{id}` | admin | Role and active status |
| `GET /users/options` | admin, manager | Owner picker |
| `GET /customers`, `POST /customers` | signed in | Filters: `status`, `plan`, `owner_id`, `search` |
| `GET/PATCH /customers/{id}` | signed in | CSMs only reach their own customers |
| `DELETE /customers/{id}` | admin, manager | Also deletes interactions and insights |
| `GET /interactions`, `POST /interactions` | signed in | Filters: `customer_id`, `type`, `sentiment`, `date_from`, `date_to` |
| `GET/PATCH /interactions/{id}` | signed in | Changing notes queues a new insight |
| `POST /interactions/{id}/regenerate` | signed in | Retry the insight |
| `GET /dashboard` | signed in | Scoped to the CSM's own customers |

Lists take `page` and `page_size` (max 100) and return `{ items, total, page, page_size }`.
Errors use `{ "detail": "message" }`.

## How it fits together

The browser only talks to the Next.js app. Next.js `rewrites` proxy `/api/*` to FastAPI, so the API
looks same-origin. Login returns a 30 minute access token, which the frontend keeps in Redux
(memory only), and sets a 7 day refresh token in an httpOnly cookie scoped to `/api/v1/auth`. On
page load the app calls `/auth/refresh` to restore the session. The axios interceptor retries a
request once after a 401, and concurrent 401s share a single refresh call.

Permissions are enforced in the backend. CSMs only see customers they own and those customers'
interactions. The owner filter is part of the SQL query, and anything outside their scope returns
404. Managers see everything and can delete customers. Admins also manage users. The frontend only
hides buttons.

Creating an interaction, or changing its notes, saves it as `pending` and starts a FastAPI
background task. The task skips short notes, otherwise it calls Gemini in JSON mode with a response
schema and validates the result with Pydantic. It retries once, then marks the interaction `failed`
with a short error. A failure never keeps old or invented output. If the notes changed while the
model was working, the stale result is dropped. The detail page polls while the status is
`pending` and offers Regenerate after a failure.

`GET /dashboard` is built with `COUNT`/`GROUP BY` queries and cached in Redis for five minutes.
The key includes the scope (`dashboard:all` or `dashboard:user:{id}`), so a CSM can never get
org-wide numbers. Every customer or interaction write, and every finished insight, deletes the
affected keys after the commit. If Redis is down, the API logs it and reads from the database.

## Decisions

- **BackgroundTasks instead of a queue.** It's fine at this scale and needs no extra service. With
  real load I'd move generation to a proper queue (ARQ or Celery) so it survives restarts and can
  be rate limited.
- **Enums stored as strings**, validated by Pydantic. Adding a status doesn't need a Postgres
  `ALTER TYPE` migration.
- **Refresh tokens are stateless JWTs.** Logout clears the cookie but can't revoke a stolen token
  before it expires. A token table or deny list would fix that.
- **Native `<select>` elements** instead of a custom dropdown component. They're accessible and
  work directly with react-hook-form.
- **Owner picker.** `GET /users/options` gives admins and managers a minimal `{id, full_name, role}`
  list for picking or filtering by owner, while `/users` stays admin-only.

## What I'd improve

- Refresh token rotation with server-side revocation.
- A job queue and rate limiting for AI calls.
- Full-text or trigram search for customers instead of `ILIKE`.
- Customer pickers that search on the server instead of loading the first 100.
- Frontend tests (Playwright for the main flows) and CI.
- Audit log of who changed what.

## Deployment (Vercel + Render)

**Backend on Render.** `render.yaml` describes the API (Docker), a PostgreSQL database and a Key
Value (Redis) instance.

1. In Render, choose New > Blueprint and select this repository.
2. Enter `GEMINI_API_KEY` and `ADMIN_PASSWORD` when asked. `JWT_SECRET` is generated.
3. The API runs migrations on start and uses `/health` as its health check.
4. Load the admin and demo data once from your machine, using the database's External Database
   URL from the Render dashboard:

   ```bash
   cd backend
   DATABASE_URL="<external database url>" ADMIN_PASSWORD="<same as on Render>" .venv/bin/python seed.py
   ```

**Frontend on Vercel**

1. Import the repository and set the root directory to `frontend`.
2. Set `BACKEND_URL` to the Render API URL, for example `https://csi-api.onrender.com`. Rewrites are
   read at build time, so redeploy after changing it.

All API calls go through the Vercel domain, so the refresh cookie is first-party and no CORS setup
is needed. On the free plan the API sleeps after 15 minutes without traffic and takes about a
minute to wake up.
