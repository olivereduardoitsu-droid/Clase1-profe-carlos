// HTTP layer of the requests module: it extracts path, query, body and
// the authenticated actor, invokes the operation, and translates results
// into HTTP responses. It contains no SQL and no domain rules. The router
// assumes app.js mounted it behind `authenticate`, so req.auth is always
// present here.
//
// No try/catch: Express 5 forwards a thrown error and a rejected promise
// to the central error handler (src/middleware/error-handler.js). Repeating
// the translation in every route was exactly the duplication OPS-703 removes.

import express from 'express';
import {
  listRequests,
  getRequest,
  createRequest,
  patchRequest,
  getHistory
} from './requests.service.js';
import { AppError } from '../../app-error.js';

const router = express.Router();

// INC-701 · The path parameter is CLIENT input, and it is validated as a
// COMPLETE value before any SQL runs.
//   - an anchored pattern, not parseInt: parseInt('12abc') is 12, so a
//     malformed id would silently query a resource nobody asked for;
//   - 19 digits max: the column is a bigint and Number() would lose
//     precision beyond Number.MAX_SAFE_INTEGER;
//   - zero and negatives are rejected too — they can never identify a
//     resource created by this database (the sequence starts at 1).
const POSITIVE_BIGINT = /^[1-9][0-9]{0,18}$/;

function requestIdFrom(raw) {
  if (typeof raw !== 'string' || !POSITIVE_BIGINT.test(raw)) {
    throw new AppError('contract', 'INVALID_REQUEST_ID',
      'Request id must be a positive integer.');
  }
  return Number(raw);
}

router.get('/', async (req, res) => {
  const { status, priority } = req.query;
  res.json(await listRequests(req.auth, { status, priority }));
});

router.get('/:id', async (req, res) => {
  res.json(await getRequest(req.auth, requestIdFrom(req.params.id)));
});

router.get('/:id/history', async (req, res) => {
  res.json(await getHistory(req.auth, requestIdFrom(req.params.id)));
});

router.post('/', async (req, res) => {
  res.status(201).json(await createRequest(req.auth, req.body));
});

router.patch('/:id', async (req, res) => {
  res.json(await patchRequest(req.auth, requestIdFrom(req.params.id), req.body));
});

export default router;
