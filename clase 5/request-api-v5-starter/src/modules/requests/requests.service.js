// ============================================================================
// STARTER NOTE — Stations 6 and 7 evolve this file. It arrives working
// exactly as in class 04 (with AppError now imported from the shared
// src/app-error.js). Target changes:
//
//   * every exported operation receives the actor first:
//       listRequests(actor, filters) · getRequest(actor, id)
//       createRequest(actor, input) · patchRequest(actor, id, body)
//       getHistory(actor, id)
//   * reject server-controlled fields explicitly (400 SERVER_CONTROLLED_FIELD):
//       id, createdBy, createdAt, updatedAt, changedBy — and status on POST;
//   * createRequest: createdBy = actor.userId (never from the body); the
//     birth history records the creator as changed_by;
//   * listRequests: requester -> scope with { createdBy: actor.userId } in
//     the store call; agent -> everything;
//   * getRequest/getHistory: a foreign request answers the SAME 404 as a
//     missing one (do not reveal existence);
//   * patchRequest: apply the policy BEFORE writing, all-or-nothing (a
//     mixed body with a forbidden field changes NOTHING -> 403), and pass
//     actor.userId as changedBy to insertStatusHistory;
//   * the class 3-4 rules stay: terminal states and transitions keep
//     answering 409 — for every role.
//
// New error categories available: AppError('forbidden', 'FORBIDDEN', ...)
// -> 403. See src/app-error.js.
// ============================================================================

import { withTransaction } from '../../database/transaction.js';
import {
  findAll,
  findById,
  insertRequest,
  updateRequest,
  insertStatusHistory,
  findHistory
} from './requests.store.js';
import { mapRequestRow, mapHistoryRow } from './request.mapper.js';
import { STATUSES, isValidStatus, isTerminal, canTransition } from './request-status.js';
import { AppError } from '../../app-error.js';

const PRIORITIES = ['low', 'medium', 'high'];
const UPDATABLE_FIELDS = ['title', 'description', 'priority', 'status'];

function assertValidPriority(priority) {
  if (!PRIORITIES.includes(priority)) {
    throw new AppError('contract', 'INVALID_PRIORITY',
      `Unknown priority "${priority}". Valid values: ${PRIORITIES.join(', ')}.`);
  }
}

export async function listRequests(filters) {
  if (filters.status !== undefined && !isValidStatus(filters.status)) {
    throw new AppError('contract', 'INVALID_FILTER',
      `Unknown status "${filters.status}". Valid values: ${STATUSES.join(', ')}.`);
  }
  if (filters.priority !== undefined && !PRIORITIES.includes(filters.priority)) {
    throw new AppError('contract', 'INVALID_FILTER',
      `Unknown priority "${filters.priority}". Valid values: ${PRIORITIES.join(', ')}.`);
  }
  const rows = await findAll(filters);
  return rows.map(mapRequestRow);
}

export async function getRequest(id) {
  const row = await findById(id);
  if (!row) {
    throw new AppError('resource', 'REQUEST_NOT_FOUND', `Request ${id} does not exist.`);
  }
  return mapRequestRow(row);
}

export async function createRequest(input) {
  const { title, description, priority } = input ?? {};

  if (typeof title !== 'string' || title.trim() === '') {
    throw new AppError('contract', 'TITLE_REQUIRED', 'A request needs a non-empty title.');
  }
  if (priority !== undefined) assertValidPriority(priority);

  // Creation is a unit of work: the request AND its birth history
  // (NULL -> open) happen together or not at all.
  const row = await withTransaction(async (client) => {
    const created = await insertRequest({
      title: title.trim(),
      description: typeof description === 'string' ? description : null,
      priority: priority ?? 'medium'
    }, client);
    await insertStatusHistory(created.id, null, created.status, client);
    return created;
  });

  return mapRequestRow(row);
}

export async function patchRequest(id, body) {
  const changes = {};
  for (const field of UPDATABLE_FIELDS) {
    if (body?.[field] !== undefined) changes[field] = body[field];
  }

  if (Object.keys(changes).length === 0) {
    throw new AppError('contract', 'NO_UPDATABLE_FIELDS',
      `The body must include at least one of: ${UPDATABLE_FIELDS.join(', ')}.`);
  }
  if (changes.title !== undefined && (typeof changes.title !== 'string' || changes.title.trim() === '')) {
    throw new AppError('contract', 'TITLE_REQUIRED', 'The title cannot be empty.');
  }
  if (changes.priority !== undefined) assertValidPriority(changes.priority);
  if (changes.status !== undefined && !isValidStatus(changes.status)) {
    throw new AppError('contract', 'INVALID_STATUS',
      `Unknown status "${changes.status}". Valid values: ${STATUSES.join(', ')}.`);
  }
  if (changes.title !== undefined) changes.title = changes.title.trim();

  // Read, validate against the current state, write and record history —
  // all with the same client, as one unit of work.
  const row = await withTransaction(async (client) => {
    const current = await findById(id, client);
    if (!current) {
      throw new AppError('resource', 'REQUEST_NOT_FOUND', `Request ${id} does not exist.`);
    }

    if (isTerminal(current.status)) {
      throw new AppError('domain', 'REQUEST_IN_TERMINAL_STATUS',
        `Request ${id} is ${current.status} and can no longer be modified.`);
    }

    const statusChanges = changes.status !== undefined && changes.status !== current.status;
    if (statusChanges && !canTransition(current.status, changes.status)) {
      throw new AppError('domain', 'INVALID_STATUS_TRANSITION',
        `A request cannot move from ${current.status} to ${changes.status}.`);
    }

    const updated = await updateRequest(id, changes, client);
    if (statusChanges) {
      await insertStatusHistory(id, current.status, changes.status, client);
    }
    return updated;
  });

  return mapRequestRow(row);
}

export async function getHistory(id) {
  const request = await findById(id);
  if (!request) {
    throw new AppError('resource', 'REQUEST_NOT_FOUND', `Request ${id} does not exist.`);
  }
  const rows = await findHistory(id);
  return rows.map(mapHistoryRow);
}
