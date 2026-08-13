import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "eu-north-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const uploadImageToS3 = async (base64Image) => {
  try {
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    if (!bucketName) {
      throw new Error("AWS_S3_BUCKET_NAME is not configured");
    }

    // Remove the data:image/jpeg;base64, prefix
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, "base64");

    // Generate a unique filename
    const filename = `scans/${Date.now()}-${crypto.randomBytes(4).toString("hex")}.jpeg`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: filename,
      Body: imageBuffer,
      ContentType: "image/jpeg",
      // ACL: "public-read" // Optional: makes image publicly accessible if bucket allows it
    });

    await s3Client.send(command);

    // Return the public URL
    return `https://${bucketName}.s3.${process.env.AWS_REGION || "eu-north-1"}.amazonaws.com/${filename}`;
  } catch (error) {
    console.error("S3 Upload Error:", error);
    throw error;
  }
};
