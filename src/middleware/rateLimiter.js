import rateLimit from 'express-rate-limit';
import { config } from '../config.js';

const make = (opts, error) =>
  rateLimit({
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => config.rateLimitDisabled,
    message: { error },
    ...opts,
  });

// Per-user limiters run after requireAuth, so req.user is set; fall back to IP otherwise.
const byUser = (req) => String(req.user?.id ?? req.ip);
const byUserAndRole = (req) => (req.user ? `${req.user.role}:${req.user.id}` : req.ip);

export const globalLimiter = make({ windowMs: 60_000, max: 200 }, 'TOO_MANY_REQUESTS');
// Brute-force protection: only failed logins count.
export const authLimiter = make({ windowMs: 15 * 60_000, max: 10, skipSuccessfulRequests: true }, 'TOO_MANY_LOGIN_ATTEMPTS');
// Stops mass account creation: 20 sign-ups per hour per IP.
export const registerLimiter = make({ windowMs: 60 * 60_000, max: 20 }, 'TOO_MANY_REGISTRATIONS');
export const createOrderLimiter = make({ windowMs: 60_000, max: 20, keyGenerator: byUser }, 'ORDER_RATE_LIMIT');
export const messageLimiter = make({ windowMs: 60_000, max: 30, keyGenerator: byUserAndRole }, 'MESSAGE_RATE_LIMIT');
export const locationLimiter = make({ windowMs: 60_000, max: 60, keyGenerator: byUser }, 'LOCATION_RATE_LIMIT');
