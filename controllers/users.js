import User from "../models/User.js";
import { toUserResponse } from "../utils/user-response.js";
import { BadRequestError, NotFoundError, UnauthenticatedError } from "../errors/index.js";
import { checkPermissions } from "../utils/check-permissions.js";

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