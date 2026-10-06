// HTTP layer of the auth module: extracts the body, invokes the service
// and translates results. No SQL, no cryptography, no token internals.
//
// No try/catch: Express 5 forwards the error to the central handler
// (src/middleware/error-handler.js), which owns the response contract.
import express from 'express';
import { register, login, getCurrentUser } from './auth.service.js';
import { authenticate } from '../../middleware/authenticate.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  res.status(201).json(await register(req.body));
});

router.post('/login', async (req, res) => {
  res.json(await login(req.body));
});

// /auth/me is protected: it answers "who does the server think I am?".
router.get('/me', authenticate, async (req, res) => {
  res.json(await getCurrentUser(req.auth));
});

export default router;
