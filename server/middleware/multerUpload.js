import multer from "multer";

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

export default uploadImage;
