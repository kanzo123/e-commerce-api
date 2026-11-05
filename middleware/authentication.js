import { ForbiddenError, UnauthenticatedError } from "../errors/index.js";
import { verifyAccessToken } from "../utils/jwt.js";

// Runs on every request to a protected route
export async function authenticateUser(req, res, next) {
  const [scheme, token] = (req.headers.authorization ?? '').split(' ')
  if (scheme.toLowerCase() !== 'bearer' || !token) {
    throw new UnauthenticatedError('Authentication invalid')
  }
  try {
    const decoded = verifyAccessToken(token)
    req.user = { userId: decoded.sub, role: decoded.role }
  } catch (e) {
    throw new UnauthenticatedError('Authentication invalid')
  }

  next()
}

// authorizeRoles('admin') runs ONCE, when the routes file loads, and returns
// a middleware function. Express runs that returned function on every request.
export function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError('You are not allowed to access this route')
    }
    next();
  }
}