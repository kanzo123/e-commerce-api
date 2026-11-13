import mongoose from "mongoose";
import bcrypt from 'bcrypt'
import validator from 'validator'
import { ROLES } from "../utils/roles.js";

// bcrypt only reads the first 72 bytes of a password and silently ignores the rest
const MAX_PASSWORD_BYTES = 72;

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide name'],
    // the required validator for a String field is defined to fail for empty strings
    trim: true,
    minlength: [3, 'Name must be at least 3 characters'],
    maxlength: [50, 'Name must be at most 50 characters'],
  },
  email: {
    type: String,
    required: [true, 'Please provide email'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: (value) => validator.isEmail(value),
      message: 'Please provide a valid email',
    }
    // required and type are validators, they run on operations like save() and create()
    // lowercase and trim are setters, they automatically modify the value before it's
    // stored or used in a query like in findOne({email}).
  },
  password: {
    type: String,
    required: [true, 'Please provide password'],
    // Custom messages on purpose: Mongoose's default message includes the typed password
    minlength: [6, 'Password must be at least 6 characters'],
    validate: {
      validator: (value) => Buffer.byteLength(value, 'utf8') <= MAX_PASSWORD_BYTES,
      message: `Password is too long`,
    },
    select: false
  },
  role: {
    type: String,
    enum: ROLES,
    default: 'user'
  },
  isOwner: {
    type: Boolean,
    default: false
  }
});

UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// 'this.password' exists only if the query used .select('+password')
UserSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

export default mongoose.model('User', UserSchema);