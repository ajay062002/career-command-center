# Career Command Center

A full-stack career tracking web app — live at **[ajaylive.com](https://ajaylive.com)**

Track job applications, RTR requests, submissions, reminders, and study sessions in one place.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 17 (standalone components, Angular Material) |
| Backend | Django 5 + Django REST Framework |
| Database | PostgreSQL (Render) |
| Auth | Token-based (DRF) |
| Frontend host | Vercel |
| Backend host | Render (free tier) |
| Domain | Namecheap → ajaylive.com |

---

## Project Structure

```
career-command-center/
├── frontend/                  # Angular 17 app
│   ├── src/app/
│   │   ├── core/              # Services, models, interceptors, guards
│   │   ├── features/          # Page components (dashboard, jobs, rtr, etc.)
│   │   └── layout/            # Main layout (sidenav, toolbar)
│   ├── src/environments/      # environment.ts + environment.prod.ts
│   └── angular.json
│
├── core/                      # Django app (models, views, serializers)
│   └── management/commands/   # seed.py — creates admin user on deploy
├── django_backend/            # Django project settings + urls + wsgi
├── manage.py
├── requirements.txt
├── render.yaml                # Render.com deployment config
└── docker-compose.yml         # Local dev with PostgreSQL
```

---

## Local Development

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL (or use SQLite for quick dev)

### 1. Backend

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables (create a .env file)
cp .env.example .env             # edit with your values

# Run migrations and seed admin
python manage.py migrate
python manage.py seed

# Start server
python manage.py runserver
```

**.env variables needed:**
```
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:4200
DATABASE_URL=postgres://user:pass@localhost:5432/careerdb   # omit to use SQLite
ADMIN_PASSWORD=your-admin-password
```

### 2. Frontend

```bash
cd frontend
npm install
ng serve          # runs on http://localhost:4200
```

The frontend talks to `http://localhost:8000/api` by default (`src/environments/environment.ts`).

---

## Production Deployment

### Backend → Render

Configured via `render.yaml`. On each deploy Render runs:
```
pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py migrate
python manage.py seed
gunicorn django_backend.wsgi:application --bind 0.0.0.0:$PORT
```

**Required env vars on Render:**
| Variable | Value |
|----------|-------|
| `SECRET_KEY` | random 50-char string |
| `DEBUG` | `false` |
| `ALLOWED_HOSTS` | `api.ajaylive.com,career-command-center-api.onrender.com` |
| `CORS_ALLOWED_ORIGINS` | `https://ajaylive.com,https://www.ajaylive.com` |
| `DATABASE_URL` | from Render PostgreSQL add-on |
| `ADMIN_PASSWORD` | secure password for admin account |

### Frontend → Vercel

Configured via `frontend/vercel.json`:
- Build: `npm run build -- --configuration production`
- Output: `dist/career-command-center-frontend/browser`
- SPA rewrites: all routes → `index.html`

Production API URL is set in `frontend/src/environments/environment.prod.ts`.

### DNS (Namecheap)

| Type | Host | Value |
|------|------|-------|
| A | `@` | `216.198.79.1` (Vercel) |
| CNAME | `www` | Vercel DNS target |
| CNAME | `api` | `career-command-center-api.onrender.com` |

---

## Features

- **Dashboard** — stats overview, quick actions
- **Jobs** — job application tracker
- **RTR** — right-to-represent tracker with vendor grouping
- **Submissions** — submission pipeline tracking
- **Reminders** — date-based reminder system
- **Study** — study session logger
- **Analytics** — charts and trends
- **Profile** — user profile with editable info
- **Admin** — user management (admin role only)

---

## Notes

- Render free tier **sleeps after 15 min** of inactivity — first request after sleep takes ~30 sec
- PostgreSQL on Render free tier **expires April 26 2026** — upgrade or migrate before then
- Admin account is created automatically on deploy via `python manage.py seed` using `ADMIN_PASSWORD` env var
