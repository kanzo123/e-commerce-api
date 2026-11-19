import { ForbiddenError } from "../errors/index.js";

export function checkPermissions(requestUser, resourceUserId) {
  if (requestUser.role === 'admin') return;
  if (requestUser.userId === String(resourceUserId)) return;
  throw new ForbiddenError('You are not allowed to access this resource');
}