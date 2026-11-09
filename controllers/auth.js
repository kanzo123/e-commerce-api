import User from "../models/User.js";
import { toUserResponse } from "../utils/user-response.js";
import { BadRequestError, UnauthenticatedError } from "../errors/index.js";
import { createAccessToken } from '../utils/jwt.js';
import { startSession, setRefreshCookie, clearRefreshCookie } from "../utils/session.js";
import { revokeRefreshToken, rotateRefreshToken } from "../services/refresh-tokens.js";

export async function register(req, res) {
  // Take only these three fields. A 'role' sent by the client is ignored on purpose.
  const { name, email, password } = req.body;

  // The first account ever created becomes admin and owner
  const isFirstAccount = (await User.countDocuments({})) === 0;
  const role = isFirstAccount ? 'admin' : 'user';

  const user = await User.create({ name, email, password, role, isOwner: isFirstAccount });

  const accessToken = await startSession(res, user);

  res.status(201).json({ user: toUserResponse(user), accessToken })
}

export async function login(req, res) {
  const { email, password } = req.body;

  // Wall 1: both must be real text, so {"$gt": ""} never reaches the query below
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    throw new BadRequestError('Please provide email and password')
  }

  // The password hash is hidden by default, so we ask for it here
  const user = await User.findOne({ email }).select('+password');

  // Same answer for "no such email" and "wrong password"
  if (!user || !(await user.comparePassword(password))) {
    throw new UnauthenticatedError('Invalid credentials');
  }

  const accessToken = await startSession(res, user);

  res.status(200).json({ user: toUserResponse(user), accessToken })
}

export async function refresh(req, res) {
  try {
    const { user, refreshToken } = await rotateRefreshToken(req.cookies.refreshToken);
    setRefreshCookie(res, refreshToken);
    res.status(200).json({ accessToken: createAccessToken(user) });
  } catch (error) {
    // A rejected token is useless, so remove it. A server error says nothing about it.
    if (error instanceof UnauthenticatedError) clearRefreshCookie(res);
    throw error;
  }
}

export async function logout(req, res) {
  await revokeRefreshToken(req.cookies.refreshToken);
  clearRefreshCookie(res)
  res.status(200).json({ msg: 'User logged out' })
}
// Note that this does not cause the frontend to log the user out.