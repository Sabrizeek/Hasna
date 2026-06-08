import multer from "multer";
import path from "path";
import { supervisionReportsUploadDir } from "../utils/uploadDirectories.js";

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const extensionByMimeType = {
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, supervisionReportsUploadDir);
  },
  filename: (req, file, callback) => {
    const extension = extensionByMimeType[file.mimetype] || path.extname(file.originalname).toLowerCase();
    const safeName = `supervision-${req.user.id}-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    callback(null, safeName);
  },
});

export const supervisionReportUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, callback) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(Object.assign(new Error("Only PDF, DOC, and DOCX files are allowed."), { status: 400 }));
      return;
    }

    callback(null, true);
  },
});
