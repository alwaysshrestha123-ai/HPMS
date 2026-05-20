/**
 * Smoke tests for the HPMS API.
 * Run with:  npm test
 *
 * NOTE: These tests assume the database has been initialised
 * (npm run init-db) and the seed accounts exist.
 */
const request = require('supertest');
const app = require('../server');

describe('Auth endpoints', () => {
  test('Health check returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('Login rejects invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@hpms.local', password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  test('Login accepts seed admin credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@hpms.local', password: 'Password123!' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.role).toBe('ADMIN');
  });

  test('Protected route rejects missing token', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
  });

  test('Patient cannot access admin dashboard (RBAC)', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'john.smith@hpms.local', password: 'Password123!' });
    const token = login.body.token;

    const res = await request(app)
      .get('/api/reports/dashboard')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('Registration rejects weak password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ full_name: 'Test User', email: `test${Date.now()}@x.com`, password: 'short' });
    expect(res.status).toBe(400);
  });
});
