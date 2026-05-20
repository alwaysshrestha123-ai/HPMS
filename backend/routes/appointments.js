/**
 * Appointment routes.
 *   GET    /api/appointments              – role-aware list
 *   POST   /api/appointments              – patient books an appointment
 *   PATCH  /api/appointments/:id/status   – doctor/admin updates status
 *   DELETE /api/appointments/:id          – patient cancels their own appointment
 */
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../middleware/auditLogger');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    let result;
    if (req.user.role === 'PATIENT') {
      result = await db.query(
        `SELECT a.id, a.appointment_dt, a.reason, a.status,
                d.full_name AS doctor_name, d.specialisation
           FROM appointments a
           JOIN users d ON d.id = a.doctor_id
          WHERE a.patient_id = $1
          ORDER BY a.appointment_dt DESC`,
        [req.user.id]
      );
    } else if (req.user.role === 'DOCTOR') {
      result = await db.query(
        `SELECT a.id, a.appointment_dt, a.reason, a.status,
                p.full_name AS patient_name, p.id AS patient_id
           FROM appointments a
           JOIN users p ON p.id = a.patient_id
          WHERE a.doctor_id = $1
          ORDER BY a.appointment_dt ASC`,
        [req.user.id]
      );
    } else {
      // ADMIN, NURSE -> see all
      result = await db.query(
        `SELECT a.id, a.appointment_dt, a.reason, a.status,
                p.full_name AS patient_name, d.full_name AS doctor_name
           FROM appointments a
           JOIN users p ON p.id = a.patient_id
           JOIN users d ON d.id = a.doctor_id
          ORDER BY a.appointment_dt DESC LIMIT 200`
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load appointments.' });
  }
});

router.post(
  '/',
  verifyToken,
  requireRole('PATIENT'),
  [
    body('doctor_id').isInt({ min: 1 }),
    body('appointment_dt').isISO8601(),
    body('reason').optional().isString().isLength({ max: 500 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { doctor_id, appointment_dt, reason } = req.body;

    if (new Date(appointment_dt) < new Date()) {
      return res.status(400).json({ message: 'Appointment date must be in the future.' });
    }

    try {
      // Verify the target is actually a doctor (defense in depth).
      const doc = await db.query("SELECT 1 FROM users WHERE id = $1 AND role = 'DOCTOR'", [doctor_id]);
      if (!doc.rowCount) return res.status(400).json({ message: 'Invalid doctor selected.' });

      const result = await db.query(
        `INSERT INTO appointments (patient_id, doctor_id, appointment_dt, reason)
         VALUES ($1, $2, $3, $4)
         RETURNING id, appointment_dt, reason, status`,
        [req.user.id, doctor_id, appointment_dt, reason || null]
      );
      logAudit(req.user.id, 'APPOINTMENT_CREATE', `appointments/${result.rows[0].id}`, req.ip);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to book appointment.' });
    }
  }
);

router.patch(
  '/:id/status',
  verifyToken,
  requireRole('DOCTOR', 'ADMIN'),
  [
    param('id').isInt({ min: 1 }),
    body('status').isIn(['BOOKED', 'COMPLETED', 'CANCELLED']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const result = await db.query(
        `UPDATE appointments SET status = $1
          WHERE id = $2 AND ($3 = 'ADMIN' OR doctor_id = $4)
          RETURNING id, status`,
        [req.body.status, req.params.id, req.user.role, req.user.id]
      );
      if (!result.rowCount) return res.status(404).json({ message: 'Appointment not found.' });
      logAudit(req.user.id, 'APPOINTMENT_STATUS', `appointments/${req.params.id}`, req.ip);
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to update appointment.' });
    }
  }
);

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    // Patients may only cancel their own; admins may cancel any.
    const where = req.user.role === 'ADMIN'
      ? 'id = $1'
      : 'id = $1 AND patient_id = $2';
    const params = req.user.role === 'ADMIN' ? [req.params.id] : [req.params.id, req.user.id];

    const result = await db.query(
      `UPDATE appointments SET status = 'CANCELLED' WHERE ${where} RETURNING id`,
      params
    );
    if (!result.rowCount) return res.status(404).json({ message: 'Appointment not found.' });
    logAudit(req.user.id, 'APPOINTMENT_CANCEL', `appointments/${req.params.id}`, req.ip);
    res.json({ message: 'Cancelled.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to cancel appointment.' });
  }
});

module.exports = router;
