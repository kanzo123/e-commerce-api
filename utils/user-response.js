// The only user fields we ever send back to a client
export const toUserResponse = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  isOwner: user.isOwner
});