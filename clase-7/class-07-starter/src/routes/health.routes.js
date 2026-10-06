// OPS-703 · Operational endpoints.
//
// Two DIFFERENT questions:
//   GET /health  "Is the process alive?"        -> never touches PostgreSQL
//   GET /ready   "Can it do useful work now?"   -> checks PostgreSQL cheaply
// Reference: https://expressjs.com/en/advanced/healthcheck-graceful-shutdown/
//
// They are separate because they have different consumers: an orchestrator
// restarts a process that fails /health, and it only ADDS traffic to a
// process that passes /ready. If /health depended on PostgreSQL, a database
// blip would restart every healthy process at once.
import express from 'express';
import { pool } from '../database/pool.js';
import { logger } from '../logging/logger.js';

export function createHealthRouter({ checkDatabase } = {}) {
  const router = express.Router();

  // Liveness. Deliberately no I/O: this answers about THIS process only.
  router.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // Readiness needs a real check. It is INJECTABLE so a test can hand in a
  // failing one without touching the real credentials — and the default is
  // the cheapest possible real query through the shared pool.
  const check = checkDatabase ?? (() => pool.query('SELECT 1'));

  router.get('/ready', async (req, res) => {
    try {
      await check();
      res.status(200).json({ status: 'ready', database: 'available' });
    } catch (error) {
      // A failing readiness check is an EXPECTED 503, not an unexpected
      // 500: the process is fine, its dependency is not. The reason goes to
      // the log; the body reveals no host, port, user or SQL.
      logger.error('readiness_check_failed', {
        requestId: req.requestId,
        reason: error.code ?? error.name
      });
      res.locals.errorCode = 'DATABASE_UNAVAILABLE';
      res.status(503).json({
        status: 'not_ready',
        database: 'unavailable',
        requestId: req.requestId
      });
    }
  });

  return router;
}

export const healthRoutes = createHealthRouter();
