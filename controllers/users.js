import User from "../models/User.js";
import { toUserResponse } from "../utils/user-response.js";
import { BadRequestError, NotFoundError, UnauthenticatedError } from "../errors/index.js";
import { checkPermissions } from "../utils/check-permissions.js";
import { revokeAllRefreshTokens } from "../services/refresh-tokens.js";
import { startSession } from "../utils/session.js";

export async function getAllUsers(req, res) {
  const users = await User.find({});

  res.status(200).json({ users: users.map(toUserResponse), count: users.length })
}

export async function getCurrentUser(req, res) {
  const user = await User.findById(req.user.userId)
  // If the name or email changes, the old token still shows the old
  // value for up to 15 minutes. We read name and email from the database, this way
  // we avoid populating the payload of jwt with more user info (req.user).
  // That is also why in PATCH /users/me we don't create a new token.

  // The account was deleted, but its access token has not expired yet
  if (!user) {
    throw new UnauthenticatedError('Authentication invalid');
  }

  res.status(200).json({ user: toUserResponse(user) });
}

export async function getSingleUser(req, res) {
  const { id } = req.params;

  // Permission first: it only needs the id from the URL, not the database.
  // A normal user gets the same 403 for any id that is not theirs.
  checkPermissions(req.user, id)

  const user = await User.findById(id);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  res.status(200).json({ user: toUserResponse(user) });
}

export async function updateCurrentUser(req, res) {
  // PATCH means partial: change only what was sent
  const updates = {};
  for (const field of ['name', 'email']) {
    const value = req.body[field];
    if (value === undefined) continue;
    if (typeof value !== 'string') {
      throw new BadRequestError(`${field} must be text`);
    }
    updates[field] = value;
  }

  if (Object.keys(updates).length === 0) {
    throw new BadRequestError('Please provide name or email');
  }

  const user = await User.findById(req.user.userId);

  // The account was deleted, but its access token has not expired yet
  if (!user) {
    throw new UnauthenticatedError('Authentication invalid');
  }

  // save() runs the schema rules (length, valid email, lowercase, trim) on the changed fields
  // In Mongoose 5+, setters run on update queries by default, so lowercase and
  // trim will be applied during casting before validation runs.
  // Casting = converting an incoming value to the type declared in the schema before validation
  user.set(updates);
  await user.save();
  // if name or email are the same as the one in db, user.save() silently skips the
  // database write

  res.status(200).json({ user: toUserResponse(user) });
}

export async function updateCurrentUserPassword(req, res) {
  const { oldPassword, newPassword } = req.body;

  // Only plain text may reach bcrypt and the database
  if (
    typeof oldPassword !== 'string' ||
    typeof newPassword !== 'string' ||
    !oldPassword ||
    !newPassword
  ) {
    throw new BadRequestError('Please provide oldPassword and newPassword');
  }

  // The password is hidden by default, so we ask for it here
  const user = await User.findById(req.user.userId).select('+password');
  if (!user) {
    throw new UnauthenticatedError('Authentication invalid');
  }

  // 400, not 401: a frontend may treat every 401 as "your login expired"
  if (!(await user.comparePassword(oldPassword))) {
    throw new BadRequestError('Old password is incorrect');
  }
  // We already know oldPassword is the real password, so plain text comparison is enough
  if (oldPassword === newPassword) {
    throw new BadRequestError('New password must be different from the old password');
  }

  // save() runs the schema rules (6 characters minimum, 72 bytes maximum)
  // AND the pre('save') hook that hashes the password (findByIdAndUpdate can't run hooks)
  user.password = newPassword;
  await user.save();

  // Order matters: change the password first. If it was rejected above,
  // nobody gets logged out.
  await revokeAllRefreshTokens(user.id); // every device, including this one
  const accessToken = await startSession(res, user); // this device logs in again
  // Note: req.cookies.refreshToken is undefined since the browser does not send it to
  // users route because of path in the cookie options, that's why we delete all refresh
  // tokens (The thief’s login must stop working) for the current user and start a
  // new session for the current device instead of:
  // `
  // const record = await RefreshToken.findOne({ tokenHash: hashToken(req.cookies.refreshToken) });
  // await RefreshToken.deleteMany({ user: userId, family: { $ne: record.family } });
  // `

  res.status(200).json({ msg: 'Password updated', accessToken });
}