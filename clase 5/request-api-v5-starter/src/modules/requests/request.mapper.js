// The single bridge between SQL rows (snake_case) and the HTTP
// representation the contract promises (camelCase). A row is not
// automatically the HTTP response.
//
// STARTER NOTE — Station 6: once created_by and changed_by exist in the
// rows, expose them here as createdBy / changedBy. Nothing else changes.

export function mapRequestRow(row) {
  return {
    id: Number(row.id),
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapHistoryRow(row) {
  return {
    previousStatus: row.previous_status,
    newStatus: row.new_status,
    changedAt: row.changed_at
  };
}
