/**
 * Authentication & role-based access-control (RBAC) middleware.
 * Reference: NIST SP 800-162 (Hu et al., 2014) for RBAC.
 */
const jwt = require('jsonwebtoken');

/**
 * Verifies the JWT presented in the `Authorization: Bearer <token>` header
 * and attaches the decoded payload to `req.user`.
 */
function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or malformed Authorization header.' });
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;          //  { id, role, email, iat, exp }
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ message: 'Invalid token.' });
  }
}

/**
 * Higher-order middleware: pass the roles allowed to hit this route.
 * Example:  router.get('/admin/users', verifyToken, requireRole('ADMIN'), handler)
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient role.' });
    }
    return next();
  };
}

module.exports = { verifyToken, requireRole };
