const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // HARUS 'failed'
    return res.status(401).json({ status: 'failed', message: 'Authentication token missing or invalid' });
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_KEY || 'rahasia');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ status: 'failed', message: 'Invalid or expired token' });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ status: 'failed', message: 'Forbidden' });
    }
    next();
  };
};

module.exports = { authMiddleware, authorizeRoles };