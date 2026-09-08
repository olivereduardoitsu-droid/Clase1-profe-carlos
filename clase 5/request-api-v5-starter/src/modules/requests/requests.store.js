// ============================================================================
// STARTER NOTE — Station 6 evolves this file. It arrives exactly as your
// class 04 delivery left it. Target changes:
//
//   * add created_by to the selected columns (migration 004 already ran);
//   * findAll: accept filters.createdBy and add `created_by = $n` to the
//     WHERE — the ownership scope lives in SQL, not in JavaScript;
//   * insertRequest: receive createdBy and include it in the INSERT
//     (the service passes the authenticated actor, never the body);
//   * insertStatusHistory: receive changedBy as a new parameter and write
//     the changed_by column (migration 005);
//   * findHistory: also select changed_by.
// ============================================================================

import { pool } from '../../database/pool.js';

const REQUEST_COLUMNS = `
  id,
  title,
  description,
  priority,
  status,
  created_at,
  updated_at
`;

export async function findAll(filters = {}, db = pool) {
  // Values are parameterized; column names come from this file only —
  // identifiers are never derived from client input.
  const conditions = [];
  const values = [];

  if (filters.status) {
    values.push(filters.status);
    conditions.push(`status = $${values.length}`);
  }
  if (filters.priority) {
    values.push(filters.priority);
    conditions.push(`priority = $${values.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await db.query(
    `SELECT ${REQUEST_COLUMNS} FROM requests ${where} ORDER BY id`,
    values
  );
  return result.rows;
}

export async function findById(id, db = pool) {
  const result = await db.query(
    `SELECT ${REQUEST_COLUMNS} FROM requests WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function insertRequest({ title, description, priority }, db = pool) {
  // The database generates id, status default, and both timestamps.
  const result = await db.query(
    `INSERT INTO requests (title, description, priority)
     VALUES ($1, $2, $3)
     RETURNING ${REQUEST_COLUMNS}`,
    [title, description, priority]
  );
  return result.rows[0];
}

export async function updateRequest(id, changes, db = pool) {
  const assignments = [];
  const values = [];

  for (const field of ['title', 'description', 'priority', 'status']) {
    if (changes[field] !== undefined) {
      values.push(changes[field]);
      assignments.push(`${field} = $${values.length}`);
    }
  }

  values.push(id);
  const result = await db.query(
    `UPDATE requests
     SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${values.length}
     RETURNING ${REQUEST_COLUMNS}`,
    values
  );
  return result.rows[0] ?? null;
}

export async function insertStatusHistory(requestId, previousStatus, newStatus, db = pool) {
  await db.query(
    `INSERT INTO request_status_history (request_id, previous_status, new_status)
     VALUES ($1, $2, $3)`,
    [requestId, previousStatus, newStatus]
  );
}

export async function findHistory(requestId, db = pool) {
  const result = await db.query(
    `SELECT previous_status, new_status, changed_at
     FROM request_status_history
     WHERE request_id = $1
     ORDER BY id`,
    [requestId]
  );
  return result.rows;
}
