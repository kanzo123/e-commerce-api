import User from "../models/User.js";
import { toUserResponse } from "../utils/user-response.js";
import { NotFoundError, UnauthenticatedError } from "../errors/index.js";
import { checkPermissions } from "../utils/check-permissions.js";

export async function getAllUsers(req, res) {
  const users = await User.find({});

  res.status(200).json({ users: users.map(toUserResponse), count: users.length })
}

export async function getCurrentUser(req, res) {
  const user = await User.findById(req.user.userId)

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