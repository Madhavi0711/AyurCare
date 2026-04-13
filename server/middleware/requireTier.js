/**
 * requireTier(minTier) — middleware factory
 * Tiers in ascending order: free < gold < platinum
 * Returns 403 with upgrade_required if user's tier is below minTier.
 */
const TIER_RANK = { free: 0, gold: 1, platinum: 2 };

function requireTier(minTier) {
  return function (req, res, next) {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const userTier = req.session.user.membership_tier || 'free';
    if ((TIER_RANK[userTier] || 0) < (TIER_RANK[minTier] || 0)) {
      return res.status(403).json({
        error: 'upgrade_required',
        required_tier: minTier,
        current_tier: userTier,
        message: `Upgrade to ${minTier.charAt(0).toUpperCase() + minTier.slice(1)} to access this feature.`
      });
    }
    next();
  };
}

module.exports = requireTier;
