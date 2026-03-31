<div align="center">

# 🚀 Career Command Center

### Your all-in-one career tracking dashboard

[![Live Site](https://img.shields.io/badge/Live%20Site-ajaylive.com-0059B3?style=for-the-badge&logo=vercel&logoColor=white)](https://ajaylive.com)
[![Angular](https://img.shields.io/badge/Angular-17-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.io)
[![Django](https://img.shields.io/badge/Django-5-092E20?style=for-the-badge&logo=django&logoColor=white)](https://djangoproject.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Render-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://render.com)
[![Vercel](https://img.shields.io/badge/Frontend-Vercel-000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)

Track job applications, RTR requests, submissions, reminders, and study sessions — all in one place.

**[➡️ View Live Site](https://ajaylive.com)**

</div>

---

## 📸 Screenshots

> **Dashboard**

![Dashboard](https://i.imgur.com/placeholder-dashboard.png)
<!-- Replace with real screenshot: drag an image into this GitHub issue/PR edit box to get a URL, then paste here -->

> **RTR Tracker**

![RTR Tracker](https://i.imgur.com/placeholder-rtr.png)

> **Submissions Pipeline**

![Submissions](https://i.imgur.com/placeholder-submissions.png)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📊 **Dashboard** | Stats overview — total jobs, RTRs, submissions, reminders at a glance |
| 💼 **Jobs** | Track job applications with status, company, and notes |
| 📋 **RTR Tracker** | Right-to-represent tracker with vendor grouping and push-to-submission |
| 📤 **Submissions** | Full submission pipeline with status tracking |
| 🔔 **Reminders** | Date-based reminder system with priority levels |
| 📚 **Study** | Log study sessions and topics |
| 📈 **Analytics** | Charts and trends across your job search |
| 👤 **Profile** | Editable user profile with stats |
| 🔐 **Admin** | User management portal (admin role only) |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Angular 17 (standalone components, Angular Material) |
| Backend | Django 5 + Django REST Framework |
| Database | PostgreSQL (Render) |
| Auth | Token-based (DRF Knox) |
| Frontend host | Vercel |
| Backend host | Render |
| Domain | Namecheap → ajaylive.com |

---

## 🚀 Local Development

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL (optional — SQLite works for quick dev)

### 1. Clone

```bash
git clone https://github.com/ajay062002/career-command-center.git
cd career-command-center
```

### 2. Backend

```bash
# Create virtual environment
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:4200
ADMIN_PASSWORD=admin123

# Run migrations and seed admin user
python manage.py migrate
python manage.py seed

# Start server (runs on http://localhost:8000)
python manage.py runserver
```

### 3. Frontend

```bash
cd frontend
npm install
ng serve    # runs on http://localhost:4200
```

Login with: `admin` / whatever you set as `ADMIN_PASSWORD`

---

## ☁️ Production Deployment

### Backend → [Render.com](https://render.com)

`render.yaml` handles everything. Set these env vars in Render dashboard:

```
SECRET_KEY          → random 50-char string
DEBUG               → false
ALLOWED_HOSTS       → api.ajaylive.com,career-command-center-api.onrender.com
CORS_ALLOWED_ORIGINS → https://ajaylive.com,https://www.ajaylive.com
DATABASE_URL        → from Render PostgreSQL add-on
ADMIN_PASSWORD      → your secure password
```

### Frontend → [Vercel](https://vercel.com)

Connect the GitHub repo. `frontend/vercel.json` handles build config + SPA routing automatically.

### DNS (Namecheap)

| Type | Host | Points to |
|------|------|-----------|
| A | `@` | `216.198.79.1` (Vercel) |
| CNAME | `www` | Vercel DNS target |
| CNAME | `api` | `career-command-center-api.onrender.com` |

---

## ⚠️ Important Notes

- **Render free tier sleeps** after 15 min of inactivity — first request after sleep takes ~30 sec to wake up
- **PostgreSQL on Render free tier expires April 26 2026** — upgrade or migrate the database before then
- Admin account is auto-created on every deploy via `python manage.py seed` using the `ADMIN_PASSWORD` env var

---

<div align="center">

Built by **Ajay** · Live at **[ajaylive.com](https://ajaylive.com)**

</div>
