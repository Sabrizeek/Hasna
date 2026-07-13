import { query } from "../config/db.js";

export const createSemester = async (req, res) => {
  try {
    const { semester_name, academic_year, is_active } = req.body;

    if (!semester_name || !academic_year) {
      return res.status(400).json({ message: "Semester name and academic year are required." });
    }

    const [result] = await query(
      "INSERT INTO semesters (semester_name, academic_year, is_active, module_selection_deadline) VALUES (?, ?, ?, ?)",
      [
        semester_name, 
        academic_year, 
        is_active ? 1 : 0, 
        is_active ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null
      ]
    );

    res.status(201).json({ message: "Semester created successfully.", semesterId: result.insertId });
  } catch (error) {
    res.status(500).json({ message: "Failed to create semester.", error: error.message });
  }
};

export const getSemesters = async (req, res) => {
  try {
    const [semesters] = await query("SELECT * FROM semesters ORDER BY created_at DESC");
    res.json({ semesters });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch semesters.", error: error.message });
  }
};

export const updateSemester = async (req, res) => {
  try {
    const { id } = req.params;
    const { semester_name, academic_year, is_active } = req.body;

    const [existing] = await query("SELECT is_active, module_selection_deadline FROM semesters WHERE id = ?", [id]);
    if (!existing.length) {
      return res.status(404).json({ message: "Semester not found." });
    }

    let newDeadline = existing[0].module_selection_deadline;
    if (is_active && !existing[0].is_active) {
      // Automatically set 7 days from now if activating
      newDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    } else if (!is_active) {
      newDeadline = null; // Clear deadline if deactivating
    }

    const [result] = await query(
      "UPDATE semesters SET semester_name = ?, academic_year = ?, is_active = ?, module_selection_deadline = ? WHERE id = ?",
      [semester_name, academic_year, is_active ? 1 : 0, newDeadline, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Semester not found." });
    }

    res.json({ message: "Semester updated successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to update semester.", error: error.message });
  }
};

export const deleteSemester = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await query("DELETE FROM semesters WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Semester not found." });
    }

    res.json({ message: "Semester deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete semester.", error: error.message });
  }
};
