README file

A full-stack web application that digitises patient registration, appointment
scheduling, electronic health records (EHR), billing, and reporting for a
mid-sized hospital. Built with **React + Tailwind** on the front end and
**Node.js + Express + PostgreSQL** on the back end, following the 3-tier
architecture pattern and Agile (Scrum) methodology.

---

 Architecture at a glance

| Layer | Technology | Responsibility |aq
|---|---|---|
| Presentation | React 18 SPA, Tailwind CSS, Vite | UI, form validation, role-based views |
| API / Business | Node.js 20, Express.js 4 | Business logic, authentication, API routing, middleware |
| Data | PostgreSQL 15 | Persistent storage, transactional integrity |
| Cross-cutting | JWT, bcrypt, Helmet, express-rate-limit | Security |

---




 Demo accounts

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

Project layout

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

API summary

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
Security features implemented

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

 Troubleshooting

| Symptom | Fix |
|---|---|
| `ECONNREFUSED` on `localhost:5432` | Postgres isn't running. Start it. |
| `password authentication failed` | Edit `backend/.env` to match your Postgres credentials. |
| `relation "users" does not exist` | Run `npm run init-db` in the backend folder. |
| Frontend shows 401 immediately | Token expired; log out and back in. |
| `EADDRINUSE` on port 5000 / 5173 | Another process is using the port. Stop it or change the port. |
| Tailwind classes not applying | Run `npm run dev` in the frontend folder (Vite needs to rebuild). |

---



© 2026 WEB development  Group Project - 
