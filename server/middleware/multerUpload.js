import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === "profile-img") {
      cb(null, "uploads/user");
    } else if (file.fieldname === "blog-img") {
      cb(null, "uploads/blog");
    } else {
      cb(new Error("Invalid fieldname"));
    }
  },
  filename: function (req, file, cb) {
    const ext = file.originalname.split(".").pop();
    cb(null, `${Date.now()}.${ext}`);
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
  destination: (_req, _file, cb) => cb(null, "uploads/blog"),
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

export { uploadBlogImage };
export default uploadImage;
