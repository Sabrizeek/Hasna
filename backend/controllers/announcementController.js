import { query } from "../config/db.js";
import { notifyAllUsers, notifyRole, notifyUsers } from "../utils/notificationService.js";

export const createAnnouncement = async (req, res) => {
  try {
    const { title, message, target_role, department_id } = req.body;

    if (!title || !message || !target_role) {
      return res.status(400).json({ message: "Title, message and target role are required." });
    }

    if (!["all", "student", "lecturer", "admin", "hod", "dean"].includes(target_role)) {
      return res.status(400).json({ message: "Invalid target role." });
    }

    const [result] = await query(
      "INSERT INTO announcements (title, message, target_role, department_id, created_by) VALUES (?, ?, ?, ?, ?)",
      [title, message, target_role, department_id || null, req.user.id]
    );

    let deliveredCount = 0;
    const notificationPayload = {
      title: `Announcement: ${title}`,
      message,
      type: "info",
      relatedEntityType: "announcement",
      relatedEntityId: result.insertId,
    };

    if (department_id) {
      const params = [department_id];
      let roleFilter = "";
      if (target_role !== "all") {
        roleFilter = "AND role = ?";
        params.push(target_role);
      }
      const [users] = await query(
        `SELECT id
         FROM users
         WHERE department_id = ?
           ${roleFilter}
           AND status = 'approved'
           AND deleted_at IS NULL`,
        params
      );
      deliveredCount = await notifyUsers(users.map((user) => user.id), notificationPayload);
    } else if (target_role === "all") {
      deliveredCount = await notifyAllUsers(notificationPayload);
    } else {
      deliveredCount = await notifyRole(target_role, notificationPayload);
    }

    res.status(201).json({
      message: "Announcement created successfully.",
      announcementId: result.insertId,
      notificationCount: deliveredCount,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to create announcement.", error: error.message });
  }
};

export const getMyAnnouncements = async (req, res) => {
  try {
    const userRole = req.user.role;
    const departmentId = req.user.department_id || null;
    const params = ["all", userRole];
    const departmentFilter = departmentId ? "OR a.department_id = ?" : "";
    if (departmentId) params.push(departmentId);

    const [announcements] = await query(
      `SELECT a.id, a.title, a.message, a.target_role, a.department_id, a.created_at,
              d.department_name, u.full_name AS created_by_name
       FROM announcements a
       LEFT JOIN departments d ON a.department_id = d.id
       LEFT JOIN users u ON a.created_by = u.id
       WHERE a.target_role IN (?, ?)
         AND (a.department_id IS NULL ${departmentFilter})
       ORDER BY a.created_at DESC
       LIMIT 10`,
      params
    );

    res.json({ announcements });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch announcements.", error: error.message });
  }
};

export const getAnnouncements = async (req, res) => {
  try {
    const [announcements] = await query(
      `SELECT a.*, d.department_name, u.full_name AS created_by_name
       FROM announcements a
       LEFT JOIN departments d ON a.department_id = d.id
       LEFT JOIN users u ON a.created_by = u.id
       ORDER BY a.created_at DESC`
    );

    res.json({ announcements });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch announcements.", error: error.message });
  }
};

export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await query("DELETE FROM announcements WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Announcement not found." });
    }

    res.json({ message: "Announcement deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete announcement.", error: error.message });
  }
};
