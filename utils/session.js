import { createAccessToken } from "./jwt.js";
import { issueRefreshToken, REFRESH_TOKEN_LIFETIME_MS } from "../services/refresh-tokens.js";

// The refresh cookie is set from two places (auth routes and the password route),
// so its options live here, in one place.
const refreshCookieOptions = {
  httpOnly: true, // JavaScript in the browser cannot read this cookie
  secure: process.env.NODE_ENV === 'production', // production: HTTPS only
  sameSite: 'strict', // never sent when the request starts on another site
  path: '/api/v1/auth', // the browser sends it only to these routes (refresh, logout)
};

export function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, {
    ...refreshCookieOptions,
    maxAge: REFRESH_TOKEN_LIFETIME_MS, // res.cookie wants milliseconds
  });
}

export function clearRefreshCookie(res) {
  // Must use the same options (especially path) as when the cookie was set
  res.clearCookie('refreshToken', refreshCookieOptions);
}

// Starts a new login: refresh token goes into the cookie, access token is returned
export async function startSession(res, user) {
  setRefreshCookie(res, await issueRefreshToken(user.id));
  return createAccessToken(user);
}