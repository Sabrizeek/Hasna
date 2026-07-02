import multer from "multer";
import path from "path";
import { peerEvaluationsUploadDir, profilePhotosUploadDir, supervisionReportsUploadDir } from "../utils/uploadDirectories.js";

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

const imageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const imageExtensionByMimeType = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const profilePhotoStorage = multer.diskStorage({
  destination: (req, file, callback) => callback(null, profilePhotosUploadDir),
  filename: (req, file, callback) => {
    const extension = imageExtensionByMimeType[file.mimetype] || path.extname(file.originalname).toLowerCase();
    callback(null, `profile-${req.user.id}-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  },
});

export const profilePhotoUpload = multer({
  storage: profilePhotoStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!imageMimeTypes.has(file.mimetype)) {
      callback(Object.assign(new Error("Only JPG, PNG, and WEBP images are allowed."), { status: 400 }));
      return;
    }
    callback(null, true);
  },
});

const peerEvalMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

const peerEvalExtensionByMimeType = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

const peerEvalStorage = multer.diskStorage({
  destination: (req, file, callback) => callback(null, peerEvaluationsUploadDir),
  filename: (req, file, callback) => {
    const extension = peerEvalExtensionByMimeType[file.mimetype] || path.extname(file.originalname).toLowerCase();
    callback(null, `peereval-${req.user.id}-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  },
});

export const peerEvaluationUpload = multer({
  storage: peerEvalStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!peerEvalMimeTypes.has(file.mimetype)) {
      callback(Object.assign(new Error("Only PDF, JPG, and PNG files are allowed."), { status: 400 }));
      return;
    }
    callback(null, true);
  },
});
