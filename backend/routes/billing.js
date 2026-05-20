/**
 * Billing routes.
 *   GET  /api/billing            – role-aware list (patient: own bills, staff: all)
 *   POST /api/billing            – admin/nurse issue an invoice
 *   PATCH /api/billing/:id/pay   – patient marks own bill as paid (mock)
 */
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const { logAudit } = require('../middleware/auditLogger');

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
  try {
    let rows;
    if (req.user.role === 'PATIENT') {
      rows = (await db.query(
        `SELECT id, amount, description, status, issued_date, paid_date
           FROM billing WHERE patient_id = $1 ORDER BY issued_date DESC`,
        [req.user.id]
      )).rows;
    } else {
      rows = (await db.query(
        `SELECT b.id, b.amount, b.description, b.status, b.issued_date, b.paid_date,
                p.full_name AS patient_name
           FROM billing b JOIN users p ON p.id = b.patient_id
          ORDER BY b.issued_date DESC LIMIT 200`
      )).rows;
    }
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load billing.' });
  }
});

router.post(
  '/',
  verifyToken,
  requireRole('ADMIN', 'NURSE'),
  [
    body('patient_id').isInt({ min: 1 }),
    body('amount').isFloat({ min: 0 }),
    body('description').isString().isLength({ min: 3, max: 500 }),
    body('appointment_id').optional().isInt({ min: 1 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { patient_id, amount, description, appointment_id } = req.body;

    try {
      const result = await db.query(
        `INSERT INTO billing (patient_id, appointment_id, amount, description)
         VALUES ($1, $2, $3, $4)
         RETURNING id, amount, description, status, issued_date`,
        [patient_id, appointment_id || null, amount, description]
      );
      logAudit(req.user.id, 'BILLING_CREATE', `billing/${result.rows[0].id}`, req.ip);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Failed to issue invoice.' });
    }
  }
);

router.patch(
  '/:id/pay',
  verifyToken,
  requireRole('PATIENT'),
  [param('id').isInt({ min: 1 })],
  async (req, res) => {
    try {
      const result = await db.query(
        `UPDATE billing
            SET status = 'PAID', paid_date = CURRENT_DATE
          WHERE id = $1 AND patient_id = $2 AND status = 'PENDING'
          RETURNING id, status, paid_date`,
        [req.params.id, req.user.id]
      );
      if (!result.rowCount) {
        return res.status(404).json({ message: 'Invoice not found or already paid.' });
      }
      logAudit(req.user.id, 'BILLING_PAY', `billing/${req.params.id}`, req.ip);
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Payment failed.' });
    }
  }
);

module.exports = router;
