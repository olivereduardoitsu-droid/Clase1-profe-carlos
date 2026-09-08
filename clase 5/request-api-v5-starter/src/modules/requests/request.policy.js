// ============================================================================
// STARTER NOTE — Station 7 (design it in station 1, implement it here).
//
// Authorization policy: pure functions over an actor and (when relevant) a
// request representation. No SQL, no HTTP. The middleware says WHO; these
// functions say WHAT is allowed; the service keeps the use-case rules.
//
// The workshop access matrix is FIXED (the validator relies on it):
//   list all requests ......... agent
//   list own requests ......... requester (scope it in SQL, station 6)
//   view / history ............ agent: any · requester: own only
//   create .................... requester (agents do not create)
//   edit title/description .... requester, own request, while open
//   change priority ........... agent
//   change status ............. agent (the state machine still applies)
//
// Legacy requests (createdBy === null) belong to nobody: only agents see
// them. A requester can never match a null owner.
// ============================================================================

export function canListAllRequests(actor) {
  // TODO (station 7)
  throw new Error('TODO: canListAllRequests is not implemented yet.');
}

export function canViewRequest(actor, request) {
  // TODO (station 6/7)
  throw new Error('TODO: canViewRequest is not implemented yet.');
}

export function canViewHistory(actor, request) {
  // TODO (station 6/7)
  throw new Error('TODO: canViewHistory is not implemented yet.');
}

export function canCreateRequest(actor) {
  // TODO (station 7)
  throw new Error('TODO: canCreateRequest is not implemented yet.');
}

export function canEditContent(actor, request) {
  // TODO (station 7)
  throw new Error('TODO: canEditContent is not implemented yet.');
}

export function canChangePriority(actor) {
  // TODO (station 7)
  throw new Error('TODO: canChangePriority is not implemented yet.');
}

export function canChangeStatus(actor) {
  // TODO (station 7)
  throw new Error('TODO: canChangeStatus is not implemented yet.');
}
