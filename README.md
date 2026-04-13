# DEAA-Hub

Centralized administrative platform for **Direction de l’Enseignement et des Affaires Académiques (DEAA)**.

## Stack

- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS, shadcn-style UI components
- **Backend**: NestJS (TypeScript), REST API, modular architecture
- **Database**: MySQL + Prisma ORM
- **Security**: JWT auth, bcrypt password hashing, RBAC, DTO validation

## Monorepo Structure

```txt
deaa-hub/
├─ frontend/
│  ├─ app/
│  ├─ components/
│  ├─ features/
│  ├─ lib/
│  └─ services/
└─ backend/
   ├─ prisma/
   └─ src/
      ├─ modules/
      ├─ controllers/
      ├─ services/
      ├─ entities/
      ├─ auth/
      └─ common/
```

## Core Modules Included

1. Dashboard (stats + charts + recent activity)
2. Students management (CRUD + search + pagination + profile-ready endpoint)
3. Teachers & vacataires (CRUD)
4. Filières & departments (CRUD + relations)
5. Documents management (secure upload + per-student folder)
6. Workflow system (status + assignment + timeline)
7. Rooms management (CRUD)
8. Laureates & diplomas (tracking + status)
9. Users & roles (admin/staff/viewer)
10. Activity logs (user action tracking)

## Database Notes

- MySQL compatible schema (`backend/prisma/schema.prisma`)
- InnoDB-compatible relational model with foreign keys
- Indexes included for performance (`codeMassar`, `filiereId`, `departmentId`)

## Local Setup

### 1) Backend

1. Copy env values in `backend/.env` (already scaffolded with placeholders).
2. Ensure MySQL is running and database exists.
3. Install and run:
   - `npm install`
   - `npm run prisma:generate`
   - `npm run prisma:migrate -- --name init`
   - `npm run prisma:seed`
   - `npm run start:dev`

Backend default URL: `http://localhost:4000/api`

Default admin account after seed:
- Email: `admin@deaa.local`
- Password: `Admin@123`

### 2) Frontend

1. Ensure `frontend/.env.local` points to backend API:
   - `NEXT_PUBLIC_API_URL=http://localhost:4000/api`
2. Install and run:
   - `npm install`
   - `npm run dev`

Frontend default URL: `http://localhost:3000`

## Security Implemented

- JWT bearer authentication
- Role guards (`admin`, `staff`, `viewer`)
- Password hashing with bcrypt
- DTO-based input validation
- Upload file type/size restrictions

## Performance Practices Used

- API pagination on students endpoint
- Prisma optimized selection / counting on dashboard
- Lazy data fetching per page
- Structured modular services for scalability

## Deployment

### Frontend → Vercel

- Import `frontend` project into Vercel
- If deploying from repository root, keep Vercel project `Root Directory` set to `frontend`
- CLI deploy command from repo root: `vercel --cwd frontend`
- Set env var:
  - `NEXT_PUBLIC_API_URL=<your-backend-api-url>/api`

### Backend → Railway / Render

- Deploy `backend` service
- Set env vars from `backend/.env.example`
- Run post-deploy commands:
  - `npm run prisma:generate`
  - `npm run prisma:deploy`
  - `npm run prisma:seed`

### Database → PlanetScale / Railway MySQL

- Provision MySQL instance
- Set `DATABASE_URL`
- Run Prisma migrations

## Bonus Features Included

- Export students to Excel (XLSX)
- Import students from CSV
- Dark / light mode
- Global admin shell with sidebar navigation
- Ready structure for FR/EN i18n extension
