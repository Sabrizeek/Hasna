import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { profilePhotoUpload } from "../middleware/uploadMiddleware.js";
import { getMyProfile, updateMyPassword, updateMyPhoto, updateMyProfile } from "../controllers/userController.js";

const router = Router();

router.use(authenticateToken);

router.get("/me", getMyProfile);
router.patch("/me/profile", updateMyProfile);
router.patch("/me/photo", profilePhotoUpload.single("profilePhoto"), updateMyPhoto);
router.patch("/me/password", updateMyPassword);

export default router;
