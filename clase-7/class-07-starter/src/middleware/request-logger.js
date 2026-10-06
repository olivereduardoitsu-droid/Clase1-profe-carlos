// OPS-703 · Request logger middleware.
//
// ONE structured JSON line per FINISHED request, whatever its outcome.
// The logger module (src/logging/logger.js) formats and writes the line;
// this middleware decides WHEN and WHICH fields.
//
// The field list is an explicit ALLOWLIST. Logging the request object (or
// `req.headers`) would put Authorization, cookies and bodies into the log —
// a leaked token in a log is a live credential. Choosing field by field is
// what makes "the log cannot leak" a property of this code instead of a
// promise.
import { logger } from '../logging/logger.js';

export function requestLogger(req, res, next) {
  // Monotonic time: Date.now() can jump when the system clock is adjusted.
  const startedAt = process.hrtime.bigint();

  // 'finish' is the only moment the final status code is known.
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;

    const fields = {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100
    };
    // The actor id is safe (it is not a credential) and turns a log line
    // into something support can answer "who was affected?" with.
    if (req.auth?.userId) fields.userId = req.auth.userId;
    // Set by the error handler, so a failed request is searchable by code.
    if (res.locals.errorCode) fields.errorCode = res.locals.errorCode;

    if (res.statusCode >= 500) {
      logger.error('request_failed', fields);
    } else {
      logger.info('request_completed', fields);
    }
  });

  // Logging must never delay the request: the work happens on 'finish'.
  next();
}
