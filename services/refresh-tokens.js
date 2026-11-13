import crypto from 'node:crypto';
import RefreshToken from "../models/RefreshToken.js";
import User from "../models/User.js";
import { UnauthenticatedError } from "../errors/index.js";

// how long the user can stay logged in without re-entering credentials.
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
export async function issueRefreshToken(userId, family = crypto.randomUUID()) {
  const token = crypto.randomBytes(32).toString('base64url') // 32 bytes -> 43 characters
  // this 43 characters string is what get stored in the cookie
  // httpOnly cookie make it unreadable on the client unlike jwt payload

  await RefreshToken.create({
    user: userId,
    family,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_LIFETIME_MS),
  })

  return token
}

// Swaps a valid refresh token for a new one. The old one can never be used again.
export async function rotateRefreshToken(token) {
  // This guard comes first because the next line hashes the token.
  if (typeof token !== 'string' || !token) {
    throw new UnauthenticatedError('Invalid refresh token');
  }

  // No record means fake, logged out (as the family is deleted on logout), or
  // already deleted (because of TTL index)
  const record = await RefreshToken.findOne({ tokenHash: hashToken(token) });
  if (!record || record.expiresAt <= new Date()) {
    // Note: We don't delete family as expiry isn't treated as theft, just a stale session.
    throw new UnauthenticatedError('Invalid refresh token');
  }

  // One database step: "mark as used, but only if it is not used yet".
  // It is one step, not “read used, then write”. Two requests could both read false.
  // By making it one step, if two requests arrive together, only one of them gets a result.
  // claim the token here means to mark a specific token as "used"
  const claimed = await RefreshToken.findOneAndUpdate(
    { _id: record._id, used: false },
    { used: true }
  );
  if (!claimed) {
    // An old token came back. Someone may have copied it, so end this whole login.
    await RefreshToken.deleteMany({ family: record.family });
    throw new UnauthenticatedError('Invalid refresh token');
  }
  // Why do we keep all used tokens in the database?
  // The following scenario may happen if we just `throw new UnauthenticatedError()`
  // without deleting family:
  // A legitimate user just presented an old, already-used token. That means someone
  // else may be holding the newer rotated token (the attacker). Clearing the victim's
  // cookie doesn't touch the attacker's token — but deleting the family kills it server-side.
  // That's the entire point of reuse detection.
  // ---
  // Why in logout:
  // Same reasoning — you want the token dead in the DB, not just removed from the browser. If it leaked,
  // clearing the cookie does nothing for the attacker's copy.
  // ---
  // The guards that delete the family are the ones where a token may exist outside this browser.
  // The plain "invalid/expired token" guards skip it because there's no evidence of a second holder,
  // and the TTL will clean up anyway.

  const user = await User.findById(record.user);
  if (!user) {
    await RefreshToken.deleteMany({ family: record.family });
    throw new UnauthenticatedError('Invalid refresh token');
  }

  const newToken = await issueRefreshToken(user.id, record.family);

  return { user, refreshToken: newToken };
}

// Ends the login (all tokens of this family). Safe to call with a bad token.
export async function revokeRefreshToken(token) {
  if (typeof token !== 'string' || !token) return; // e.g. Cookie expired and the browser dropped it.
  const record = await RefreshToken.findOne({ tokenHash: hashToken(token) })
  if (record) {
    await RefreshToken.deleteMany({ family: record.family })
  }
}

// Ends every login of one user (all devices)
export async function revokeAllRefreshTokens(userId) {
  await RefreshToken.deleteMany({ user: userId });
}