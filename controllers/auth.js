import User from "../models/User.js";
import { toUserResponse } from "../utils/user-response.js";
import { BadRequestError, UnauthenticatedError } from "../errors/index.js";

export async function register(req, res) {
  const { name, email, password } = req.body;

  const isFirstAccount = (await User.countDocuments({})) === 0;
  const role = isFirstAccount ? 'admin' : 'user';

  const user = await User.create({ name, email, password, role, isOwner: isFirstAccount });

  res.status(201).json({ User: toUserResponse(user) })
}

export async function login(req, res) {
  const {email, password} = req.body;

  // Wall 1: both must be real text, so {"$gt": ""} never reaches the query below
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    throw new BadRequestError('Please provide email and password')
  }

  // The password hash is hidden by default, so we ask for it here
  const user = await User.findOne({email}).select('+password');

  // Same answer for "no such email" and "wrong password"
  if (!user || !(await user.comparePassword(password))) {
    throw new UnauthenticatedError('Invalid credentials');
  }

  res.status(200).json({user: toUserResponse(user)})
}