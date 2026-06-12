import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..", "..");
const uploadsDir = path.join(projectRoot, "backend", "uploads");
const outputPath = path.join(projectRoot, "cloudflare", "cloudinary-map.json");

const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim();
const apiKey = String(process.env.CLOUDINARY_API_KEY || "").trim();
const apiSecret = String(process.env.CLOUDINARY_API_SECRET || "").trim();
const folder = String(process.env.CLOUDINARY_UPLOAD_FOLDER || "kukuverse/uploads").trim().replace(/^\/+|\/+$/g, "");

if (!cloudName || !apiKey || !apiSecret) {
  throw new Error("Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET before running this script.");
}

const files = fs.readdirSync(uploadsDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name !== ".gitkeep");

const uploadMap = {};

for (const entry of files) {
  const absolutePath = path.join(uploadsDir, entry.name);
  const extension = path.extname(entry.name);
  const publicId = path.basename(entry.name, extension);
  const mimeType = getMimeType(extension);
  const formData = new FormData();
  formData.set("file", new File([fs.readFileSync(absolutePath)], entry.name, { type: mimeType }));
  formData.set("public_id", publicId);
  if (folder) {
    formData.set("folder", folder);
  }

  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`
    },
    body: formData
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Upload failed for ${entry.name}: ${payload.error?.message || response.statusText}`);
  }

  uploadMap[`/uploads/${entry.name}`] = payload.secure_url;
  console.log(`Uploaded ${entry.name}`);
}

fs.writeFileSync(outputPath, `${JSON.stringify(uploadMap, null, 2)}\n`, "utf8");
console.log(`Wrote ${outputPath}`);

function getMimeType(extension) {
  return {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".avif": "image/avif"
  }[extension.toLowerCase()] || "application/octet-stream";
}
