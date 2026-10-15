import { AppError } from './errorHandler.js';

// validate(schema)          -> parses req.body
// validate(schema, 'query') -> parses req.query
// On failure: 400 VALIDATION_ERROR with per-field messages. On success req[source] is replaced by the cleaned data.
export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source] ?? {});
  if (!result.success) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', fields: result.error.flatten().fieldErrors });
  }
  req[source] = result.data;
  next();
};

// Route params like :id must be positive int4 values, otherwise Postgres would throw on the lookup.
export function parseId(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 2147483647) {
    throw new AppError('Invalid id', 400, 'VALIDATION_ERROR');
  }
  return n;
}
