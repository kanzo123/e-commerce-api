import mongoose from "mongoose";

export default function connectDb(url) {
  return mongoose.connect(url)
}