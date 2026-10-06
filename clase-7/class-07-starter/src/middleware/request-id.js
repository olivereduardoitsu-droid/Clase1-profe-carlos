// OPS-703 · Request ID middleware.
//
// ONE identifier per REQUEST travels with it: into the logs, into every
// error body, and back to the client in X-Request-Id. It identifies the
// request, not the user — and it is not a secret.
//
// A client MAY send its own trace id so a frontend can correlate both
// sides, but only in a boring, bounded shape. A header is untrusted input:
// echoing arbitrary text into every log line is how log injection and log
// forging happen, so anything outside this format is replaced instead of
// trusted.
import { randomUUID } from 'node:crypto';

const ACCEPTABLE_CLIENT_ID = /^[A-Za-z0-9._-]{1,64}$/;

export function requestId(req, res, next) {
  const provided = req.headers['x-request-id'];

  req.requestId = typeof provided === 'string' && ACCEPTABLE_CLIENT_ID.test(provided)
    ? provided
    : `req_${randomUUID()}`;

  res.set('X-Request-Id', req.requestId);
  next();
}
