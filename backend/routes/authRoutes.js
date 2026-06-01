import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { register, login, getMe } from "../controllers/authController.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticateToken, getMe);

export default router;
