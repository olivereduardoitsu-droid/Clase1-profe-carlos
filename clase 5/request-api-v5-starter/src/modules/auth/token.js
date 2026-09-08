// ============================================================================
// STARTER NOTE — Station 4 (guided).
//
// This module issues and verifies the workshop JWT. The environment plumbing
// is ready; the two functions are yours. Use the `jose` library (already in
// package.json): SignJWT to issue, jwtVerify to verify.
//
// Claims the contract requires:
//   sub  -> user id            iat -> issued at
//   role -> requester | agent  exp -> iat + TOKEN_TTL_SECONDS (1 hour)
//   iss  -> backend-course-api aud -> backend-course-client
//
// Rule of the station: decoding lets you read; VERIFYING lets you trust.
// jwtVerify must check signature, algorithm, issuer, audience and expiry.
// The token is signed, NOT encrypted: put nothing sensitive in the payload.
// ============================================================================
import 'dotenv/config';
import { SignJWT, jwtVerify } from 'jose';

// Fail early: an API that signs tokens with an empty secret is worse
// than an API that refuses to start.
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required.');
}

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET);
const ALGORITHM = 'HS256';
const ISSUER = process.env.JWT_ISSUER ?? 'backend-course-api';
const AUDIENCE = process.env.JWT_AUDIENCE ?? 'backend-course-client';

export const TOKEN_TTL_SECONDS = Number(process.env.JWT_TTL_SECONDS ?? 3600);

export async function issueToken(user) {
  // TODO (station 4): build and sign the token. Partial sketch:
  //   const issuedAt = Math.floor(Date.now() / 1000);
  //   return await new SignJWT({ role: user.role })
  //     .setProtectedHeader({ alg: ALGORITHM, typ: 'JWT' })
  //     .setSubject(user.id)
  //     /* issued-at, expiration (issuedAt + TOKEN_TTL_SECONDS), issuer,
  //        audience — see the jose documentation */
  //     .sign(SECRET_KEY);
  throw new Error('TODO: issueToken is not implemented yet.');
}

export async function verifyToken(token) {
  // TODO (station 4/5): verify — not decode. jwtVerify(token, SECRET_KEY,
  // { algorithms, issuer, audience }) returns { payload } or throws.
  throw new Error('TODO: verifyToken is not implemented yet.');
}
