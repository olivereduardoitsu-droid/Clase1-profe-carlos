// Error contract tests: the regression suite for INC-701, INC-702 and the
// central error handler.
//
// Each test answers one question about observable behaviour. Every created
// row is recorded by the helpers and removed by the cleanup — the seed and
// the student's own data are never touched.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import request from 'supertest';
import app from '../src/app.js';
import { pool } from '../src/database/pool.js';
import { createUser, createRequestAs } from './helpers/test-data.js';
import { loginAs } from './helpers/test-auth.js';
import { cleanupCreatedData, closePool } from './helpers/cleanup.js';

after(async () => {
  await cleanupCreatedData();
  await closePool();
});

// ------------------------------------------------- INC-701 regression

test('an alphabetic id answers 400 INVALID_REQUEST_ID, not 500', async () => {
  // Prepare: a registered user with a token.
  const user = await createUser({ name: 'inc701' });
  const token = await loginAs(user);

  // Act
  const response = await request(app)
    .get('/requests/not-a-number')
    .set('Authorization', `Bearer ${token}`);

  // Check: the status AND the code — a 400 with the wrong code would still
  // be a broken contract.
  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'INVALID_REQUEST_ID');
});

test('decimal, zero and negative ids are rejected the same way', async () => {
  // Prepare
  const user = await createUser({ name: 'inc701b' });
  const token = await loginAs(user);

  // '12abc' is the case that matters most: parseInt('12abc') returns 12, so
  // a naive parser would query a resource the client never asked for.
  for (const raw of ['1.5', '0', '-3', '12abc', '1e3', ' 12']) {
    // Act
    const response = await request(app)
      .get(`/requests/${encodeURIComponent(raw)}`)
      .set('Authorization', `Bearer ${token}`);

    // Check: every one of them is the same client mistake.
    assert.equal(response.status, 400, `expected 400 for "${raw}"`);
    assert.equal(response.body.error.code, 'INVALID_REQUEST_ID', `for "${raw}"`);
  }
});

test('a well-formed id that matches nothing still answers 404', async () => {
  // Prepare
  const user = await createUser({ name: 'inc701c' });
  const token = await loginAs(user);

  // Act
  const response = await request(app)
    .get('/requests/999999999')
    .set('Authorization', `Bearer ${token}`);

  // Check: the INC-701 fix must NOT change this. An invalid FORMAT and a
  // missing RESOURCE are different answers.
  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, 'REQUEST_NOT_FOUND');
});

// ------------------------------------------------- INC-702 regression

test('an invalid priority answers 400 INVALID_PRIORITY before touching SQL', async () => {
  // Prepare: an owner with a request, an agent with a token.
  const owner = await createUser({ name: 'inc702owner' });
  const agent = await createUser({ name: 'inc702agent', role: 'agent' });
  const ownerToken = await loginAs(owner);
  const agentToken = await loginAs(agent);
  const created = await createRequestAs(ownerToken);

  // Act
  const response = await request(app)
    .patch(`/requests/${created.id}`)
    .set('Authorization', `Bearer ${agentToken}`)
    .send({ priority: 'critical' });

  // Check
  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'INVALID_PRIORITY');
});

test('creation validates priority with the same rule as PATCH', async () => {
  // Prepare: POST must not be the way around the validation.
  const owner = await createUser({ name: 'inc702create' });
  const token = await loginAs(owner);

  // Act
  const response = await request(app)
    .post('/requests')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'prioridad inválida', priority: 'urgent' });

  // Check
  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'INVALID_PRIORITY');
});

test('the PostgreSQL CHECK constraint is still there as a second defense', async () => {
  // The application validating is the FIRST defense; this asserts the
  // SECOND one was not deleted to "fix" the 500. It fails if anyone drops
  // requests_priority_check, which the incident brief forbids.
  const result = await pool.query(
    `SELECT pg_get_constraintdef(oid) AS definition
       FROM pg_constraint
      WHERE conrelid = 'requests'::regclass AND conname = 'requests_priority_check'`
  );

  assert.equal(result.rowCount, 1, 'requests_priority_check no longer exists');
  assert.match(result.rows[0].definition, /low/);
  assert.match(result.rows[0].definition, /medium/);
  assert.match(result.rows[0].definition, /high/);
});

test('a valid priority change still works after the fix', async () => {
  // Prepare
  const owner = await createUser({ name: 'inc702ok' });
  const agent = await createUser({ name: 'inc702okagent', role: 'agent' });
  const ownerToken = await loginAs(owner);
  const agentToken = await loginAs(agent);
  const created = await createRequestAs(ownerToken, { priority: 'low' });

  // Act: the low -> high change the brief requires to keep working.
  const response = await request(app)
    .patch(`/requests/${created.id}`)
    .set('Authorization', `Bearer ${agentToken}`)
    .send({ priority: 'high' });

  // Check: a fix that breaks the valid case is not a fix.
  assert.equal(response.status, 200);
  assert.equal(response.body.priority, 'high');
});

// ------------------------------------------------- central error handler

test('an unexpected error answers a generic 500 without internal details', async () => {
  // Prepare: a failing dependency provoked WITHOUT touching the real
  // database — pool.query is swapped for the duration, then restored.
  const user = await createUser({ name: 'unexpected' });
  const token = await loginAs(user);
  const realQuery = pool.query.bind(pool);
  const failure = new Error('detalle interno que no debe viajar');
  pool.query = async () => { throw failure; };

  // Act
  let response;
  try {
    response = await request(app)
      .get('/requests')
      .set('Authorization', `Bearer ${token}`);
  } finally {
    pool.query = realQuery;
  }

  // Check: the controlled status and code...
  assert.equal(response.status, 500);
  assert.equal(response.body.error.code, 'INTERNAL_ERROR');
  // ...and none of the internal detail leaked into the response.
  assert.ok(!response.text.includes('detalle interno'), 'the internal message leaked');
  assert.ok(!/\bat \w+/.test(response.text), 'a stack frame leaked');
  assert.ok(!response.text.includes('node_modules'), 'a path leaked');
});

test('an unreachable database answers 503, not 500', async () => {
  // Prepare
  const user = await createUser({ name: 'infra' });
  const token = await loginAs(user);
  const realQuery = pool.query.bind(pool);
  pool.query = async () => {
    throw Object.assign(new Error('connection refused'), { code: 'ECONNREFUSED' });
  };

  // Act
  let response;
  try {
    response = await request(app)
      .get('/requests')
      .set('Authorization', `Bearer ${token}`);
  } finally {
    pool.query = realQuery;
  }

  // Check: the process is alive and its dependency is not — that is 503.
  assert.equal(response.status, 503);
  assert.equal(response.body.error.code, 'DATABASE_UNAVAILABLE');
});

test('a malformed JSON body answers 400 INVALID_JSON', async () => {
  // Act: the body is sent raw so express.json() is the one that fails.
  const response = await request(app)
    .post('/auth/login')
    .set('Content-Type', 'application/json')
    .send('{"email": ');

  // Check
  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'INVALID_JSON');
});

test('an unmatched route answers the same JSON contract, not an HTML page', async () => {
  // Act
  const response = await request(app).get('/no-existe/aqui');

  // Check
  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, 'ROUTE_NOT_FOUND');
  assert.match(response.headers['content-type'], /application\/json/);
});

test('every error body shares the same shape: error.code, error.message, requestId', async () => {
  // Prepare: one expected error and one unexpected one, to prove the shape
  // does not depend on which branch of the handler produced it.
  const user = await createUser({ name: 'shape' });
  const token = await loginAs(user);
  const realQuery = pool.query.bind(pool);

  // Act
  const expected = await request(app)
    .get('/requests/not-a-number')
    .set('Authorization', `Bearer ${token}`);

  pool.query = async () => { throw new Error('shape probe'); };
  let unexpected;
  try {
    unexpected = await request(app)
      .get('/requests')
      .set('Authorization', `Bearer ${token}`);
  } finally {
    pool.query = realQuery;
  }

  // Check
  for (const response of [expected, unexpected]) {
    assert.equal(typeof response.body.error.code, 'string');
    assert.equal(typeof response.body.error.message, 'string');
    assert.equal(typeof response.body.requestId, 'string');
    assert.ok(response.body.requestId.length > 0);
  }
});

test('one unexpected failure leaves one traceable log line', async () => {
  // Prepare: capture the console the way an operator would read it.
  const user = await createUser({ name: 'logs' });
  const token = await loginAs(user);
  const realQuery = pool.query.bind(pool);
  const realLog = console.log;
  const realError = console.error;
  const lines = [];
  console.log = (line) => lines.push(String(line));
  console.error = (line) => lines.push(String(line));
  pool.query = async () => { throw new Error('log probe'); };

  // Act
  let response;
  try {
    response = await request(app)
      .get('/requests')
      .set('Authorization', `Bearer ${token}`);
  } finally {
    pool.query = realQuery;
    console.log = realLog;
    console.error = realError;
  }
  // The request logger writes on 'finish', so give the event loop a turn.
  await sleep(80);

  // Check: the response is anonymous, the log is not — and both share the id.
  const entries = lines
    .map((line) => { try { return JSON.parse(line); } catch { return null; } })
    .filter(Boolean);
  const requestLine = entries.find((entry) => entry.requestId === response.body.requestId
    && entry.event === 'request_failed');
  assert.ok(requestLine, 'no request_failed log line carries the response requestId');
  assert.equal(requestLine.status, 500);
  assert.equal(requestLine.errorCode, 'INTERNAL_ERROR');
});
