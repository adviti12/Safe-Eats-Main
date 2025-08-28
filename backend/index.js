// index.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./db.js";
import authRoutes from "./routes/auth.js";
import protectedRoutes from "./routes/protected.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/protected", protectedRoutes);

const PORT = process.env.PORT || 5000;

try {
  await connectDB();
  app.listen(PORT, () => console.log(`Server running on ${PORT}`));
} catch (err) {
  console.error("Startup error:", err.message);
  process.exit(1);
}
import allergensRoutes from "./routes/allergens.js";
app.use("/api/allergens", allergensRoutes);
