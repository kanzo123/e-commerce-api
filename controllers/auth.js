import User from "../models/User.js";
import { toUserResponse } from "../utils/user-response.js";

export async function register(req, res) {
  const { name, email, password } = req.body;

  const isFirstAccount = (await User.countDocuments({})) === 0;
  const role = isFirstAccount ? 'admin' : 'user';

  const user = await User.create({ name, email, password, role, isOwner: isFirstAccount });

  res.status(201).json({ User: toUserResponse(user) })
}