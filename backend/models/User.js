// backend/models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false }, // hashed, hidden
  allergies: { type: [String], default: [] } // <- NEW: array of strings
}, { timestamps: true });

export default mongoose.model("User", userSchema);
