import { query } from "../config/db.js";
import { notifyAllUsers, notifyRole, notifyUser } from "../utils/notificationService.js";
import { logAudit } from "../utils/auditLogger.js";

const parsePositiveInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const allowedTypes = new Set(["info", "success", "warning", "error", "system"]);
const allowedRoles = new Set(["student", "lecturer", "hod", "dean", "admin"]);

export const getNotifications = async (req, res) => {
  try {
    const unreadOnly = req.query.unread === "true";
    const params = [req.user.id];
    const unreadFilter = unreadOnly ? "AND is_read = 0" : "";

    const [notifications] = await query(
      `SELECT id, title, message, type, is_read AS isRead,
              related_entity_type AS relatedEntityType,
              related_entity_id AS relatedEntityId,
              created_at AS createdAt
       FROM notifications
       WHERE user_id = ? ${unreadFilter}
       ORDER BY created_at DESC
       LIMIT 100`,
      params
    );

    const [counts] = await query(
      "SELECT COUNT(*) AS unreadCount FROM notifications WHERE user_id = ? AND is_read = 0",
      [req.user.id]
    );

    res.json({
      notifications,
      unreadCount: Number(counts[0]?.unreadCount || 0),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch notifications.", error: error.message });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) return res.status(400).json({ message: "Valid notification ID is required." });

    const [result] = await query(
      "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: "Notification not found." });

    res.json({ message: "Notification marked as read." });
  } catch (error) {
    res.status(500).json({ message: "Failed to update notification.", error: error.message });
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    await query("UPDATE notifications SET is_read = 1 WHERE user_id = ?", [req.user.id]);
    res.json({ message: "All notifications marked as read." });
  } catch (error) {
    res.status(500).json({ message: "Failed to update notifications.", error: error.message });
  }
};

export const createAdminNotification = async (req, res) => {
  try {
    const { title, message, type = "info", targetType = "role", userId, role } = req.body;
    const normalizedTitle = title?.trim();
    const normalizedMessage = message?.trim();

    if (!normalizedTitle || !normalizedMessage) {
      return res.status(400).json({ message: "Title and message are required." });
    }
    if (!allowedTypes.has(type)) return res.status(400).json({ message: "Invalid notification type." });

    let deliveredCount = 0;
    if (targetType === "user") {
      const resolvedUserId = parsePositiveInt(userId);
      if (!resolvedUserId) return res.status(400).json({ message: "Valid user is required." });
      const [users] = await query("SELECT id FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1", [resolvedUserId]);
      if (users.length === 0) return res.status(404).json({ message: "Target user not found." });
      await notifyUser({ userId: resolvedUserId, title: normalizedTitle, message: normalizedMessage, type });
      deliveredCount = 1;
    } else if (targetType === "role") {
      if (!allowedRoles.has(role)) return res.status(400).json({ message: "Valid role is required." });
      deliveredCount = await notifyRole(role, { title: normalizedTitle, message: normalizedMessage, type });
    } else if (targetType === "all") {
      deliveredCount = await notifyAllUsers({ title: normalizedTitle, message: normalizedMessage, type });
    } else {
      return res.status(400).json({ message: "Invalid notification target." });
    }

    await logAudit({
      userId: req.user.id,
      action: "notification_sent",
      entityType: "notification",
      details: { targetType, userId: userId || null, role: role || null, deliveredCount },
    });

    res.status(201).json({ message: "Notification sent successfully.", deliveredCount });
  } catch (error) {
    res.status(500).json({ message: "Failed to send notification.", error: error.message });
  }
};
