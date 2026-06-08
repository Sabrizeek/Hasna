import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import {
  approveUser,
  closeEvaluationWindow,
  createEvaluationWindow,
  createModuleAssignment,
  deleteUser,
  deleteModuleAssignment,
  downloadAdminSupervisionReport,
  exportEvaluations,
  generateAccessToken,
  getAccessTokens,
  getAdminSupervisionReports,
  getAuditLogs,
  getAllUsers,
  getDashboardStats,
  getEvaluationWindows,
  getModuleAssignments,
  getPendingUsers,
  rejectUser,
  revokeAccessToken,
  updateEvaluationWindow,
  updateSupervisionReportStatus,
} from "../controllers/adminController.js";

const router = Router();

router.use(authenticateToken, requireRole("admin"));

router.get("/pending-users", getPendingUsers);
router.put("/approve-user/:id", approveUser);
router.put("/reject-user/:id", rejectUser);
router.get("/users", getAllUsers);
router.delete("/users/:id", deleteUser);
router.get("/dashboard-stats", getDashboardStats);
router.get("/module-assignments", getModuleAssignments);
router.post("/module-assignments", createModuleAssignment);
router.delete("/module-assignments/:id", deleteModuleAssignment);
router.get("/evaluation-windows", getEvaluationWindows);
router.post("/evaluation-windows", createEvaluationWindow);
router.put("/evaluation-windows/:id", updateEvaluationWindow);
router.patch("/evaluation-windows/:id/close", closeEvaluationWindow);
router.get("/access-tokens", getAccessTokens);
router.post("/access-tokens/generate", generateAccessToken);
router.patch("/access-tokens/:id/revoke", revokeAccessToken);
router.get("/supervision-reports", getAdminSupervisionReports);
router.patch("/supervision-reports/:id/status", updateSupervisionReportStatus);
router.get("/supervision-reports/:id/download", downloadAdminSupervisionReport);
router.get("/export/evaluations", exportEvaluations);
router.get("/audit-logs", getAuditLogs);

export default router;
