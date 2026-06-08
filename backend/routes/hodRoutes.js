import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import {
  downloadHodSupervisionReport,
  exportDepartmentReport,
  getDepartmentOverview,
  getHodSemesters,
  getHodLecturerDetails,
} from "../controllers/hodController.js";

const router = Router();

router.use(requireAuth, requireRole("hod"));

router.get("/department-overview", getDepartmentOverview);
router.get("/semesters", getHodSemesters);
router.get("/lecturer/:lecturerId/details", getHodLecturerDetails);
router.get("/export/department-report", exportDepartmentReport);
router.get("/supervision-reports/:reportId/download", downloadHodSupervisionReport);

export default router;
