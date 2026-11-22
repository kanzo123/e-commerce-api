import User from "../models/User.js";
import { toUserResponse } from "../utils/user-response.js";
import { BadRequestError, ForbiddenError, NotFoundError, UnauthenticatedError } from "../errors/index.js";
import { checkPermissions } from "../utils/check-permissions.js";
import { revokeAllRefreshTokens } from "../services/refresh-tokens.js";
import { startSession } from "../utils/session.js";
import { ROLES } from "../utils/roles.js";

// For sensitive actions we do not trust the token (it can be 15 minutes old).
// We ask the database who is calling, and check that this person is still an admin.
async function loadCurrentAdmin(userId, { withPassword = false } = {}) {
  const query = User.findById(userId);
  if (withPassword) query.select('+password');
  const actor = await query;
  if (!actor || actor.role !== 'admin') {
    throw new ForbiddenError('You are not allowed to access this route');
  }
  return actor;
}

export async function getAllUsers(req, res) {
  const users = await User.find({});

  res.status(200).json({ users: users.map(toUserResponse), count: users.length })
}

// Used to retrieve the profile information of the currently authenticated user
export async function getCurrentUser(req, res) {
  const user = await User.findById(req.user.userId)
  // If the name or email changes, the old token still shows the old
  // value for up to 15 minutes. This why we read name and email from the database.
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

  // In this route (PATCH /users/me) we don't create a new token, as there's only role
  // in the jwt payload. Also, the other controllers load the fresh user data from
  // the database.

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

export async function updateUserRole(req, res) {
  const { id } = req.params;
  const { role: newRole } = req.body

  if (typeof newRole !== 'string' || !ROLES.includes(newRole)) {
    throw new BadRequestError(`Role must be one of: ${ROLES.join(', ')}`);
  }

  // Without this self check, An admin could remove their own admin rights by mistake
  if (req.user.userId === id) {
    throw new ForbiddenError('You cannot change your own role');
  }

  // The token can be up to 15 minutes old, so for this sensitive route we ask the database
  // who is calling. An admin who was demoted a minute ago must not still pass.
  const actor = await loadCurrentAdmin(req.user.userId);

  const target = await User.findById(id)
  if (!target) {
    throw new NotFoundError('User not found');
  }

  // Nobody can change the owner. (The owner changing their own role was already stopped above.)
  if (target.isOwner) {
    throw new ForbiddenError("Nobody can change the owner's role");
  }

  // Making someone an admin, or changing an admin, is for the owner only.
  // Other admins can still move people between user and manager.
  const involvesAdmin = newRole === 'admin' || target.role === 'admin';
  if (involvesAdmin && !actor.isOwner) {
    throw new ForbiddenError('Only the owner can make or remove admins')
  }

  target.role = newRole;
  await target.save()

  res.status(200).json({ user: toUserResponse(target) })
}

export async function deleteUser(req, res) {
  const { id } = req.params;

  if (id === req.user.userId) {
    throw new ForbiddenError('You cannot delete your own account');
  }

  const actor = await loadCurrentAdmin(req.user.userId);

  const target = await User.findById(id);
  if (!target) {
    throw new NotFoundError('User not found');
  }

  if (target.isOwner) {
    throw new ForbiddenError('Nobody can delete the owner');
  }
  // Same rule as the role route: admins are managed by the owner only
  if (target.role === 'admin' && !actor.isOwner) {
    throw new ForbiddenError('Only the owner can delete admins');
  }

  // 1. The account goes first, so nobody can log in with it any more
  await target.deleteOne();

  // 2. Then everything that belonged to it
  await revokeAllRefreshTokens(target.id);

  res.status(200).json({ msg: 'User removed' });
}

export async function transferOwnership(req, res) {
  const { id } = req.params;
  const { password } = req.body;

  const actor = await loadCurrentAdmin(req.user.userId, { withPassword: true });
  if (!actor.isOwner) {
    throw new ForbiddenError('Only the owner can transfer ownership');
  }

  // A big and rare action: ask for the password again, even though the owner is logged in.
  // (A stolen access token alone must not be enough to take the shop away.)
  if (typeof password !== 'string' || !password) {
    throw new BadRequestError('Please provide your password');
  }

  if (id === req.user.userId) {
    throw new BadRequestError('You are already the owner');
  }

  const newOwner = await User.findById(id);
  if (!newOwner) {
    throw new NotFoundError('User not found');
  }
  if (newOwner.role !== 'admin') {
    throw new BadRequestError('The new owner must already be an admin');
  }

  // The slow check (bcrypt) comes last
  if (!(await actor.comparePassword(password))) {
    throw new BadRequestError('Password is incorrect');
  }

  // Order matters. The new owner is saved first: if the server stops between the two saves,
  // there are briefly two owners, which is safe. The other way round could leave no owner at all.
  newOwner.isOwner = true;
  await newOwner.save();

  actor.isOwner = false; // the old owner stays an admin
  await actor.save();

  res.status(200).json({ msg: 'Ownership transferred', owner: toUserResponse(newOwner) });
}