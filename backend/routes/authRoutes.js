import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { changePassword, forgotPasswordRequest, getMe, login, register, staffLogin, studentLogin } from "../controllers/authController.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/student-login", studentLogin);
router.post("/staff-login", staffLogin);
router.post("/forgot-password-request", forgotPasswordRequest);
router.post("/change-password", authenticateToken, changePassword);
router.get("/me", authenticateToken, getMe);

export default router;
