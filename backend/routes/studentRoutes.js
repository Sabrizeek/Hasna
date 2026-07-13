import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import {
  checkStudentSubmission,
  createStudentSubmission,
  getCourseLecturers,
  getLecturerProfile,
  getDashboardData,
  getEvaluationLecturers,
  createBulkSubmissions,
  getEligibleModules,
  saveModuleSelections
} from "../controllers/studentController.js";

const router = Router();

router.use(requireAuth, requireRole("student"));

router.get("/dashboard-data", getDashboardData);
router.get("/courses/:courseId/lecturers", getCourseLecturers);
router.get("/evaluation-lecturers", getEvaluationLecturers);
router.get("/lecturers/:lecturerId/profile", getLecturerProfile);
router.get("/submissions/check", checkStudentSubmission);
router.post("/submissions", createStudentSubmission);
router.post("/submissions/bulk", createBulkSubmissions);
router.get("/eligible-modules", getEligibleModules);
router.post("/module-selections", saveModuleSelections);

export default router;
