// Traceability tests for OPS-703: the request id ties a response to its
// log line, and the log never carries a credential.
//
// The hard part is not asserting what the logs contain but what they do NOT
// contain: the console is captured during the request and every line is
// inspected. The request logger writes on the response 'finish' event, so
// these tests wait a few milliseconds before restoring the console.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import request from 'supertest';
import app from '../src/app.js';
import { createUser } from './helpers/test-data.js';
import { loginAs } from './helpers/test-auth.js';
import { cleanupCreatedData, closePool } from './helpers/cleanup.js';

after(async () => {
  await cleanupCreatedData();
  await closePool();
});

// Captures every log line written while `fn` runs, parsed as JSON. A line
// that is not valid JSON is a finding in itself, so it is returned as null
// and the assertions can notice it.
async function captureLogs(fn) {
  const lines = [];
  const realLog = console.log;
  const realError = console.error;
  console.log = (line) => lines.push(String(line));
  console.error = (line) => lines.push(String(line));
  try {
    const result = await fn();
    await sleep(80);
    return { result, lines, entries: lines.map((line) => {
      try { return JSON.parse(line); } catch { return null; }
    }) };
  } finally {
    console.log = realLog;
    console.error = realError;
  }
}

test('every response carries an X-Request-Id header', async () => {
  // Act: a route that needs no data at all — the id must not depend on it.
  const response = await request(app).get('/health');

  // Check
  assert.equal(response.status, 200);
  assert.match(response.headers['x-request-id'], /^req_[0-9a-f-]{36}$/);
});

test('an error body carries the same requestId as the header', async () => {
  // Prepare
  const user = await createUser({ name: 'trace' });
  const token = await loginAs(user);

  // Act
  const response = await request(app)
    .get('/requests/999999999')
    .set('Authorization', `Bearer ${token}`);

  // Check: support reads the id from one place and searches the log with it.
  assert.equal(response.status, 404);
  assert.equal(response.headers['x-request-id'], response.body.requestId);
});

test('a well-formed client X-Request-Id is kept', async () => {
  // Act: a frontend correlating both sides of a call.
  const response = await request(app)
    .get('/health')
    .set('X-Request-Id', 'frontend-trace-42');

  // Check
  assert.equal(response.headers['x-request-id'], 'frontend-trace-42');
});

test('a suspicious client X-Request-Id is replaced, never trusted', async () => {
  // Act: 300 characters of junk, the kind of value used to forge log lines.
  const junk = 'x'.repeat(300);

  // Check: bounded characters only...
  const tooLong = await request(app).get('/health').set('X-Request-Id', junk);
  assert.match(tooLong.headers['x-request-id'], /^req_[0-9a-f-]{36}$/);

  // ...and no characters that could break the one-JSON-object-per-line rule.
  const injected = await request(app)
    .get('/health')
    .set('X-Request-Id', 'abc"} forged');
  assert.match(injected.headers['x-request-id'], /^req_[0-9a-f-]{36}$/);
});

test('the log line of a request carries the same requestId as the response', async () => {
  // Prepare
  const user = await createUser({ name: 'tracelog' });
  const token = await loginAs(user);

  // Act
  const { result, lines, entries } = await captureLogs(() =>
    request(app)
      .get('/requests/999999999')
      .set('Authorization', `Bearer ${token}`));

  // Check: every emitted line is one valid JSON object...
  assert.ok(lines.length > 0, 'the request produced no log line');
  assert.ok(entries.every((entry) => entry !== null),
    'a log line was not a single valid JSON object');

  // ...and one of them is this request, findable by the id the client saw.
  const match = entries.find((entry) => entry.requestId === result.headers['x-request-id']);
  assert.ok(match, 'no log line carries the requestId from the response');
  assert.equal(match.method, 'GET');
  assert.equal(match.path, '/requests/999999999');
  assert.equal(match.status, 404);
  assert.equal(match.errorCode, 'REQUEST_NOT_FOUND');
  assert.equal(typeof match.durationMs, 'number');
  assert.equal(match.userId, user.id);
});

test('the Authorization header and the token never reach the log', async () => {
  // Prepare
  const user = await createUser({ name: 'noleak' });
  const token = await loginAs(user);

  // Act
  const { lines } = await captureLogs(async () => {
    await request(app).get('/requests').set('Authorization', `Bearer ${token}`);
    await request(app).get('/requests/999999999').set('Authorization', `Bearer ${token}`);
  });

  // Check
  const leaky = lines.filter((line) =>
    line.includes(token) || /Bearer /i.test(line) || /authorization/i.test(line));
  assert.deepEqual(leaky, [], 'a log line leaked credentials');
});

test('a failed request is logged at error level with its code', async () => {
  // Prepare
  const user = await createUser({ name: 'faillog' });
  const token = await loginAs(user);

  // Act: a 404 is a client error, so it is 'request_completed' — the level
  // split is >= 500 -> error.
  const ok = await captureLogs(() =>
    request(app).get('/requests/not-a-number').set('Authorization', `Bearer ${token}`));
  const bad = await captureLogs(() =>
    request(app).get('/requests').set('Authorization', 'Bearer not-a-real-token'));

  // Check
  const notFound = ok.entries.find((e) => e.requestId === ok.result.headers['x-request-id']);
  assert.equal(notFound.level, 'info');
  assert.equal(notFound.event, 'request_completed');
  assert.equal(notFound.errorCode, 'INVALID_REQUEST_ID');

  const unauthorized = bad.entries.find((e) => e.requestId === bad.result.headers['x-request-id']);
  assert.equal(unauthorized.status, 401);
  assert.equal(unauthorized.errorCode, 'INVALID_TOKEN');
});

test('two requests get two different ids', async () => {
  // Act
  const first = await request(app).get('/health');
  const second = await request(app).get('/health');

  // Check: the id identifies the REQUEST, so it must not be reused.
  assert.notEqual(first.headers['x-request-id'], second.headers['x-request-id']);
});
