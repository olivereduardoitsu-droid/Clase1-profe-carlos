// OPS-703 · Not-found middleware.
//
// Registered AFTER every route: it runs only when nothing matched, and it
// answers with the same JSON contract instead of Express's default HTML
// page. It forwards a TYPED error so the central handler produces the
// response — one translation, not two.
//
// The message is generic on purpose: echoing the requested path back would
// confirm which routes exist to whoever is probing the API.
import { AppError } from '../app-error.js';

export function notFound(req, res, next) {
  next(new AppError('resource', 'ROUTE_NOT_FOUND', 'The requested resource does not exist.'));
}
