# DEAA-Hub

Centralized administrative platform for **Direction de l’Enseignement et des Affaires Académiques (DEAA)**.

## Full Manual

For the complete product, setup, API, and operations guide, see:

- [docs/deaa-hub-complete-manual.md](docs/deaa-hub-complete-manual.md)
- [docs/deaa-hub-manuel-utilisation.md](docs/deaa-hub-manuel-utilisation.md) for the single-file user manual with screenshots
- [docs/deaa-hub-manuel-utilisation.docx](docs/deaa-hub-manuel-utilisation.docx) for the Word version
- [docs/deaa-hub-manuel-utilisation.pdf](docs/deaa-hub-manuel-utilisation.pdf) for the PDF version
- [docs/user-manual/index.md](docs/user-manual/index.md) for the page-by-page user manual with screenshots

## Stack

- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS, shadcn-style UI components
- **Backend**: NestJS (TypeScript), REST API, modular architecture
- **Database**: PostgreSQL + Prisma ORM
- **Runtime infrastructure**: Redis for temporary/session/cache state, MinIO for object storage
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

- PostgreSQL schema managed through Prisma (`backend/prisma/schema.prisma`)
- Relational model with foreign keys and indexed lookup fields
- Core indexes include student, filiere, department, class, cycle, and reservation lookups

## Storage And Stateless Backend Notes

- PostgreSQL stores users, roles, students, teachers, modules, grades, attendance, document metadata, signature-ready metadata, and audit logs.
- Raw files are not stored in PostgreSQL. New document uploads, course resources, and profile images are stored in MinIO with object references and hashes in the database.
- Redis is available as a reusable backend service for sessions, OTP codes, temporary verification tokens, QR attendance tokens, cache keys, rate limits, and queue keys. QR attendance tokens now use Redis with database fallback for compatibility.
- The backend no longer needs local disk for new runtime uploads. Existing local `Document.path`, `CoursResource.path`, and profile image paths continue to work while files are migrated.

Required infrastructure variables are listed in `.env.example` and `backend/.env.example`:

```bash
DATABASE_URL=
REDIS_URL=
MINIO_ENDPOINT=
MINIO_PORT=
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_USE_SSL=false
MINIO_BUCKET_ORIGINAL_DOCUMENTS=
MINIO_BUCKET_SIGNED_DOCUMENTS=
MINIO_BUCKET_SIGNATURE_ASSETS=
MINIO_BUCKET_PROFILE_IMAGES=
MINIO_BUCKET_TEMP=
```

To run the backend infrastructure locally:

```bash
docker compose up --build
```

Health endpoints:

- `GET /api` checks the backend process.
- `GET /api/db-status` checks PostgreSQL.
- `GET /api/health/infrastructure` checks PostgreSQL, Redis, and MinIO.

Safe migration path from existing local uploads:

1. Back up the current database and `backend/uploads`.
2. Apply migrations with `cd backend && npm run prisma:deploy`.
3. Start PostgreSQL, Redis, MinIO, and backend with the new environment values.
4. Let new uploads write directly to MinIO.
5. Gradually copy existing local files into the appropriate MinIO bucket, then update each row’s `path`, `storageProvider`, `bucket`, `objectKey`, `fileHash`, and `size`.
6. After all rows use `minio://...` references, app instances can run without a shared local upload directory behind a load balancer.

## Local Setup

### 1) Backend

1. Create backend environment values for at least `DATABASE_URL` and `JWT_SECRET`.
2. Ensure PostgreSQL is running and the database exists.
3. Install and run:
   - `npm install`
   - `npm run prisma:generate`
   - `npm run prisma:migrate`
   - `npm run prisma:seed`
   - `npm run start:dev`

Backend default URL: `http://localhost:4000/api`

Default admin account after seed:
- Identifier: `admin`
- Password: `admin`

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
- Set environment variables for at least `DATABASE_URL`, `JWT_SECRET`, and frontend CORS origins
- Run post-deploy commands:
  - `npm run prisma:generate`
  - `npm run prisma:deploy`
  - `npm run prisma:seed`

### Database → PostgreSQL provider

- Provision PostgreSQL instance
- Set `DATABASE_URL`
- Run Prisma migrations

## Bonus Features Included

- Export students to Excel (XLSX)
- Import students from CSV
- Dark / light mode
- Global admin shell with sidebar navigation
- Ready structure for FR/EN i18n extension
