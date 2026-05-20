/**
 * Electronic Health Record routes.
 *   GET  /api/ehr/patient/:patientId   – clinicians view patient EHR
 *   GET  /api/ehr/me                   – patient views own EHR
 *   POST /api/ehr                      – doctor adds a new EHR entry
 */
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../middleware/auditLogger');

const router = express.Router();

router.get(
  '/patient/:patientId',
  verifyToken,
  requireRole('DOCTOR', 'NURSE', 'ADMIN'),
  [param('patientId').isInt({ min: 1 })],
  async (req, res) => {
    try {
      const result = await db.query(
        `SELECT e.id, e.diagnosis, e.prescription, e.notes, e.visit_date,
                d.full_name AS doctor_name
           FROM ehr_records e
           JOIN users d ON d.id = e.doctor_id
          WHERE e.patient_id = $1
          ORDER BY e.visit_date DESC`,
        [req.params.patientId]
      );
      logAudit(req.user.id, 'EHR_VIEW', `patients/${req.params.patientId}/ehr`, req.ip);
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to load EHR.' });
    }
  }
);

router.get('/me', verifyToken, requireRole('PATIENT'), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT e.id, e.diagnosis, e.prescription, e.notes, e.visit_date,
              d.full_name AS doctor_name
         FROM ehr_records e
         JOIN users d ON d.id = e.doctor_id
        WHERE e.patient_id = $1
        ORDER BY e.visit_date DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load EHR.' });
  }
});

router.post(
  '/',
  verifyToken,
  requireRole('DOCTOR'),
  [
    body('patient_id').isInt({ min: 1 }),
    body('diagnosis').isString().isLength({ min: 3, max: 1000 }),
    body('prescription').optional().isString().isLength({ max: 1000 }),
    body('notes').optional().isString().isLength({ max: 2000 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { patient_id, diagnosis, prescription, notes } = req.body;
    try {
      const result = await db.query(
        `INSERT INTO ehr_records (patient_id, doctor_id, diagnosis, prescription, notes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, diagnosis, visit_date`,
        [patient_id, req.user.id, diagnosis, prescription || null, notes || null]
      );
      logAudit(req.user.id, 'EHR_CREATE', `patients/${patient_id}/ehr`, req.ip);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to create EHR entry.' });
    }
  }
);

module.exports = router;
