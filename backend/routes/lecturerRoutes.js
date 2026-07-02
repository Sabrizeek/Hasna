import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { supervisionReportUpload, peerEvaluationUpload } from "../middleware/uploadMiddleware.js";
import {
  downloadSupervisionReport,
  getEvaluationResults,
  getLecturerModules,
  getSupervisionReports,
  summarizeLecturerComments,
  uploadSupervisionReport,
  getPeerEvaluations,
  uploadPeerEvaluation,
  downloadPeerEvaluation,
} from "../controllers/lecturerController.js";

const router = Router();

router.use(requireAuth, requireRole("lecturer"));

router.get("/modules", getLecturerModules);
router.get("/evaluation-results/:courseId", getEvaluationResults);
router.post("/comments/summarize", summarizeLecturerComments);
router.get("/supervision-reports", getSupervisionReports);
router.post("/supervision-reports", supervisionReportUpload.single("report"), uploadSupervisionReport);
router.get("/supervision-reports/:reportId/download", downloadSupervisionReport);

router.get("/peer-evaluations", getPeerEvaluations);
router.post("/peer-evaluations/:assignmentId/upload", peerEvaluationUpload.single("file"), uploadPeerEvaluation);
router.get("/peer-evaluations/uploads/:uploadId/download", downloadPeerEvaluation);

export default router;
