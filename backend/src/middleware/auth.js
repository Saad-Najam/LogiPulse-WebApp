import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export const signToken = (account, role) =>
  jwt.sign({ id: account.id, role, name: account.name, email: account.email }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });

export function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret); // { id, role, name, email, iat, exp }
}

// Verifies the Bearer token and attaches the payload to req.user.
export const requireAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'MISSING_TOKEN' });
  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch (err) {
    res.status(401).json({ error: err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN' });
  }
};

// Use after requireAuth: requireRole('rider'), requireRole('user', 'rider') ...
export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'FORBIDDEN' });
  next();
};
