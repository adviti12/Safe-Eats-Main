import mongoose from "mongoose";

const scanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  extractedText: {
    type: String,
    default: ""
  },
  ingredients: [{
    type: String
  }],
  warnings: [{
    type: String
  }],
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

const Scan = mongoose.model("Scan", scanSchema);

export default Scan;
