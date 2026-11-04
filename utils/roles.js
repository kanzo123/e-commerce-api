// The one list of roles. The User model and the role route both read it,
// so a new role is added here and nowhere else.
export const ROLES = ['user', 'manager', 'admin'];