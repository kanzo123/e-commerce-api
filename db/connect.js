import mongoose from "mongoose";

// Wall 2 against NoSQL injection: an object inside a query filter,
// like { $gt: '' }, is made harmless instead of being run as an operator.
mongoose.set('sanitizeFilter', true);

export default function connectDb(url) {
  return mongoose.connect(url)
}