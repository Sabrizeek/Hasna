import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import {
  downloadDeanSupervisionReport,
  downloadDeanPeerEvaluation,
  exportDeanDepartmentReport,
  exportFacultyReport,
  getDeanDepartment,
  getDeanLecturerDetails,
  getDeanSemesters,
  getFacultyOverview,
} from "../controllers/deanController.js";

const router = Router();

router.use(requireAuth, requireRole("dean"));

router.get("/semesters", getDeanSemesters);
router.get("/faculty-overview", getFacultyOverview);
router.get("/department/:departmentId", getDeanDepartment);
router.get("/lecturer/:lecturerId/details", getDeanLecturerDetails);
router.get("/export/faculty-report", exportFacultyReport);
router.get("/export/department-report/:departmentId", exportDeanDepartmentReport);
router.get("/supervision-reports/:reportId/download", downloadDeanSupervisionReport);
router.get("/peer-evaluations/:reportId/download", downloadDeanPeerEvaluation);

export default router;
