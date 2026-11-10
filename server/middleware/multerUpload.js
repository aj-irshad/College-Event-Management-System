import multer from "multer";
import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { ensureUploadDirectory, getUploadDirectory } from "../utils/uploadPaths.js";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let subdirectory;
    if (file.fieldname === "profile-img") subdirectory = "profiles";
    else if (file.fieldname === "blog-img") subdirectory = "blogs";
    else if (file.fieldname === "proof") subdirectory = "payments/proofs";
    if (!subdirectory) return cb(new Error("Invalid fieldname"));
    ensureUploadDirectory(subdirectory).then((directory) => cb(null, directory), cb);
  },
  filename: function (req, file, cb) {
    const extension = path.extname(file.originalname).toLowerCase().slice(0, 12);
    cb(null, `${randomUUID()}${extension}`);
  },
});

const uploads = multer({ storage });

const uploadImage = (fieldName) => uploads.single(fieldName);

const allowedBlogImages = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
};

const blogStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureUploadDirectory("blogs").then((directory) => cb(null, directory), cb);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${extension}`);
  },
});

const blogUploads = multer({
  storage: blogStorage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (allowedBlogImages[extension] !== file.mimetype) {
      return cb(new Error("Upload a JPEG, PNG, WebP, GIF, or AVIF image"));
    }
    return cb(null, true);
  },
});

const uploadBlogImage = (req, res, next) => {
  blogUploads.single("blog-img")(req, res, (error) => {
    if (!error) return next();
    const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    return res.status(status).json({
      success: false,
      message:
        error.code === "LIMIT_FILE_SIZE"
          ? "Blog image must be 5 MB or smaller"
          : error.message,
    });
  });
};

const paymentProofTypes = {
  ".jpg": { mime: "image/jpeg", signature: (buffer) => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
  ".jpeg": { mime: "image/jpeg", signature: (buffer) => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
  ".png": { mime: "image/png", signature: (buffer) => buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  ".pdf": {
    mime: "application/pdf",
    signature: (buffer) => {
      if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") return false;
      const content = buffer.toString("latin1");
      return !/\/(?:JavaScript|JS|Launch|EmbeddedFile|OpenAction|AA|RichMedia|XFA|GoToE)\b/i.test(content);
    },
  },
};

const paymentProofUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const type = paymentProofTypes[path.extname(file.originalname).toLowerCase()];
    if (!type || type.mime !== file.mimetype) {
      return cb(new Error("Upload a JPG, JPEG, PNG, or PDF payment proof"));
    }
    return cb(null, true);
  },
});

const uploadPaymentProof = (req, res, next) => {
  paymentProofUpload.single("proof")(req, res, (error) => {
    if (error) {
      const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      return res.status(status).json({
        message: error.code === "LIMIT_FILE_SIZE"
          ? "Payment proof must be 5 MB or smaller"
          : error.message,
      });
    }
    if (!req.file) return res.status(400).json({ message: "Payment proof is required" });
    const type = paymentProofTypes[path.extname(req.file.originalname).toLowerCase()];
    const proofPath = path.join(getUploadDirectory("payments/proofs"), path.basename(req.file.filename));
    const validateStoredProof = async () => {
      try {
        const buffer = await fs.readFile(proofPath);
        if (!type?.signature(buffer)) {
          await fs.unlink(proofPath).catch(() => {});
          return res.status(400).json({ message: "Payment proof file content does not match its type" });
        }
        await fs.chmod(proofPath, 0o600);
      } catch {
        await fs.unlink(proofPath).catch(() => {});
        return res.status(400).json({ message: "Could not validate payment proof file" });
      }
      req.paymentProofMimeType = type.mime;
      return next();
    };
    void validateStoredProof();
  });
};

export { uploadBlogImage, uploadPaymentProof };
export default uploadImage;
