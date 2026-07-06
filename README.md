# Fusion MDCAT App

Mobile-first MDCAT test platform for **Fusion College Narowal** — FastAPI backend + Next.js PWA, deployed on Vercel.

## Stack

- **Frontend**: Next.js 15 App Router, React 19, Tailwind CSS v4, TypeScript (PWA with dark theme)
- **Backend**: FastAPI, SQLAlchemy 2.0, PostgreSQL, JWT auth
- **Roles**: Admin, Tutor, Student, Parent

## Pages

### Student (5 pages)
| Route | Description |
|---|---|
| `/student` | Dashboard — avg score, open tests, recent results |
| `/student/tests` | Assigned test list with open/upcoming/closed status |
| `/student/tests/[id]` | **Exam UI** — countdown timer, question navigator, mark-for-review, auto-save, auto-submit |
| `/student/results/[id]` | Result summary + full review mode with correct answers & explanations |
| `/student/history` | Past attempts with all-time stats |

### Tutor (8 pages)
| Route | Description |
|---|---|
| `/tutor` | Dashboard — stats, recent submissions, quick actions |
| `/tutor/questions` | Question bank browser with subject filters, edit & delete |
| `/tutor/questions/new` | Create single question |
| `/tutor/questions/[id]/edit` | Edit existing question |
| `/tutor/questions/import` | Bulk JSON import |
| `/tutor/tests` | Test list with assign buttons |
| `/tutor/tests/new` | Create test — manual pick or auto-generate by subject/difficulty |
| `/tutor/tests/[id]/assign` | Assign test to batch with time window |
| `/tutor/batches` | Create batch, view enrollment, enroll students |
| `/tutor/analytics` | Topic accuracy bars, score trend chart, subject breakdown |

### Admin (2 pages)
| Route | Description |
|---|---|
| `/admin` | System-wide stats dashboard |
| `/admin/users` | User management — search, filter by role, activate/deactivate, link parent |

### Parent (2 pages)
| Route | Description |
|---|---|
| `/parent` | Dashboard |
| `/parent/progress` | Children's test scores and progress |

### Shared (4 pages)
| Route | Description |
|---|---|
| `/` | Landing page with sign in / register |
| `/login` | Sign in |
| `/register` | Self-registration with role selection |
| `/profile` | Update name/phone, change password |

## Features

### Authentication & Security
- JWT access + refresh tokens with **auto-refresh on 401**
- bcrypt password hashing
- Role-based access control on every route
- **Server-side timer** — attempt deadline computed server-side, enforced on answer save
- One attempt per student per assignment (DB constraint)
- Randomized question order per student

### Question Bank
- 5 subjects (Bio, Chem, Physics, English, Logical Reasoning)
- 3 difficulty levels with past-paper year tagging
- Full CRUD with edit and soft-delete
- Bulk JSON import

### Test System
- Create tests manually or auto-generate by subject + difficulty mix
- Configurable duration, marks per question, negative marking (default −0.25)
- Assign to batches with start/end windows
- Students get server-started timer, auto-grading on submit (or timeout)
- **Auto-grading**: computes score + negative marking + subject breakdown + batch rank

### Review Mode
- After submission, students see question-by-question review
- Correct answer highlighted in green, wrong selection in red
- Full explanation for each question

### Analytics
- Topic-level accuracy tracking across all submissions
- Weakest topics identified (lowest accuracy)
- Score trend chart over time
- Subject breakdown per test

### Notifications / Real-time
- Tutor dashboard shows recent submissions live (polls via API)
- `notify_sent` column on assignments for future push/SMS integration

## Local development

### 1. Database

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Set `DATABASE_URL` and `JWT_SECRET` in `backend/.env`.

### 2. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 3. Seed data

```bash
cd backend
python seed.py
```

Creates: admin, tutor, 5 students, parent, 1 batch, 60 questions (12/subject), 1 test, 3 submitted attempts.

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

### Login credentials (after seeding)

| Role | Email | Password |
|---|---|---|
| Admin | admin@fusion.edu.pk | admin123 |
| Tutor | tutor@fusion.edu.pk | tutor123 |
| Student | student1-5@fusion.edu.pk | student123 |
| Parent | parent@example.com | parent123 |

## Deployment (Vercel)

1. Connect repo to Vercel
2. Add environment variables:
   - `DATABASE_URL` — PostgreSQL connection string
   - `JWT_SECRET` — strong random secret
   - `CORS_ORIGINS` — your Vercel domain(s)
   - `API_URL` — leave empty on Vercel (rewrites use same origin)
3. Deploy — `vercel.json` routes `/api/*` to FastAPI
