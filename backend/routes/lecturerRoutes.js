import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { supervisionReportUpload } from "../middleware/uploadMiddleware.js";
import {
  downloadSupervisionReport,
  getEvaluationResults,
  getLecturerModules,
  getSupervisionReports,
  uploadSupervisionReport,
} from "../controllers/lecturerController.js";

const router = Router();

router.use(requireAuth, requireRole("lecturer"));

router.get("/modules", getLecturerModules);
router.get("/evaluation-results/:courseId", getEvaluationResults);
router.get("/supervision-reports", getSupervisionReports);
router.post("/supervision-reports", supervisionReportUpload.single("report"), uploadSupervisionReport);
router.get("/supervision-reports/:reportId/download", downloadSupervisionReport);

export default router;
