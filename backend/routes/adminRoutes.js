import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import {
  activateUser,
  approveUser,
  closeEvaluationWindow,
  createUser,
  deactivateUser,
  createEvaluationWindow,
  createModuleAssignment,
  deleteAuditLog,
  deleteEvaluationWindow,
  deleteUser,
  deleteModuleAssignment,
  downloadAdminSupervisionReport,
  exportEvaluations,
  getAdminSupervisionReports,
  getAdminEvaluationById,
  getAdminEvaluations,
  getAuditLogs,
  getAllUsers,
  getDashboardStats,
  getEvaluationWindows,
  getLecturerAwardScores,
  getModuleAssignments,
  getPendingUsers,
  getPasswordResetRequests,
  rejectUser,
  approvePasswordResetRequest,
  rejectPasswordResetRequest,
  reopenEvaluationWindow,
  updateEvaluationWindow,
  updateLecturerAwardScore,
  resetUserPassword,
  updateSupervisionReportStatus,
  updateUser,
} from "../controllers/adminController.js";
import { createAdminNotification } from "../controllers/notificationController.js";

const router = Router();

router.use(authenticateToken, requireRole("admin"));

router.get("/pending-users", getPendingUsers);
router.put("/approve-user/:id", approveUser);
router.put("/reject-user/:id", rejectUser);
router.get("/users", getAllUsers);
router.post("/users", createUser);
router.put("/users/:id", updateUser);
router.patch("/users/:id/activate", activateUser);
router.patch("/users/:id/deactivate", deactivateUser);
router.patch("/users/:id/reset-password", resetUserPassword);
router.delete("/users/:id", deleteUser);
router.get("/password-reset-requests", getPasswordResetRequests);
router.patch("/password-reset-requests/:id/approve", approvePasswordResetRequest);
router.patch("/password-reset-requests/:id/reject", rejectPasswordResetRequest);
router.post("/notifications", createAdminNotification);
router.get("/dashboard-stats", getDashboardStats);
router.get("/module-assignments", getModuleAssignments);
router.post("/module-assignments", createModuleAssignment);
router.delete("/module-assignments/:id", deleteModuleAssignment);
router.get("/award-scores", getLecturerAwardScores);
router.patch("/award-scores/:lecturerId", updateLecturerAwardScore);
router.get("/evaluation-windows", getEvaluationWindows);
router.post("/evaluation-windows", createEvaluationWindow);
router.put("/evaluation-windows/:id", updateEvaluationWindow);
router.patch("/evaluation-windows/:id/close", closeEvaluationWindow);
router.patch("/evaluation-windows/:id/reopen", reopenEvaluationWindow);
router.delete("/evaluation-windows/:id", deleteEvaluationWindow);
router.get("/supervision-reports", getAdminSupervisionReports);
router.patch("/supervision-reports/:id/status", updateSupervisionReportStatus);
router.get("/supervision-reports/:id/download", downloadAdminSupervisionReport);
router.get("/evaluations", getAdminEvaluations);
router.get("/evaluations/:id", getAdminEvaluationById);
router.get("/export/evaluations", exportEvaluations);
router.get("/audit-logs", getAuditLogs);
router.delete("/audit-logs/:id", deleteAuditLog);

export default router;
