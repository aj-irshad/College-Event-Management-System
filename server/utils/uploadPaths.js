import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const serverDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const uploadsDirectory = path.join(serverDirectory, "uploads");
const allowedSubdirectories = new Set([
  "events",
  "blogs",
  "profiles",
  "payments",
  "payments/proofs",
]);

export const getUploadsDirectory = () => uploadsDirectory;

export const getUploadDirectory = (subdirectory) => {
  if (!allowedSubdirectories.has(subdirectory)) {
    throw new Error("Unknown upload directory");
  }
  const resolved = path.resolve(uploadsDirectory, ...subdirectory.split("/"));
  if (!resolved.startsWith(`${uploadsDirectory}${path.sep}`)) {
    throw new Error("Upload directory is outside the uploads root");
  }
  return resolved;
};

export const ensureUploadDirectory = async (subdirectory) => {
  const directory = getUploadDirectory(subdirectory);
  await fs.mkdir(directory, { recursive: true });
  return directory;
};
