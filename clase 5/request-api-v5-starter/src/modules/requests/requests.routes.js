// ============================================================================
// STARTER NOTE — Station 6 touches this file lightly. It arrives as in
// class 04, with one plumbing change already made: respondError now lives
// in the shared src/http/respond-error.js (auth and middleware use it too).
//
// Target change: once app.js protects this router with `authenticate`
// (station 5), every handler passes req.auth as the FIRST argument to the
// service operations: listRequests(req.auth, {...}), getRequest(req.auth,
// id), createRequest(req.auth, req.body), patchRequest(req.auth, id,
// req.body), getHistory(req.auth, id).
// ============================================================================

import express from 'express';
import {
  listRequests,
  getRequest,
  createRequest,
  patchRequest,
  getHistory
} from './requests.service.js';
import { respondError } from '../../http/respond-error.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { status, priority } = req.query;
    res.status(200).json(await listRequests({ status, priority }));
  } catch (error) {
    respondError(res, error);
  }
});

router.get('/:id', async (req, res) => {
  try {
    res.status(200).json(await getRequest(Number(req.params.id)));
  } catch (error) {
    respondError(res, error);
  }
});

router.get('/:id/history', async (req, res) => {
  try {
    res.status(200).json(await getHistory(Number(req.params.id)));
  } catch (error) {
    respondError(res, error);
  }
});

router.post('/', async (req, res) => {
  try {
    res.status(201).json(await createRequest(req.body));
  } catch (error) {
    respondError(res, error);
  }
});

router.patch('/:id', async (req, res) => {
  try {
    res.status(200).json(await patchRequest(Number(req.params.id), req.body));
  } catch (error) {
    respondError(res, error);
  }
});

export default router;
