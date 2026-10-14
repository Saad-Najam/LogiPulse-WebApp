import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../db.js';
import { config } from '../config.js';
import { ROLE_TABLE } from '../lib/constants.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { validate } from '../middleware/validate.js';
import { authLimiter, registerLimiter } from '../middleware/rateLimiter.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1).max(100),
  role: z.enum(['user', 'rider', 'admin']),
});

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(100),
  role: z.enum(['user', 'rider']), // admins are pre-created, never self-registered
});

// Compared against when the email is unknown so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 4);

const publicUser = (account, role) => ({ id: account.id, name: account.name, email: account.email, role });

router.post('/login', authLimiter, validate(loginSchema), asyncHandler(async (req, res) => {
  const { email, password, role } = req.body;
  const { rows } = await query(`SELECT * FROM ${ROLE_TABLE[role]} WHERE email = $1`, [email]);
  const account = rows[0];
  const ok = await bcrypt.compare(password, account ? account.password_hash : DUMMY_HASH);
  if (!account || !ok) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  res.json({ token: signToken(account, role), user: publicUser(account, role) });
}));

router.post('/register', registerLimiter, validate(registerSchema), asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const hash = await bcrypt.hash(password, Math.max(config.bcryptRounds, 10));
  try {
    const { rows } = await query(
      `INSERT INTO ${ROLE_TABLE[role]} (name, email, password_hash) VALUES ($1,$2,$3) RETURNING id, name, email`,
      [name, email, hash],
    );
    res.status(201).json({ token: signToken(rows[0], role), user: publicUser(rows[0], role) });
  } catch (err) {
    if (err.code === '23505') throw new AppError('Email already registered', 409, 'EMAIL_ALREADY_EXISTS');
    throw err;
  }
}));

// JWTs are stateless: the client discards its token. (Production would add a revocation list.)
router.post('/logout', requireAuth, (req, res) => res.json({ ok: true }));

router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const { id, role } = req.user;
  const { rows } = await query(`SELECT id, name, email, created_at FROM ${ROLE_TABLE[role]} WHERE id = $1`, [id]);
  if (!rows[0]) throw new AppError('Account no longer exists', 404, 'USER_NOT_FOUND');
  res.json({ ...rows[0], role });
}));

export default router;
