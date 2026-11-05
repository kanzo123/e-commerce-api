import jwt from 'jsonwebtoken';

const ACCESS_TOKEN_LIFETIME_SECONDS = 15 * 60; // 15 minutes

export function createAccessToken(user) {
  return jwt.sign({ role: user.role }, process.env.JWT_SECRET, {
    subject: user.id, // the standard "sub" claim: who this token is about
    expiresIn: ACCESS_TOKEN_LIFETIME_SECONDS
  })
}

// Throws if the token is expired, changed, or signed with another secret
export function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
}