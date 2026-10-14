import { config } from '../config.js';

// Throw for expected failures: throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND')
export class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

// Wrap async handlers so rejections reach errorHandler instead of crashing the process.
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const notFound = (req, res) => res.status(404).json({ error: 'NOT_FOUND', message: `${req.method} ${req.path} does not exist` });

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
  } else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    code = 'INVALID_JSON';
  } else if (err.type === 'entity.too.large') {
    statusCode = 413;
    code = 'PAYLOAD_TOO_LARGE';
  }

  if (statusCode >= 500 && !config.isTest) {
    console.error({ error: err.message, stack: err.stack, url: req.originalUrl, method: req.method, user: req.user?.id });
  }

  // Never leak internals: message is only included for expected errors or in development.
  const expose = err instanceof AppError || !config.isProd;
  res.status(statusCode).json({ error: code, message: expose ? err.message : undefined });
};
