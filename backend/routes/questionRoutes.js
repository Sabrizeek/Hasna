import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { getQuestions } from "../controllers/questionController.js";

const router = Router();

router.get("/", requireAuth, getQuestions);

export default router;
