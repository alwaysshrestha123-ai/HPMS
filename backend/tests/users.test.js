// tests/users.test.js
// Simple unit tests for all /api/users routes.
// DB is fully mocked — no real database needed.
//
// Run:  npx jest users.test.js --runInBand --forceExit

const request = require('supertest');
const app = require('../server');           // your Express app (no .listen)
const db      = require('../config/db');     // mocked below
const jwt     = require('jsonwebtoken');

jest.mock('../config/db');

const SECRET = process.env.JWT_SECRET || 'test-secret-key';

// ── Token helpers ──────────────────────────────────────────────────────────
const token = (role, id = 1) =>
  'Bearer ' + jwt.sign({ id, role }, SECRET, { expiresIn: '1h' });

const ADMIN   = token('ADMIN');
const DOCTOR  = token('DOCTOR',  10);
const NURSE   = token('NURSE',   20);
const PATIENT = token('PATIENT', 30);

// ── Fake DB rows ───────────────────────────────────────────────────────────
const doctor = {
  id: 101, full_name: 'Alice Smith', email: 'alice@clinic.com',
  role: 'DOCTOR', phone: '+61400000001',
  specialisation: 'Cardiologist', license_number: 'MED001',
  status: 'ACTIVE', created_at: new Date().toISOString(),
};

const nurse = {
  id: 102, full_name: 'Bob Jones', email: 'bob@clinic.com',
  role: 'NURSE', phone: null,
  specialisation: null, license_number: null,
  status: 'ACTIVE', created_at: new Date().toISOString(),
};

const patient = {
  id: 200, full_name: 'Carol White', email: 'carol@clinic.com',
  phone: null, date_of_birth: '1990-01-01', address: '1 Main St',
};

beforeEach(() => jest.clearAllMocks());

// ══════════════════════════════════════════════════════════════════════════
// GET /api/users/staff
// ══════════════════════════════════════════════════════════════════════════
describe('GET /api/users/staff', () => {
  test('returns staff list for ADMIN', async () => {
    db.query.mockResolvedValueOnce({ rows: [doctor, nurse] });

    const res = await request(app)
      .get('/api/users/staff')
      .set('Authorization', ADMIN);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].email).toBe(doctor.email);
  });

  test('returns empty array when no staff exist', async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/users/staff')
      .set('Authorization', ADMIN);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns 403 for DOCTOR', async () => {
    const res = await request(app)
      .get('/api/users/staff')
      .set('Authorization', DOCTOR);
    expect(res.status).toBe(403);
  });

  test('returns 401 with no token', async () => {
    const res = await request(app).get('/api/users/staff');
    expect(res.status).toBe(401);
  });

  test('returns 500 when DB throws', async () => {
    db.query.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(app)
      .get('/api/users/staff')
      .set('Authorization', ADMIN);

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('message');
  });
});

// ══════════════════════════════════════════════════════════════════════════
// POST /api/users/staff
// ══════════════════════════════════════════════════════════════════════════
describe('POST /api/users/staff', () => {
  const newDoctor = {
    role: 'DOCTOR', full_name: 'Jane Doe',
    email: 'jane@clinic.com', password: 'password123',
    specialisation: 'Neurologist', license_number: 'MED999',
  };

  test('creates a DOCTOR and returns 201', async () => {
    db.query
      .mockResolvedValueOnce({ rowCount: 0 })       // no duplicate
      .mockResolvedValueOnce({ rows: [doctor] });    // INSERT result

    const res = await request(app)
      .post('/api/users/staff')
      .set('Authorization', ADMIN)
      .send(newDoctor);

    expect(res.status).toBe(201);
    expect(res.body.role).toBe('DOCTOR');
  });

  test('creates a NURSE and returns 201', async () => {
    db.query
      .mockResolvedValueOnce({ rowCount: 0 })
      .mockResolvedValueOnce({ rows: [nurse] });

    const res = await request(app)
      .post('/api/users/staff')
      .set('Authorization', ADMIN)
      .send({ role: 'NURSE', full_name: 'Bob Jones', email: 'bob@clinic.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.role).toBe('NURSE');
  });

  test('returns 409 for duplicate email', async () => {
    db.query.mockResolvedValueOnce({ rowCount: 1 }); // duplicate found

    const res = await request(app)
      .post('/api/users/staff')
      .set('Authorization', ADMIN)
      .send(newDoctor);

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already exists/i);
  });

  test('returns 400 for missing full_name', async () => {
    const res = await request(app)
      .post('/api/users/staff')
      .set('Authorization', ADMIN)
      .send({ ...newDoctor, full_name: '' });
    expect(res.status).toBe(400);
  });

  test('returns 400 for invalid email', async () => {
    const res = await request(app)
      .post('/api/users/staff')
      .set('Authorization', ADMIN)
      .send({ ...newDoctor, email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  test('returns 400 for password shorter than 8 chars', async () => {
    const res = await request(app)
      .post('/api/users/staff')
      .set('Authorization', ADMIN)
      .send({ ...newDoctor, password: 'short' });
    expect(res.status).toBe(400);
  });

  test('returns 400 for invalid role', async () => {
    const res = await request(app)
      .post('/api/users/staff')
      .set('Authorization', ADMIN)
      .send({ ...newDoctor, role: 'SUPERADMIN' });
    expect(res.status).toBe(400);
  });

  test('returns 403 for non-ADMIN', async () => {
    const res = await request(app)
      .post('/api/users/staff')
      .set('Authorization', DOCTOR)
      .send(newDoctor);
    expect(res.status).toBe(403);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// PATCH /api/users/staff/:id/status
// ══════════════════════════════════════════════════════════════════════════
describe('PATCH /api/users/staff/:id/status', () => {
  test('deactivates a staff member', async () => {
    db.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 101, full_name: 'Alice Smith', role: 'DOCTOR', status: 'INACTIVE' }],
    });

    const res = await request(app)
      .patch('/api/users/staff/101/status')
      .set('Authorization', ADMIN)
      .send({ status: 'INACTIVE' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('INACTIVE');
  });

  test('reactivates a staff member', async () => {
    db.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 102, full_name: 'Bob Jones', role: 'NURSE', status: 'ACTIVE' }],
    });

    const res = await request(app)
      .patch('/api/users/staff/102/status')
      .set('Authorization', ADMIN)
      .send({ status: 'ACTIVE' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ACTIVE');
  });

  test('returns 404 for unknown staff ID', async () => {
    db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const res = await request(app)
      .patch('/api/users/staff/9999/status')
      .set('Authorization', ADMIN)
      .send({ status: 'INACTIVE' });

    expect(res.status).toBe(404);
  });

  test('returns 400 for invalid status value', async () => {
    const res = await request(app)
      .patch('/api/users/staff/101/status')
      .set('Authorization', ADMIN)
      .send({ status: 'DELETED' });
    expect(res.status).toBe(400);
  });

  test('returns 403 for non-ADMIN', async () => {
    const res = await request(app)
      .patch('/api/users/staff/101/status')
      .set('Authorization', NURSE)
      .send({ status: 'INACTIVE' });
    expect(res.status).toBe(403);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// GET /api/users/patients
// ══════════════════════════════════════════════════════════════════════════
describe('GET /api/users/patients', () => {
  test('returns patients for ADMIN', async () => {
    db.query.mockResolvedValueOnce({ rows: [patient] });
    const res = await request(app)
      .get('/api/users/patients')
      .set('Authorization', ADMIN);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  test('returns patients for DOCTOR', async () => {
    db.query.mockResolvedValueOnce({ rows: [patient] });
    const res = await request(app)
      .get('/api/users/patients')
      .set('Authorization', DOCTOR);
    expect(res.status).toBe(200);
  });

  test('returns patients for NURSE', async () => {
    db.query.mockResolvedValueOnce({ rows: [patient] });
    const res = await request(app)
      .get('/api/users/patients')
      .set('Authorization', NURSE);
    expect(res.status).toBe(200);
  });

  test('returns 403 for PATIENT role', async () => {
    const res = await request(app)
      .get('/api/users/patients')
      .set('Authorization', PATIENT);
    expect(res.status).toBe(403);
  });

  test('returns 401 with no token', async () => {
    const res = await request(app).get('/api/users/patients');
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// GET /api/users/doctors
// ══════════════════════════════════════════════════════════════════════════
describe('GET /api/users/doctors', () => {
  test('returns doctor list for any authenticated user', async () => {
    db.query.mockResolvedValueOnce({ rows: [
      { id: 101, full_name: 'Alice Smith', specialisation: 'Cardiologist' }
    ]});
    const res = await request(app)
      .get('/api/users/doctors')
      .set('Authorization', PATIENT);
    expect(res.status).toBe(200);
    expect(res.body[0]).not.toHaveProperty('password_hash');
  });

  test('returns 401 with no token', async () => {
    const res = await request(app).get('/api/users/doctors');
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// GET /api/users/me
// ══════════════════════════════════════════════════════════════════════════
describe('GET /api/users/me', () => {
  test('returns own profile', async () => {
    db.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 10, full_name: 'Dr. Alice', email: 'alice@clinic.com', role: 'DOCTOR' }],
    });
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', DOCTOR);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('email');
    expect(res.body).not.toHaveProperty('password_hash');
  });

  test('returns 404 if user no longer in DB', async () => {
    db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', ADMIN);
    expect(res.status).toBe(404);
  });

  test('returns 401 with no token', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
  });
});

// ══════════════════════════════════════════════════════════════════════════
// PUT /api/users/me
// ══════════════════════════════════════════════════════════════════════════
describe('PUT /api/users/me', () => {
  test('updates own profile and returns updated row', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ id: 10, full_name: 'Dr. Alice', phone: '+61400111222' }],
    });
    const res = await request(app)
      .put('/api/users/me')
      .set('Authorization', DOCTOR)
      .send({ phone: '+61400111222', address: '2 Park Rd' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('phone');
  });

  test('returns 400 for invalid date_of_birth', async () => {
    const res = await request(app)
      .put('/api/users/me')
      .set('Authorization', DOCTOR)
      .send({ date_of_birth: 'not-a-date' });
    expect(res.status).toBe(400);
  });

  test('returns 401 with no token', async () => {
    const res = await request(app)
      .put('/api/users/me')
      .send({ phone: '+61400000000' });
    expect(res.status).toBe(401);
  });
});