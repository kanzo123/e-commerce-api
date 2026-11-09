import User from "../models/User.js";
import { toUserResponse } from "../utils/user-response.js";
import { UnauthenticatedError } from "../errors/index.js";

export async function getAllUsers(req, res) {
  const users = await User.find({});

  res.status(200).json({ users: users.map(toUserResponse), count: users.length })
}

export async function getCurrentUser(req, res) {
  const user = await User.findById(req.user.userId)

  // The account was deleted, but its access token has not expired yet
  if (!user) {
    throw new UnauthenticatedError('Authentication invalid')
  }

  res.status(200).json({ user: toUserResponse(user) });
}