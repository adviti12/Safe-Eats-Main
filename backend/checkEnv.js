import dotenv from "dotenv";

dotenv.config();

console.log("Loaded ENV file ✅");
console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS length:", process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : "MISSING");
