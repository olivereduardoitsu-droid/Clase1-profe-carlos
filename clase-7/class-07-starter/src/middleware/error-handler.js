// OPS-703 · Central error middleware.
//
// ONE place where an error becomes an HTTP response, replacing the
// try/catch repeated inside every route. Express 5 forwards thrown errors
// and rejected promises here on its own.
//
// Express recognizes an error middleware because it declares EXACTLY four
// parameters. Do not remove any of them, even if unused.
// Reference: https://expressjs.com/en/guide/error-handling/
//
// Registered LAST in app.js: an error middleware only sees what already ran.
import { AppError } from '../app-error.js';
import { logger } from '../logging/logger.js';

// The typed error category is the contract's answer, shared by every module
// since class 05.
const CATEGORY_STATUS = {
  contract: 400,
  auth: 401,
  forbidden: 403,
  resource: 404,
  domain: 409
};

// Errors whose cause is the data store being unreachable -> 503.
const INFRASTRUCTURE_CODES = ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'EAI_AGAIN', '57P03'];

// Every error response leaves through here: same shape, and the requestId
// that ties the answer to its log line. res.locals.errorCode is what lets
// the request logger report the code without knowing any of this.
function fail(req, res, status, code, message) {
  res.locals.errorCode = code;
  return res.status(status).json({
    error: { code, message },
    requestId: req.requestId
  });
}

export function errorHandler(error, req, res, next) {
  // The response already started: the status line and the headers are gone,
  // so nothing can be rewritten into the contract. Delegate to Express,
  // which destroys the connection so the client does not read a truncated
  // body as a success.
  if (res.headersSent) {
    return next(error);
  }

  // EXPECTED: the client broke the contract. Its own message is public.
  if (error instanceof AppError) {
    return fail(req, res, CATEGORY_STATUS[error.category] ?? 500, error.code, error.message);
  }

  // The body could not be parsed: still the client's mistake, not ours.
  if (error.type === 'entity.parse.failed') {
    return fail(req, res, 400, 'INVALID_JSON', 'The request body is not valid JSON.');
  }

  // EXPECTED and operational: the process is alive, its dependency is not.
  // Enough to diagnose — never the connection string.
  if (INFRASTRUCTURE_CODES.includes(error.code) || /Connection terminated/i.test(error.message ?? '')) {
    logger.error('database_unavailable', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      reason: error.code ?? 'unknown'
    });
    return fail(req, res, 503, 'DATABASE_UNAVAILABLE',
      'The service cannot access its data store.');
  }

  // UNEXPECTED: nobody designed this answer, so it says nothing. The name,
  // the message and the stack belong to whoever reads the log.
  logger.error('unhandled_error', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    errorName: error.name,
    errorMessage: error.message,
    stack: error.stack
  });
  return fail(req, res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred.');
}
