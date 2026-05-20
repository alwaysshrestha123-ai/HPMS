/**
 * Dashboard / reporting routes (admin & management).
 */
const express = require('express');
const db = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/dashboard', verifyToken, requireRole('ADMIN'), async (_req, res) => {
  try {
    const [
      totalPatientsR,
      totalDoctorsR,
      totalNursesR,
      apptToday,
      revenueR,
      pendingBillsR,
    ] = await Promise.all([
      db.query("SELECT COUNT(*)::int AS c FROM users WHERE role = 'PATIENT'"),
      db.query("SELECT COUNT(*)::int AS c FROM users WHERE role = 'DOCTOR'"),
      db.query("SELECT COUNT(*)::int AS c FROM users WHERE role = 'NURSE'"),
      db.query(
        `SELECT COUNT(*)::int AS c FROM appointments
          WHERE appointment_dt::date = CURRENT_DATE`
      ),
      db.query("SELECT COALESCE(SUM(amount),0)::numeric AS s FROM billing WHERE status = 'PAID'"),
      db.query("SELECT COUNT(*)::int AS c FROM billing WHERE status = 'PENDING'"),
    ]);

    res.json({
      totalPatients: totalPatientsR.rows[0].c,
      totalDoctors:  totalDoctorsR.rows[0].c,
      totalNurses:   totalNursesR.rows[0].c,
      appointmentsToday: apptToday.rows[0].c,
      totalRevenue: Number(revenueR.rows[0].s),
      pendingBills: pendingBillsR.rows[0].c,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load dashboard.' });
  }
});

module.exports = router;
