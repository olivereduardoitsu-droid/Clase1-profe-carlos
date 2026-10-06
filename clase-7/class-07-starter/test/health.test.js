// Health and readiness tests for OPS-703.
//
// The interesting case is "/ready when the database is down" WITHOUT
// touching the real credentials: createHealthRouter accepts an injectable
// checkDatabase function, so a test can mount it on a tiny throwaway
// express() app and hand it a check that always fails.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import app from '../src/app.js';
import { pool } from '../src/database/pool.js';
import { createHealthRouter } from '../src/routes/health.routes.js';
import { cleanupCreatedData, closePool } from './helpers/cleanup.js';

after(async () => {
  await cleanupCreatedData();
  await closePool();
});

function appWithFailingCheck(error) {
  const throwaway = express();
  throwaway.use(createHealthRouter({ checkDatabase: async () => { throw error; } }));
  return throwaway;
}

test('GET /health answers 200 ok without touching PostgreSQL', async () => {
  // Prepare: sabotage pool.query for the duration of the request.
  const realQuery = pool.query.bind(pool);
  pool.query = async () => { throw new Error('the database is down'); };

  // Act
  let response;
  try {
    response = await request(app).get('/health');
  } finally {
    pool.query = realQuery;
  }

  // Check: liveness is about THIS process. A database outage must not make
  // an orchestrator restart a perfectly healthy process.
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: 'ok' });
});

test('GET /ready answers 200 when PostgreSQL responds', async () => {
  // Act: the default check is the real SELECT 1 through the shared pool.
  const response = await request(app).get('/ready');

  // Check
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: 'ready', database: 'available' });
});

test('GET /ready answers 503 when the database check fails', async () => {
  // Prepare
  const unreachable = appWithFailingCheck(
    Object.assign(new Error('connection refused'), { code: 'ECONNREFUSED' }));

  // Act
  const response = await request(unreachable).get('/ready');

  // Check: a controlled 503, not a crash — and not an unexpected 500.
  assert.equal(response.status, 503);
  assert.equal(response.body.status, 'not_ready');
  assert.equal(response.body.database, 'unavailable');
});

test('the readiness response never reveals connection details', async () => {
  // Prepare: the injected check fails with a message full of internals.
  const internals = 'connect ECONNREFUSED 10.0.0.7:5432 db.abc.supabase.co (postgres.abc) SELECT 1';
  const throwaway = appWithFailingCheck(new Error(internals));

  // Act
  const response = await request(throwaway).get('/ready');

  // Check: the client learns that it must not be routed here, and nothing
  // else — no host, port, user or SQL.
  assert.equal(response.status, 503);
  for (const secret of ['10.0.0.7', '5432', 'supabase', 'postgres', 'SELECT', 'ECONNREFUSED']) {
    assert.ok(!response.text.includes(secret), `the readiness response leaked "${secret}"`);
  }
});

test('/health still answers 200 on an app whose check always fails', async () => {
  // Prepare: the injected check is irrelevant to liveness by construction.
  const throwaway = appWithFailingCheck(new Error('down'));

  // Act
  const response = await request(throwaway).get('/health');

  // Check
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: 'ok' });
});

test('the operational endpoints answer without a token', async () => {
  // Act: a monitor has no identity, so neither endpoint may require one.
  const health = await request(app).get('/health');
  const ready = await request(app).get('/ready');

  // Check
  assert.equal(health.status, 200);
  assert.equal(ready.status, 200);
});
