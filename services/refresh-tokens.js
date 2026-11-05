import crypto from 'node:crypto';
import RefreshToken from "../models/RefreshToken.js";

export const REFRESH_TOKEN_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// SHA-256 is fine here: the token is long and random, so it cannot be guessed.
// (Slow hashing like bcrypt is only needed for passwords that people choose.)
function hashToken(token) {
  // creates a sha256 hash object -> feeds it the token -> 64 hex characters
  // (43 characters from base64url -> 32 bytes from sha256 -> 64 hex characters)
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Creates a refresh token and returns it. This is the only moment
// the token exists in plain text on the server.
// The default family = crypto.randomUUID() is worked out at each call.
// That is why every login gets a new family.
export async function issueRefreshToken(userId, family = crypto.randomUUID()) {
  const token = crypto.randomBytes(32).toString('base64url') // 32 bytes -> 43 characters

  await RefreshToken.create({
    user: userId,
    family,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_LIFETIME_MS),
  })

  return token
}

// Ends the login (all tokens of this family). Safe to call with a bad token.
export async function revokeRefreshToken(token) {
  if (typeof token !== 'string' || !token) return;
  const record = await RefreshToken.findOne({ tokenHash: hashToken(token) })
  if (record) {
    await RefreshToken.deleteMany({ family: record.family })
  }
};