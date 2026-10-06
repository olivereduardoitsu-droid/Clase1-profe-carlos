// API tests for FEATURE-801. Each scenario uses unique test data and cleanup.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { createUser, createRequestAs } from './helpers/test-data.js';
import { loginAs } from './helpers/test-auth.js';
import { cleanupCreatedData, closePool } from './helpers/cleanup.js';

after(async () => {
  await cleanupCreatedData();
  await closePool();
});

test('claim requires authentication', async () => {
  const owner = await createUser({ name: 'claim-auth' });
  const token = await loginAs(owner);
  const created = await createRequestAs(token);

  const response = await request(app).post(`/requests/${created.id}/claim`);

  assert.equal(response.status, 401);
});

test('a requester cannot claim a request', async () => {
  const owner = await createUser({ name: 'claim-requester' });
  const token = await loginAs(owner);
  const created = await createRequestAs(token);

  const response = await request(app)
    .post(`/requests/${created.id}/claim`)
    .set('Authorization', `Bearer ${token}`);

  assert.equal(response.status, 403);
});

test('an agent claims an open request using the authenticated identity', async () => {
  const owner = await createUser({ name: 'claim-owner' });
  const agent = await createUser({ name: 'claim-agent', role: 'agent' });
  const ownerToken = await loginAs(owner);
  const agentToken = await loginAs(agent);
  const created = await createRequestAs(ownerToken);

  const response = await request(app)
    .post(`/requests/${created.id}/claim`)
    .set('Authorization', `Bearer ${agentToken}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.assignedTo, agent.id);
  assert.equal(response.body.status, 'in_progress');
  assert.ok(new Date(response.body.updatedAt) > new Date(created.updatedAt));
});

test('claiming a nonexistent request answers 404', async () => {
  const agent = await createUser({ name: 'claim-missing', role: 'agent' });
  const token = await loginAs(agent);

  const response = await request(app)
    .post('/requests/999999999/claim')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(response.status, 404);
  assert.equal(response.body.error.code, 'REQUEST_NOT_FOUND');
});

test('a second claim answers 409 REQUEST_ALREADY_ASSIGNED with requestId', async () => {
  const owner = await createUser({ name: 'claim-twice-owner' });
  const agent = await createUser({ name: 'claim-twice-agent', role: 'agent' });
  const ownerToken = await loginAs(owner);
  const agentToken = await loginAs(agent);
  const created = await createRequestAs(ownerToken);

  await request(app).post(`/requests/${created.id}/claim`)
    .set('Authorization', `Bearer ${agentToken}`);
  const response = await request(app).post(`/requests/${created.id}/claim`)
    .set('Authorization', `Bearer ${agentToken}`);

  assert.equal(response.status, 409);
  assert.equal(response.body.error.code, 'REQUEST_ALREADY_ASSIGNED');
  assert.equal(typeof response.body.requestId, 'string');
});

test('a terminal request cannot be claimed', async () => {
  const owner = await createUser({ name: 'claim-terminal-owner' });
  const agent = await createUser({ name: 'claim-terminal-agent', role: 'agent' });
  const ownerToken = await loginAs(owner);
  const agentToken = await loginAs(agent);
  const created = await createRequestAs(ownerToken);

  const cancelled = await request(app).patch(`/requests/${created.id}`)
    .set('Authorization', `Bearer ${agentToken}`)
    .send({ status: 'cancelled' });
  assert.equal(cancelled.status, 200);

  const response = await request(app).post(`/requests/${created.id}/claim`)
    .set('Authorization', `Bearer ${agentToken}`);

  assert.equal(response.status, 409);
});

test('assignedTo in the body is rejected as a server-controlled field', async () => {
  const owner = await createUser({ name: 'claim-body-owner' });
  const agent = await createUser({ name: 'claim-body-agent', role: 'agent' });
  const ownerToken = await loginAs(owner);
  const agentToken = await loginAs(agent);
  const created = await createRequestAs(ownerToken);

  const response = await request(app).post(`/requests/${created.id}/claim`)
    .set('Authorization', `Bearer ${agentToken}`)
    .send({ assignedTo: owner.id });

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'SERVER_CONTROLLED_FIELD');
});

test('the claim leaves a request_claimed event in the history', async () => {
  const owner = await createUser({ name: 'claim-history-owner' });
  const agent = await createUser({ name: 'claim-history-agent', role: 'agent' });
  const ownerToken = await loginAs(owner);
  const agentToken = await loginAs(agent);
  const created = await createRequestAs(ownerToken);

  await request(app).post(`/requests/${created.id}/claim`)
    .set('Authorization', `Bearer ${agentToken}`);
  const response = await request(app).get(`/requests/${created.id}/history`)
    .set('Authorization', `Bearer ${ownerToken}`);
  const event = response.body.find((entry) => entry.type === 'request_claimed');

  assert.equal(response.status, 200);
  assert.ok(event);
  assert.equal(event.fromStatus, 'open');
  assert.equal(event.toStatus, 'in_progress');
});
