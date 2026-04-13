/**
 * requireAuth(role?) — middleware factory
 * Returns 401 if no session, 403 if role mismatch.
 */
function requireAuth(role) {
  return function (req, res, next) {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (role && req.session.user.role !== role) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
}

module.exports = requireAuth;
