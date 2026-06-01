import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import {
  createSemester,
  deleteSemester,
  getSemesters,
  updateSemester,
} from "../controllers/semesterController.js";

const router = Router();

router.use(authenticateToken, requireRole("admin"));

router.post("/", createSemester);
router.get("/", getSemesters);
router.put("/:id", updateSemester);
router.delete("/:id", deleteSemester);

export default router;
