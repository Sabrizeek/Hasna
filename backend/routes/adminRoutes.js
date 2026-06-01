import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import {
  approveUser,
  deleteUser,
  getAllUsers,
  getPendingUsers,
  rejectUser,
} from "../controllers/adminController.js";

const router = Router();

router.use(authenticateToken, requireRole("admin"));

router.get("/pending-users", getPendingUsers);
router.put("/approve-user/:id", approveUser);
router.put("/reject-user/:id", rejectUser);
router.get("/users", getAllUsers);
router.delete("/users/:id", deleteUser);

export default router;
