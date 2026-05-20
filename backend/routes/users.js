/**
 * Patient / staff directory routes.
 *   GET   /api/users/patients         – list all patients          (ADMIN, DOCTOR, NURSE)
 *   GET   /api/users/doctors          – list doctors for booking   (any auth)
 *   GET   /api/users/me               – current logged-in profile
 *   PUT   /api/users/me               – update own profile
 *
 *   GET   /api/users/staff            – list all doctors & nurses  (ADMIN)
 *   POST  /api/users/staff            – create a doctor or nurse   (ADMIN)
 *   PATCH /api/users/staff/:id/status – activate / deactivate      (ADMIN)
 */
 const express = require('express');
 const bcrypt  = require('bcryptjs');
 const { body, validationResult } = require('express-validator');
 const db      = require('../config/db');
 const { verifyToken, requireRole } = require('../middleware/auth');
 
 const router = express.Router();
 
 /* ─────────────────────────────────────────────────────────────────────────────
    Auto-migration: ensure columns that may not exist in older DBs are present.
    Runs once on startup (called at the bottom of this file).
 ───────────────────────────────────────────────────────────────────────────── */
 async function ensureColumns() {
   const migrations = [
     // Add status column with default ACTIVE if it doesn't exist
     `ALTER TABLE users
        ADD COLUMN IF NOT EXISTS status VARCHAR(10) NOT NULL DEFAULT 'ACTIVE'`,
     // Add license_number column if it doesn't exist
     `ALTER TABLE users
        ADD COLUMN IF NOT EXISTS license_number VARCHAR(50)`,
     // Add specialisation column if it doesn't exist
     `ALTER TABLE users
        ADD COLUMN IF NOT EXISTS specialisation VARCHAR(100)`,
   ];
 
   for (const sql of migrations) {
     try {
       await db.query(sql);
     } catch (err) {
       // Non-fatal: log and continue (some DBs don't support IF NOT EXISTS)
       console.warn('Migration warning (non-fatal):', err.message);
     }
   }
   console.log('[users] Column migrations complete.');
 }
 
 ensureColumns();
 
 /* ─────────────────────────────────────────────────────────────────────────────
    Helper: normalise the DB result shape so the frontend always gets an array.
 ───────────────────────────────────────────────────────────────────────────── */
 function rowsOrEmpty(result) {
   if (!result) return [];
   if (Array.isArray(result)) return result;
   if (Array.isArray(result.rows)) return result.rows;
   return [];
 }
 
 /* ─────────────────────────────────────────────────────────────────────────────
    Existing routes (unchanged)
 ───────────────────────────────────────────────────────────────────────────── */
 
 router.get(
   '/patients',
   verifyToken,
   requireRole('ADMIN', 'DOCTOR', 'NURSE'),
   async (_req, res) => {
     try {
       const result = await db.query(
         `SELECT id, full_name, email, phone, date_of_birth, address
            FROM users WHERE role = 'PATIENT' ORDER BY full_name`
       );
       res.json(rowsOrEmpty(result));
     } catch (err) {
       console.error(err);
       res.status(500).json({ message: 'Failed to load patients.' });
     }
   }
 );
 
 router.get('/doctors', verifyToken, async (_req, res) => {
   try {
     const result = await db.query(
       `SELECT id, full_name, specialisation
          FROM users WHERE role = 'DOCTOR' ORDER BY full_name`
     );
     res.json(rowsOrEmpty(result));
   } catch (err) {
     console.error(err);
     res.status(500).json({ message: 'Failed to load doctors.' });
   }
 });
 
 router.get('/me', verifyToken, async (req, res) => {
   try {
     const result = await db.query(
       `SELECT id, full_name, email, role, phone, date_of_birth, address, specialisation
          FROM users WHERE id = $1`,
       [req.user.id]
     );
     if (!result.rowCount) return res.status(404).json({ message: 'User not found.' });
     res.json(result.rows[0]);
   } catch (err) {
     console.error(err);
     res.status(500).json({ message: 'Failed to load profile.' });
   }
 });
 
 router.put(
   '/me',
   verifyToken,
   [
     body('phone').optional().isString().isLength({ max: 30 }),
     body('address').optional().isString().isLength({ max: 500 }),
     body('date_of_birth').optional().isISO8601(),
   ],
   async (req, res) => {
     const errors = validationResult(req);
     if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
 
     const { phone, address, date_of_birth } = req.body;
     try {
       const result = await db.query(
         `UPDATE users
             SET phone         = COALESCE($1, phone),
                 address       = COALESCE($2, address),
                 date_of_birth = COALESCE($3, date_of_birth),
                 updated_at    = NOW()
           WHERE id = $4
           RETURNING id, full_name, email, role, phone, date_of_birth, address`,
         [phone, address, date_of_birth, req.user.id]
       );
       res.json(result.rows[0]);
     } catch (err) {
       console.error(err);
       res.status(500).json({ message: 'Failed to update profile.' });
     }
   }
 );
 
 /* ─────────────────────────────────────────────────────────────────────────────
    Staff routes  (ADMIN only)
 ───────────────────────────────────────────────────────────────────────────── */
 
 /**
  * GET /api/users/staff
  * Returns all DOCTOR and NURSE accounts, newest first.
  * Always returns a plain JSON array — the frontend expects this shape.
  */
 router.get('/staff', verifyToken, requireRole('ADMIN'), async (_req, res) => {
   try {
     const result = await db.query(
       `SELECT id, full_name, email, role, phone,
               specialisation, license_number,
               COALESCE(status, 'ACTIVE') AS status,
               created_at
          FROM users
         WHERE role IN ('DOCTOR', 'NURSE')
         ORDER BY created_at DESC`
     );
     // Always send a plain array — never nest inside { staff: [...] } etc.
     res.json(rowsOrEmpty(result));
   } catch (err) {
     console.error('GET /staff error:', err);
     res.status(500).json({ message: 'Failed to load staff.' });
   }
 });
 
 /**
  * POST /api/users/staff
  * Creates a new DOCTOR or NURSE account.
  * Body: { role, full_name, email, password, phone?, specialisation?, license_number? }
  */
 router.post(
   '/staff',
   verifyToken,
   requireRole('ADMIN'),
   [
     body('role').isIn(['DOCTOR', 'NURSE']).withMessage('Role must be DOCTOR or NURSE.'),
     body('full_name').notEmpty().withMessage('Full name is required.'),
     body('email').isEmail().withMessage('A valid email is required.'),
     body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
     body('phone').optional({ nullable: true }).isString().isLength({ max: 30 }),
     body('specialisation').optional({ nullable: true }).isString().isLength({ max: 100 }),
     body('license_number').optional({ nullable: true }).isString().isLength({ max: 50 }),
   ],
   async (req, res) => {
     const errors = validationResult(req);
     if (!errors.isEmpty())
       return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
 
     const { role, full_name, email, password, phone, specialisation, license_number } = req.body;
 
     try {
       // Duplicate email check
       const existing = await db.query(
         'SELECT id FROM users WHERE email = $1',
         [email.trim().toLowerCase()]
       );
       if (existing.rowCount > 0)
         return res.status(409).json({ message: 'A user with that email already exists.' });
 
       const password_hash = await bcrypt.hash(password, 12);
 
       const result = await db.query(
         `INSERT INTO users
            (role, full_name, email, password_hash, phone,
             specialisation, license_number, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE')
          RETURNING id, full_name, email, role, phone,
                    specialisation, license_number, status, created_at`,
         [
           role,
           full_name.trim(),
           email.trim().toLowerCase(),
           password_hash,
           phone          || null,
           specialisation || null,
           license_number || null,
         ]
       );
 
       res.status(201).json(result.rows[0]);
     } catch (err) {
       console.error('POST /staff error:', err);
       res.status(500).json({ message: 'Failed to create staff member.' });
     }
   }
 );
 
 /**
  * PATCH /api/users/staff/:id/status
  * Toggles a staff member between ACTIVE and INACTIVE.
  * Body: { status: 'ACTIVE' | 'INACTIVE' }
  */
 router.patch(
   '/staff/:id/status',
   verifyToken,
   requireRole('ADMIN'),
   [
     body('status')
       .isIn(['ACTIVE', 'INACTIVE'])
       .withMessage('Status must be ACTIVE or INACTIVE.'),
   ],
   async (req, res) => {
     const errors = validationResult(req);
     if (!errors.isEmpty())
       return res.status(400).json({ message: errors.array()[0].msg });
 
     const { id } = req.params;
     const { status } = req.body;
 
     // Prevent admins from deactivating themselves
     if (String(req.user.id) === String(id))
       return res.status(400).json({ message: 'You cannot change your own status.' });
 
     try {
       const result = await db.query(
         `UPDATE users
             SET status     = $1,
                 updated_at = NOW()
           WHERE id = $2
             AND role IN ('DOCTOR', 'NURSE')
           RETURNING id, full_name, role, status`,
         [status, id]
       );
 
       if (!result.rowCount)
         return res.status(404).json({ message: 'Staff member not found.' });
 
       res.json(result.rows[0]);
     } catch (err) {
       console.error('PATCH /staff/:id/status error:', err);
       res.status(500).json({ message: 'Failed to update status.' });
     }
   }
 );
 
 module.exports = router;