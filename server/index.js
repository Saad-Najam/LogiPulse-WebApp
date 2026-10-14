const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
app.use(express.json());

app.use('/api', require('./routes/auth'));
app.use('/api', require('./routes/people'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/orders/:id/messages', require('./routes/messages'));

// Demo helper: restore seed data before a judging run.
app.post('/api/reset', (req, res) => {
  db.reset();
  res.json({ ok: true });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Last-resort error handler so a bad request never crashes the server.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.status === 400 ? 'Malformed request' : 'Server error' });
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`LogiPulse running on http://localhost:${PORT}`));
}

module.exports = app;
