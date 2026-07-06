import { query } from "../config/db.js";

export const createSemester = async (req, res) => {
  try {
    const { semester_name, academic_year, is_active } = req.body;

    if (!semester_name || !academic_year) {
      return res.status(400).json({ message: "Semester name and academic year are required." });
    }

    const [result] = await query(
      "INSERT INTO semesters (semester_name, academic_year, is_active) VALUES (?, ?, ?)",
      [semester_name, academic_year, is_active ? 1 : 0]
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

    const [result] = await query(
      "UPDATE semesters SET semester_name = ?, academic_year = ?, is_active = ? WHERE id = ?",
      [semester_name, academic_year, is_active ? 1 : 0, id]
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
