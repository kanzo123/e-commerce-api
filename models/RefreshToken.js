import mongoose from "mongoose";

const RefreshTokenSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true, // we delete all tokens of one user (password change)
  },
  // One family per login (one per device). Every token made by rotating it joins the family.
  family: { type: String, required: true, index: true },
  // A fingerprint of the token. The token itself is never stored.
  tokenHash: { type: String, required: true, unique: true },
  // true once this token has been exchanged for a new one
  used: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

// MongoDB removes the document by itself soon after expiresAt
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('RefreshToken', RefreshTokenSchema)