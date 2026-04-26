# Spendwise - Personal Expense Tracker

Spendwise is a production-oriented full-stack expense tracker with a FastAPI backend and a Next.js frontend. It is designed for real usage with clear UX, safe write semantics, and deploy-ready Docker setup.

## 1) Product Highlights

### Functional features
- User signup and login with JWT authentication.
- Create expenses with amount, category, description, and date.
- Predefined category selector with optional custom category path.
- List expenses for the current user only.
- Filter expenses by category.
- Sort expenses by newest date.
- Running total of currently visible expenses.

### Reliability and safety
- Idempotent expense creation via `Idempotency-Key` header.
- Automatic pending-submission retry support in frontend local storage.
- Token validation on protected routes and forced logout on invalid/expired token.
- Decimal-based money handling (fixed precision, no float rounding errors).

### UX and theme features implemented
- Cohesive fintech-style theme (Spendwise branding).
- Token-based design system in separate CSS token file.
- Responsive top navbar with username and logout action.
- Success and error popup toasts (login, logout, expense creation, auth errors).
- Confirmation modal when adding an expense greater than `5000`.
- Rupee symbol on amount input and in table/total display.
- Category dropdown with predefined values and "Other" custom-category input.
- Themed filter bar, category badges, striped expense rows.
- Monospaced amount column for cleaner financial readability.
- Loading skeleton rows and styled error banner states.

## 2) Tech Stack

### Backend
- FastAPI
- SQLAlchemy ORM
- SQLite (default)
- Pydantic
- python-jose (JWT)
- passlib + bcrypt

### Frontend
- Next.js (App Router)
- React + TypeScript
- Fetch API abstraction layer
- Global tokenized CSS theme

### Infra / Deployment
- Docker (backend + frontend images)
- Docker Compose (local multi-service orchestration)
- Render blueprint (`render.yaml`) for production deployment

## 3) Project Architecture

```text
Fenmo_Assignment/
  backend/
    app/
      main.py               # FastAPI app, CORS, router registration
      database.py           # DB engine/session/base
      models.py             # SQLAlchemy models
      schemas.py            # Pydantic request/response schemas
      deps.py               # Auth dependency (get_current_user)
      security.py           # password hashing + JWT encode/decode config
      routers/
        auth.py             # signup/login endpoints
        expenses.py         # create/list expense endpoints + idempotency
    requirements.txt
    Dockerfile

  frontend/
    app/
      layout.tsx            # global layout and font
      globals.css           # imports tokens/theme CSS
      login/page.tsx        # login UX + popup errors/success flow
      signup/page.tsx       # signup UX
      dashboard/page.tsx    # navbar, filters, totals, table, loading/error states
    components/
      ExpenseForm.tsx       # create expense + >5000 confirmation modal
      ExpenseTable.tsx      # expense table + badges + money formatting
      Toast.tsx             # success/error popup notifications
      ConfirmDialog.tsx     # reusable confirmation modal
    lib/
      api.ts                # API client layer
      auth.ts               # token + user display state
      flash.ts              # one-time cross-route toast messaging
      types.ts              # shared frontend types
    styles/
      tokens.css            # design tokens on :root
      theme.css             # global themed component styles
    Dockerfile

  docker-compose.yml
  render.yaml
```

## 4) Core Architecture: Request and Response Lifecycle

### A) Authentication flow

1. Frontend calls `POST /auth/signup` or `POST /auth/login` with credentials.
2. Backend validates input and user credentials.
3. Backend returns token payload:

```json
{
  "access_token": "<jwt>",
  "token_type": "bearer"
}
```

4. Frontend stores token in local storage and routes user to dashboard.
5. Protected requests include header:

```http
Authorization: Bearer <jwt>
```

6. Backend dependency `get_current_user` decodes JWT, resolves `sub` user id, and loads the user from DB.

### B) Expense creation flow (idempotent write path)

1. User submits expense in frontend form.
2. Frontend generates a UUID idempotency key and sends:

```http
POST /expenses
Authorization: Bearer <jwt>
Idempotency-Key: <uuid>
Content-Type: application/json
```

3. Backend hashes normalized request payload.
4. Backend checks `idempotency_keys` table for `(user_id, key)`.
5. If key exists with same payload hash, backend returns previously stored response body (safe retry).
6. If key exists with different payload hash, backend returns `409 Conflict`.
7. If key does not exist, backend creates expense, stores response snapshot + hash + status code, and returns `201`.

### C) Expense list flow

1. Frontend requests `GET /expenses` with optional query params:
   - `category=<value>`
   - `sort=date_desc`
2. Backend filters by authenticated user id.
3. Category filter uses case-insensitive exact matching.
4. Backend applies query filter/sort.
5. Backend returns:

```json
{
  "expenses": [
    {
      "id": 1,
      "amount": "499.99",
      "category": "Travel",
      "description": "Taxi",
      "date": "2026-04-26",
      "created_at": "2026-04-26T14:00:00"
    }
  ],
  "total": "499.99"
}
```

### D) Error handling path

- Auth failures return `401` with detail: `Invalid or expired token`.
- Missing idempotency key on create returns `400`.
- Reused idempotency key with different body returns `409`.
- Frontend shows errors as popup toast (login auth error) or styled error banners/messages where relevant.

## 5) API Contract Summary

### `POST /auth/signup`

Request:
```json
{
  "email": "john@example.com",
  "full_name": "John Doe",
  "password": "strongpass1"
}
```

Response `201`:
```json
{
  "access_token": "<jwt>",
  "token_type": "bearer"
}
```

### `POST /auth/login`

Request:
```json
{
  "email": "john@example.com",
  "password": "strongpass1"
}
```

Response `200`:
```json
{
  "access_token": "<jwt>",
  "token_type": "bearer"
}
```

### `POST /expenses`

Headers:
- `Authorization: Bearer <jwt>`
- `Idempotency-Key: <uuid>`

Request:
```json
{
  "amount": "1299.00",
  "category": "Shopping",
  "description": "Headphones",
  "date": "2026-04-27"
}
```

Response `201`:
```json
{
  "id": 11,
  "amount": "1299.00",
  "category": "Shopping",
  "description": "Headphones",
  "date": "2026-04-27",
  "created_at": "2026-04-27T12:40:10"
}
```

### `GET /expenses`

Headers:
- `Authorization: Bearer <jwt>`

Optional query params:
- `category=<category>`
- `sort=date_desc`

`category` performs case-insensitive exact match.

Response `200`:
```json
{
  "expenses": ["..."],
  "total": "1499.49"
}
```

## 6) Frontend Theming System

Theme is split into two files for maintainability and portability:

- `frontend/styles/tokens.css`: root-level design tokens (colors, typography, spacing, shadows, radii).
- `frontend/styles/theme.css`: global component-level styles that consume tokens.

This allows usage in plain HTML/CSS pages or React components with minimal adaptation.

## 7) Local Development

### Option A: Docker Compose (recommended)

From repository root:

```bash
docker compose up --build
```

Services:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000

### Option B: Run services manually

Backend (uvicorn command):

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## 8) Deployment (Render)

This project now deploys both services as Docker services.

### Blueprint deploy

Use `render.yaml` from repo root. It defines:
- `expense-tracker-api` (Docker, rootDir: `backend`)
- `expense-tracker-frontend` (Docker, rootDir: `frontend`)

### Manual Render setup

Create two Web Services:

1. Backend service
- Environment: Docker
- Root Directory: `backend`
- Dockerfile Path: `Dockerfile`
- Health Check Path: `/health`

2. Frontend service
- Environment: Docker
- Root Directory: `frontend`
- Dockerfile Path: `Dockerfile`

### Required environment variables

Backend:
- `JWT_SECRET=<strong-secret>`
- `DATABASE_URL=sqlite:////app/data/expense_tracker.db`
- `ACCESS_TOKEN_EXPIRE_MINUTES=120`
- `ALLOWED_ORIGINS=https://<frontend-service>.onrender.com`

Frontend:
- `NEXT_PUBLIC_API_BASE_URL=https://<backend-service>.onrender.com`

## 9) Data Model

- `users`
  - `id`, `email`, `full_name`, `hashed_password`, `created_at`
- `expenses`
  - `id`, `user_id`, `amount`, `category`, `description`, `date`, `created_at`
- `idempotency_keys`
  - `id`, `user_id`, `key`, `request_hash`, `response_body`, `status_code`, `created_at`
  - unique constraint: `(user_id, key)`

## 10) Testing and Validation

Backend tests:

```bash
cd backend
pytest
```

Current backend integration coverage includes:
- Signup/login success and idempotent expense replay.
- Case-insensitive exact category filtering.
- Invalid password login (`401`).
- Missing `Idempotency-Key` on create (`400`).
- Reused idempotency key with changed payload (`409`).
- Category trimming persistence behavior.
- Protected list endpoint requiring authentication.

Frontend production build check:

```bash
cd frontend
npm run build
```

## 11) Operational Notes and Trade-offs

- Uses `Base.metadata.create_all(...)` instead of migration tooling for fast setup.
- Auth token is stored in local storage (simple and practical, but not as strong as HTTP-only cookies).
- SQLite is excellent for low-to-moderate single-node workloads; Postgres can be introduced later.

## 12) Future Improvements

- Refresh tokens and secure session rotation.
- Password reset and email verification.
- Category analytics/charts and budget alerts.
- DB migrations (Alembic) and stronger CI/CD pipelines.
