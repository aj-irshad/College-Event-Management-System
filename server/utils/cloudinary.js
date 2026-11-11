import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const allowedFolders = new Set(["profiles", "blogs", "payment-proofs"]);
const allowedResourceTypes = new Set(["image", "raw"]);

const operationError = (operation, error) => {
  const safeError = new Error(`Cloudinary ${operation} failed`);
  safeError.code = error?.http_code || error?.code || "CLOUDINARY_ERROR";
  return safeError;
};

export const uploadToCloudinary = async (
  filePath,
  folder,
  { resourceType = "image", publicId, overwrite = false } = {},
) => {
  if (!allowedFolders.has(folder)) throw new Error("Invalid Cloudinary folder");
  if (!allowedResourceTypes.has(resourceType)) {
    throw new Error("Invalid Cloudinary resource type");
  }

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: `ems/${folder}`,
      resource_type: resourceType,
      ...(publicId ? { public_id: publicId } : {}),
      overwrite,
    });

    if (!result.secure_url || !result.public_id) {
      throw new Error("Cloudinary returned an incomplete upload result");
    }

    return {
      url: result.secure_url,
      publicId: result.public_id,
      resourceType,
    };
  } catch (error) {
    if (error?.message === "Cloudinary returned an incomplete upload result") {
      throw error;
    }
    throw operationError("upload", error);
  }
};

export const deleteFromCloudinary = async (publicId, resourceType = "image") => {
  if (!publicId) return null;
  if (!allowedResourceTypes.has(resourceType)) {
    throw new Error("Invalid Cloudinary resource type");
  }

  try {
    return await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true,
    });
  } catch (error) {
    throw operationError("delete", error);
  }
};

export const getCloudinaryAsset = async (publicId, resourceType = "image") => {
  if (!publicId) throw new Error("Cloudinary public ID is required");
  if (!allowedResourceTypes.has(resourceType)) {
    throw new Error("Invalid Cloudinary resource type");
  }

  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: resourceType,
      type: "upload",
    });
    if (!result.secure_url || !result.public_id) {
      throw new Error("Cloudinary returned an incomplete asset result");
    }
    return {
      url: result.secure_url,
      publicId: result.public_id,
      resourceType,
    };
  } catch (error) {
    if (error?.message === "Cloudinary returned an incomplete asset result") {
      throw error;
    }
    if (error?.http_code === 404 || error?.error?.http_code === 404) return null;
    throw operationError("asset lookup", error);
  }
};

export const readCloudinaryAsset = async (url, resourceType = "image") => {
  if (!allowedResourceTypes.has(resourceType)) {
    throw new Error("Invalid Cloudinary resource type");
  }

  let assetUrl;
  try {
    assetUrl = new URL(url);
  } catch {
    throw new Error("Invalid Cloudinary asset URL");
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const expectedPathPrefix = `/${cloudName}/${resourceType}/upload/`;
  if (
    assetUrl.protocol !== "https:" ||
    assetUrl.hostname !== "res.cloudinary.com" ||
    !cloudName ||
    !assetUrl.pathname.startsWith(expectedPathPrefix)
  ) {
    throw new Error("Invalid Cloudinary asset URL");
  }

  try {
    const response = await fetch(assetUrl, {
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      const error = new Error("Cloudinary asset retrieval failed");
      error.code = response.status;
      throw error;
    }
    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    if (error?.message === "Cloudinary asset retrieval failed") throw error;
    throw operationError("asset retrieval", error);
  }
};

export default cloudinary;
