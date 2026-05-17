const jwt = require('jsonwebtoken');

function signToken(user, expiresIn = '24h') {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn }
  );
}

module.exports = { signToken };
