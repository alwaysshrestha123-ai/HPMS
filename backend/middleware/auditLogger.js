/**
 * Simple async audit logger.
 * Writes a row to the audit_logs table; failures never block the request.
 */
const db = require('../config/db');

function logAudit(userId, action, resource, ipAddress) {
  db.query(
    'INSERT INTO audit_logs (user_id, action, resource, ip_address) VALUES ($1,$2,$3,$4)',
    [userId, action, resource, ipAddress]
  ).catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Audit log write failed:', err.message);
  });
}

module.exports = { logAudit };
