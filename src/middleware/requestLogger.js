import { config } from '../config.js';

// One line per API request: "PATCH /api/orders/12/accept 200 14ms rider:3". Handy in Render's log view.
export const requestLogger = (req, res, next) => {
  if (config.isTest) return next();
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const who = req.user ? ` ${req.user.role}:${req.user.id}` : '';
    console.log(`${req.method} ${req.originalUrl.split('?')[0]} ${res.statusCode} ${ms.toFixed(0)}ms${who}`);
  });
  next();
};
