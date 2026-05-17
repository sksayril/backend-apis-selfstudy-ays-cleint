const auth = require('./auth');
const User = require('../models/user.model');

async function requireAdmin(req, res, next) {
  try {
    let role = req.user?.role;
    if (!role && req.user?.id) {
      const user = await User.findById(req.user.id).select('role email');
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      role = user.role;
      req.user.role = role;
      req.user.email = user.email;
    }
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}

module.exports = [auth, requireAdmin];
