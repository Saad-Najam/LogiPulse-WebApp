const express = require('express');
const db = require('../db');

const router = express.Router();

// Simple credential check per role (no OAuth - hackathon scope).
const ADMIN = { id: 0, name: 'Operations Admin', email: 'admin@logipulse.com', password: 'admin123' };

router.post('/login', (req, res) => {
  const { role, email, password } = req.body || {};
  const e = String(email || '').trim().toLowerCase();

  let account = null;
  if (role === 'user') account = db.data.users.find((u) => u.email === e);
  else if (role === 'rider') account = db.data.riders.find((r) => r.email === e);
  else if (role === 'admin') account = e === ADMIN.email ? ADMIN : null;
  else return res.status(400).json({ error: 'Unknown role' });

  if (!account || account.password !== password) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  res.json({ role, id: account.id, name: account.name, email: account.email });
});

// Self-registration for customers.
router.post('/register', (req, res) => {
  const { name, email, password } = req.body || {};
  const e = String(email || '').trim().toLowerCase();
  if (!name || !e || !password) return res.status(400).json({ error: 'Name, email and password are required' });
  if (db.data.users.some((u) => u.email === e)) return res.status(409).json({ error: 'Email already registered' });

  const user = { id: db.nextId('users'), name: String(name).trim(), email: e, password, created_at: db.now() };
  db.data.users.push(user);
  db.save();
  res.status(201).json({ role: 'user', id: user.id, name: user.name, email: user.email });
});

module.exports = router;
