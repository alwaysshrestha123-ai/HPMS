# Hospital Patient Management System (HPMS)

ICT921 – Applied Software Engineering, Assessment 3 (Semester 1, 2026).

A full-stack web application that digitises patient registration, appointment
scheduling, electronic health records (EHR), billing, and reporting for a
mid-sized hospital. Built with **React + Tailwind** on the front end and
**Node.js + Express + PostgreSQL** on the back end, following the 3-tier
architecture pattern and Agile (Scrum) methodology.

---

## 1. Architecture at a glance

| Layer | Technology | Responsibility |
|---|---|---|
| Presentation | React 18 SPA, Tailwind CSS, Vite | UI, form validation, role-based views |
| API / Business | Node.js 20, Express.js 4 | Business logic, authentication, API routing, middleware |
| Data | PostgreSQL 15 | Persistent storage, transactional integrity |
| Cross-cutting | JWT, bcrypt, Helmet, express-rate-limit | Security |

---

## 2. Prerequisites

You only need three things installed locally:

| Tool | Version | Check with |
|---|---|---|
| Node.js | ≥ 20.x | `node -v` |
| npm | ≥ 10.x (ships with Node) | `npm -v` |
| PostgreSQL | ≥ 14.x | `psql --version` |

Install Postgres via your OS package manager, Postgres.app (macOS), or Docker
(`docker run --name hpms-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15`).

---

## 3. One-time setup

### 3.1  Create the database

```bash
# Connect to your local Postgres server
psql -U postgres

# In the psql prompt:
CREATE DATABASE hpms_db;
\q
```

### 3.2  Configure the backend

```bash
cd backend
cp .env.example .env
# Edit .env if your DB user/password isn't postgres/postgres
npm install
npm run init-db      # creates tables + seeds demo users
```

You should see:

```
✅  Database initialised successfully.
Seed accounts (password = Password123!): admin@hpms.local …
```

### 3.3  Install the frontend

```bash
cd ../frontend
npm install
```

---

## 4. Run the system

Open **two** terminals.

**Terminal 1 — backend API (port 5000):**

```bash
cd backend
npm run dev          # uses nodemon; or npm start for plain node
```

**Terminal 2 — frontend dev server (port 5173):**

```bash
cd frontend
npm run dev
```

Open <http://localhost:5173> in your browser. Sign in with any of the demo
accounts shown on the login screen. Password for all of them is
`Password123!`.

---

## 5. Demo accounts

| Role | Email | What you can do |
|---|---|---|
| ADMIN   | admin@hpms.local       | Dashboard, view all data, issue invoices |
| DOCTOR  | sarah.chen@hpms.local  | View own appointments, add EHR entries |
| DOCTOR  | raj.patel@hpms.local   | View own appointments, add EHR entries |
| NURSE   | emma.wilson@hpms.local | View patients, issue invoices |
| PATIENT | john.smith@hpms.local  | Book appointments, view own EHR, pay bills |
| PATIENT | mary.johnson@hpms.local| Book appointments, view own EHR, pay bills |

All passwords: `Password123!`.

To register a brand-new patient, click **"Register as a patient"** on the
login screen.

---

## 6. Run the test suite

```bash
cd backend
npm test
```

Runs Jest + Supertest against the running database. The seed must be in place
(`npm run init-db`).

---

## 7. Project layout

```
hpms-project/
├── README.md
├── backend/                    Node.js + Express API
│   ├── server.js               App entry, security middleware
│   ├── package.json
│   ├── .env.example
│   ├── config/db.js            PostgreSQL pool
│   ├── models/
│   │   ├── schema.sql          DDL + seed data
│   │   └── initDb.js           DB initialiser script
│   ├── middleware/
│   │   ├── auth.js             JWT verification + RBAC
│   │   └── auditLogger.js      Compliance audit logging
│   ├── routes/
│   │   ├── auth.js             /api/auth (login, register)
│   │   ├── users.js            /api/users (profiles, doctor list)
│   │   ├── appointments.js     /api/appointments
│   │   ├── ehr.js              /api/ehr
│   │   ├── billing.js          /api/billing
│   │   └── reports.js          /api/reports (admin dashboard)
│   └── tests/
│       └── auth.test.js        Jest + Supertest smoke tests
└── frontend/                   React 18 SPA
    ├── index.html
    ├── vite.config.js          Dev proxy: /api → localhost:5000
    ├── tailwind.config.js
    ├── postcss.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx             Router + auth guard
        ├── index.css           Tailwind base + component classes
        ├── api/apiClient.js    Axios w/ JWT interceptor
        ├── context/AuthContext.jsx
        ├── components/
        │   ├── Navbar.jsx
        │   ├── ProtectedRoute.jsx
        │   └── StatusBadge.jsx
        └── pages/
            ├── Login.jsx
            ├── Register.jsx
            ├── Dashboard.jsx
            ├── Appointments.jsx
            ├── EHR.jsx
            └── Billing.jsx
```

---

## 8. API summary

| Method | Endpoint | Roles | Purpose |
|---|---|---|---|
| POST   | /api/auth/register      | public  | Patient self-registration |
| POST   | /api/auth/login         | public  | Returns JWT |
| GET    | /api/users/me           | any     | Current user profile |
| PUT    | /api/users/me           | any     | Update own profile |
| GET    | /api/users/patients     | staff   | List patients |
| GET    | /api/users/doctors      | any     | Doctor directory for booking |
| GET    | /api/appointments       | any     | Role-aware listing |
| POST   | /api/appointments       | PATIENT | Book appointment |
| PATCH  | /api/appointments/:id/status | DOCTOR/ADMIN | Mark complete/cancel |
| DELETE | /api/appointments/:id   | PATIENT/ADMIN | Cancel |
| GET    | /api/ehr/me             | PATIENT | Own records |
| GET    | /api/ehr/patient/:id    | DOCTOR/NURSE/ADMIN | Patient records |
| POST   | /api/ehr                | DOCTOR  | Add new EHR entry |
| GET    | /api/billing            | any     | Role-aware listing |
| POST   | /api/billing            | ADMIN/NURSE | Issue invoice |
| PATCH  | /api/billing/:id/pay    | PATIENT | Mark own bill paid |
| GET    | /api/reports/dashboard  | ADMIN   | KPIs |

---

## 9. Security features implemented

- **bcrypt** password hashing (cost factor 10)
- **JWT** stateless authentication with 2-hour token expiry
- **Helmet** secure HTTP headers
- **express-rate-limit** on `/api/auth/*` (20 req / 15 min)
- **express-validator** input validation + sanitization on every write endpoint
- **CORS** restricted to the configured `CLIENT_ORIGIN`
- **Parameterised queries** — no SQL string concatenation, no SQL injection
- **Role-Based Access Control (RBAC)** middleware on every protected route
- **Audit log** of all authentication and CRUD events for compliance
- **Defense in depth** — server re-validates the doctor role before booking,
  patients can only modify their own data even with a stolen token of another
  patient's id, etc.
- **Same response** for "unknown email" and "wrong password" to prevent user
  enumeration

---

## 10. Troubleshooting

| Symptom | Fix |
|---|---|
| `ECONNREFUSED` on `localhost:5432` | Postgres isn't running. Start it. |
| `password authentication failed` | Edit `backend/.env` to match your Postgres credentials. |
| `relation "users" does not exist` | Run `npm run init-db` in the backend folder. |
| Frontend shows 401 immediately | Token expired; log out and back in. |
| `EADDRINUSE` on port 5000 / 5173 | Another process is using the port. Stop it or change the port. |
| Tailwind classes not applying | Run `npm run dev` in the frontend folder (Vite needs to rebuild). |

---

## 11. Acknowledgement of AI assistance

In line with the unit's AI Use Policy, generative AI tools (Claude, ChatGPT)
were used for: scaffolding boilerplate (`server.js`, route skeletons),
syntax/API examples, and suggesting test-case ideas. All architectural
decisions, schema design, security choices, integration, manual testing,
debugging, and deployment were performed by the team. Every AI-suggested
snippet was reviewed, modified, and verified by a team member before
inclusion.

---

© 2026 ICT921 Group Project
