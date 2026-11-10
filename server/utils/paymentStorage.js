import fs from "fs/promises";
import path from "path";
import { getUploadDirectory } from "./uploadPaths.js";

export const getEsewaQrFile = () =>
  path.join(getUploadDirectory("payments"), "esewa-qr.jpg");

export const readPrivatePaymentFile = (filename) =>
  fs.readFile(path.join(getUploadDirectory("payments/proofs"), path.basename(filename)));

export const removePaymentProof = async (filename) => {
  await fs.rm(path.join(getUploadDirectory("payments/proofs"), path.basename(filename)), { force: true });
};
