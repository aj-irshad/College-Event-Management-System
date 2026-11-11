import fs from "fs/promises";
import path from "path";
import { getUploadDirectory } from "./uploadPaths.js";
import { readCloudinaryAsset } from "./cloudinary.js";

const getProofFilePath = (filename) => {
  if (typeof filename !== "string" || !filename || path.basename(filename) !== filename || filename.includes("\\")) {
    throw new Error("Invalid payment proof filename");
  }
  return path.join(getUploadDirectory("payments/proofs"), filename);
};

const expectedEsewaQrUrl =
  "https://res.cloudinary.com/bzaw8fhm/image/upload/v1794399104/esewa-qr.jpg";

export const getEsewaQrFile = () =>
  path.join(getUploadDirectory("payments"), "esewa-qr.jpg");

export const readEsewaQr = async () => {
  const configuredUrl = process.env.ESEWA_QR_URL?.trim();

  if (!configuredUrl) {
    if (process.env.NODE_ENV === "production") {
      const error = new Error("ESEWA_QR_URL must be configured in production");
      error.code = "ESEWA_QR_NOT_CONFIGURED";
      throw error;
    }

    const filePath = getEsewaQrFile();
    const extension = path.extname(filePath).toLowerCase();
    const contentType = extension === ".jpg" || extension === ".jpeg"
      ? "image/jpeg"
      : extension === ".png"
        ? "image/png"
        : null;
    if (!contentType) {
      const error = new Error("The local eSewa QR file must be a JPG or PNG image");
      error.code = "ESEWA_QR_INVALID_LOCAL_FILE";
      throw error;
    }

    return { data: await fs.readFile(filePath), contentType };
  }

  if (configuredUrl !== expectedEsewaQrUrl) {
    const error = new Error("ESEWA_QR_URL does not match the approved Cloudinary QR URL");
    error.code = "ESEWA_QR_INVALID_URL";
    throw error;
  }

  try {
    const response = await fetch(configuredUrl, {
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok || !/^image\/jpeg(?:;|$)/i.test(response.headers.get("content-type") || "")) {
      const error = new Error("The configured Cloudinary QR could not be retrieved as a JPEG");
      error.code = "ESEWA_QR_FETCH_FAILED";
      throw error;
    }

    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > 5 * 1024 * 1024) {
      const error = new Error("The configured Cloudinary QR exceeds the allowed size");
      error.code = "ESEWA_QR_INVALID_IMAGE";
      throw error;
    }

    return {
      data: Buffer.from(await response.arrayBuffer()),
      contentType: "image/jpeg",
    };
  } catch (error) {
    if (error.code?.startsWith("ESEWA_QR_")) throw error;
    const fetchError = new Error("Could not retrieve the configured Cloudinary QR");
    fetchError.code = "ESEWA_QR_FETCH_FAILED";
    throw fetchError;
  }
};

export const readPrivatePaymentFile = (filename) =>
  fs.readFile(getProofFilePath(filename));

export const readPaymentProof = async (payment) => {
  if (payment?.proofPublicId && payment?.proofUrl) {
    return readCloudinaryAsset(
      payment.proofUrl,
      payment.proofResourceType || "image",
    );
  }
  if (payment?.proofFilename) return readPrivatePaymentFile(payment.proofFilename);
  const error = new Error("Payment proof is unavailable");
  error.code = "ENOENT";
  throw error;
};

export const removePaymentProof = async (filename) => {
  if (!filename) return;
  await fs.rm(getProofFilePath(filename), { force: true });
};

export const removeTemporaryPaymentProof = async (file) => {
  if (!file?.path) return;
  await fs.unlink(file.path).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
};
