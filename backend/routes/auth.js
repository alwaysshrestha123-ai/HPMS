/**
 * Authentication routes:  POST /api/auth/register, POST /api/auth/login
 */
const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { logAudit } = require('../middleware/auditLogger');

const router = express.Router();

/* ----------  REGISTER (patients only via public endpoint) ---------- */
router.post(
  '/register',
  [
    body('full_name').trim().isLength({ min: 2, max: 120 }),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 })
                    .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
                    .matches(/[0-9]/).withMessage('Password must contain a number'),
    body('phone').optional().isString().isLength({ max: 30 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { full_name, email, password, phone } = req.body;

    try {
      const exists = await db.query('SELECT 1 FROM users WHERE email = $1', [email]);
      if (exists.rowCount) {
        return res.status(409).json({ message: 'An account with that email already exists.' });
      }

      const hash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS, 10) || 10);
      const result = await db.query(
        `INSERT INTO users (full_name, email, password_hash, role, phone)
         VALUES ($1, $2, $3, 'PATIENT', $4)
         RETURNING id, full_name, email, role`,
        [full_name, email, hash, phone || null]
      );

      logAudit(result.rows[0].id, 'REGISTER', 'users', req.ip);
      return res.status(201).json({ user: result.rows[0] });
    } catch (err) {
      console.error('Register error:', err);
      return res.status(500).json({ message: 'Registration failed.' });
    }
  }
);

/* ----------  LOGIN ---------- */
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isString().notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;

    try {
      const result = await db.query(
        'SELECT id, full_name, email, password_hash, role FROM users WHERE email = $1',
        [email]
      );
      if (result.rowCount === 0) {
        // Same response for unknown email and wrong password (avoid user enumeration).
        return res.status(401).json({ message: 'Invalid email or password.' });
      }

      const user = result.rows[0];
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) {
        logAudit(user.id, 'LOGIN_FAIL', 'auth', req.ip);
        return res.status(401).json({ message: 'Invalid email or password.' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '2h' }
      );

      logAudit(user.id, 'LOGIN_OK', 'auth', req.ip);
      return res.json({
        token,
        user: { id: user.id, full_name: user.full_name, email: user.email, role: user.role },
      });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({ message: 'Login failed.' });
    }
  }
);

module.exports = router;
