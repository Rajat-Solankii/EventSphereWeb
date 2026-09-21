const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const crypto = require("crypto");

// Initialize S3 Client
// If AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY are provided, it will use them.
// Otherwise, it might fall back to IAM roles (which is good for AWS EC2/AppRunner).
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials:
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
});

/**
 * Uploads a base64 encoded image string to AWS S3.
 * @param {string} base64Data - The base64 string (e.g. "data:image/png;base64,iVBORw0K...")
 * @param {string} folderName - Folder in the bucket (e.g. "profiles", "tickets")
 * @returns {Promise<string>} The public S3 URL of the uploaded image.
 */
async function uploadBase64ToS3(base64Data, folderName = "uploads") {
  if (!base64Data || !base64Data.startsWith("data:image/")) {
    throw new Error("Invalid base64 image data");
  }

  // Extract the mime type and the raw base64 data
  const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error("Invalid base64 image format");
  }

  const mimeType = matches[1];
  const bufferData = Buffer.from(matches[2], "base64");
  
  // Extract extension from mimeType (e.g. image/jpeg -> jpeg)
  let extension = mimeType.split('/')[1];
  if (extension === 'jpeg') extension = 'jpg';

  const bucketName = process.env.AWS_S3_BUCKET_NAME;
  if (!bucketName) {
    throw new Error("AWS_S3_BUCKET_NAME environment variable is missing");
  }

  // Generate a unique file name
  const uuid = crypto.randomUUID();
  const fileName = `${folderName}/${Date.now()}-${uuid}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    Body: bufferData,
    ContentType: mimeType,
    // Note: To make it publicly accessible automatically, you may need ACL: 'public-read'
    // However, modern S3 buckets disable ACLs by default, requiring Bucket Policies instead.
  });

  await s3Client.send(command);

  // Return the public URL
  return `https://${bucketName}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${fileName}`;
}

module.exports = { uploadBase64ToS3 };
