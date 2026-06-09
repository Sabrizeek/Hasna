import { Router } from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import { createAnnouncement, deleteAnnouncement, getAnnouncements, getMyAnnouncements } from "../controllers/announcementController.js";

const router = Router();

router.get("/my", authenticateToken, getMyAnnouncements);
router.get("/", getAnnouncements);
router.post("/", authenticateToken, requireRole("admin"), createAnnouncement);
router.delete("/:id", authenticateToken, requireRole("admin"), deleteAnnouncement);

export default router;
