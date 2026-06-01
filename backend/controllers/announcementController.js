import { query } from "../config/db.js";

export const createAnnouncement = async (req, res) => {
  try {
    const { title, message, target_role, department_id } = req.body;

    if (!title || !message || !target_role) {
      return res.status(400).json({ message: "Title, message and target role are required." });
    }

    const [result] = await query(
      "INSERT INTO announcements (title, message, target_role, department_id, created_by) VALUES (?, ?, ?, ?, ?)",
      [title, message, target_role, department_id || null, req.user.id]
    );

    res.status(201).json({ message: "Announcement created successfully.", announcementId: result.insertId });
  } catch (error) {
    res.status(500).json({ message: "Failed to create announcement.", error: error.message });
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
