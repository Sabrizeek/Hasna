import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import {
  createDepartment,
  deleteDepartment,
  getDepartmentById,
  getDepartments,
  updateDepartment,
} from "../controllers/departmentController.js";

const router = Router();

router.get("/", getDepartments);
router.get("/:id", getDepartmentById);
router.post("/", authenticateToken, requireRole("admin"), createDepartment);
router.put("/:id", authenticateToken, requireRole("admin"), updateDepartment);
router.delete("/:id", authenticateToken, requireRole("admin"), deleteDepartment);

export default router;
