const { S3Client } = require("@aws-sdk/client-s3");
const multer = require("multer");
const multerS3 = require("multer-s3");
require("dotenv").config();

// S3 Client Setup (no ACL)
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const upload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_S3_BUCKET_NAME,
    // ❌ REMOVE ACL to prevent AccessControlListNotSupported error
    // acl: "public-read", // <-- remove this line
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      const ext = file.originalname.split(".").pop();
      const filename = `${Date.now()}-${file.fieldname}.${ext}`;
      const folderPath = "elboz/uploads/catalog/product/Syska/Cables/100/bulkimages";
      const fullPath = `${folderPath}/${filename}`;
      cb(null, fullPath);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // optional: 10MB max
});

module.exports = upload;
