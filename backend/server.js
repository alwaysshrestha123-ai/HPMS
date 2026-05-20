/**
 * Hospital Patient Management System (HPMS)
 * Express.js entry-point.
 */
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes        = require('./routes/auth');
const userRoutes        = require('./routes/users');
const appointmentRoutes = require('./routes/appointments');
const ehrRoutes         = require('./routes/ehr');
const billingRoutes     = require('./routes/billing');
const reportRoutes      = require('./routes/reports');

const app = express();

/* ---------- security & infra middleware ---------- */
app.use(helmet());                                            // sets secure HTTP headers
app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));  // restrict CORS in production
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Throttle login/register endpoints to mitigate brute-force attacks.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.use('/api/auth/', authLimiter);

/* ---------- routes ---------- */
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'hpms-api' }));
app.use('/api/auth',         authRoutes);
app.use('/api/users',        userRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/ehr',          ehrRoutes);
app.use('/api/billing',      billingRoutes);
app.use('/api/reports',      reportRoutes);

/* ---------- 404 + central error handler ---------- */
app.use((req, res) => res.status(404).json({ message: `Route ${req.originalUrl} not found.` }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error.' });
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`HPMS API listening on http://localhost:${PORT}`);
  });
}

module.exports = app;   // exported for jest/supertest
