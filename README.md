# Career Command Center

A full-stack job application tracker with an AI resume tailor. Track every application through the pipeline, get reminders, view analytics, and auto-rewrite your resume bullets to match any job description.

Live at [ajaylive.com](https://ajaylive.com)

---

## What it does

- **Application tracking** — add jobs, move them through stages (Applied → Screened → Interview → Offer → Rejected), add notes and reminders
- **RTR pipeline** — right-to-represent tracking for contract roles
- **Analytics dashboard** — charts showing applications by status, activity over time, response rates
- **AI resume tailor** — paste a job description, get your resume bullets rewritten to match it using the Anthropic API
- **Resume builder** — generate a structured resume from your saved profile data
- **Role-based access** — admin controls, token-based auth

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 17 (TypeScript, RxJS, standalone components) |
| Backend | Python, Django REST Framework |
| Database | PostgreSQL |
| Auth | DRF Token Authentication |
| AI | Anthropic API (resume tailoring) |
| Deployment | Railway |

---

## Project Structure

```
career-command-center/
│
├── frontend/                          # Angular 17 SPA
│   └── src/app/
│       ├── core/                      # Auth service, HTTP interceptor, guards
│       ├── shared/                    # Reusable components, pipes
│       └── features/
│           ├── dashboard/             # Overview + stats
│           ├── applications/          # Job application CRUD + pipeline
│           ├── resume-builder/        # Resume editor + AI tailor
│           ├── analytics/             # Charts and reports
│           └── rtr/                   # RTR pipeline
│
└── backend/                           # Django REST Framework API
    ├── core/
    │   ├── views/
    │   │   ├── auth.py                # login, logout, register, profile
    │   │   ├── applications.py        # job CRUD, status updates
    │   │   ├── analytics.py           # aggregation queries
    │   │   ├── resume.py              # resume generation
    │   │   └── ai_tailor.py          # Anthropic API integration
    │   ├── models.py                  # User, Job, Application, Resume
    │   ├── serializers.py
    │   └── urls.py
    └── config/
        └── settings.py
```

---

## Running Locally

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env        # add DB_URL, SECRET_KEY, ANTHROPIC_API_KEY
python manage.py migrate
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
ng serve
```

Open [http://localhost:4200](http://localhost:4200)

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | Django secret key |
| `ANTHROPIC_API_KEY` | For AI resume tailoring |
| `ALLOWED_HOSTS` | Comma-separated allowed hosts |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login/` | Login, returns token |
| POST | `/api/auth/register/` | Register |
| GET/POST | `/api/jobs/` | List / create job applications |
| PATCH | `/api/jobs/<id>/` | Update job status |
| GET | `/api/analytics/` | Aggregated stats |
| POST | `/api/tailor/` | AI resume tailoring |
| GET/POST | `/api/resume/` | Resume data |

---

## Source

[github.com/ajay062002/career-command-center](https://github.com/ajay062002/career-command-center)
