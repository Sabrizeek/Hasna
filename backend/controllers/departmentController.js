import { query } from "../config/db.js";
import { logAudit } from "../utils/auditLogger.js";

export const createDepartment = async (req, res) => {
  try {
    const { department_name, faculty_name } = req.body;

    if (!department_name || !faculty_name) {
      return res.status(400).json({ message: "Department name and faculty name are required." });
    }

    const [result] = await query(
      "INSERT INTO departments (department_name, faculty_name) VALUES (?, ?)",
      [department_name, faculty_name]
    );

    await logAudit({ userId: req.user?.id, action: "department_created", entityType: "department", entityId: result.insertId, details: { department_name, faculty_name } });
    res.status(201).json({ message: "Department created successfully.", departmentId: result.insertId });
  } catch (error) {
    res.status(500).json({ message: "Failed to create department.", error: error.message });
  }
};

export const getDepartments = async (req, res) => {
  try {
    const [departments] = await query("SELECT * FROM departments ORDER BY department_name ASC");
    res.json({ departments });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch departments.", error: error.message });
  }
};

export const getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const [departments] = await query("SELECT * FROM departments WHERE id = ?", [id]);

    if (departments.length === 0) {
      return res.status(404).json({ message: "Department not found." });
    }

    res.json({ department: departments[0] });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch department.", error: error.message });
  }
};

export const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { department_name, faculty_name } = req.body;

    const [result] = await query(
      "UPDATE departments SET department_name = ?, faculty_name = ? WHERE id = ?",
      [department_name, faculty_name, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Department not found." });
    }

    await logAudit({ userId: req.user?.id, action: "department_updated", entityType: "department", entityId: Number(id), details: { department_name, faculty_name } });
    res.json({ message: "Department updated successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to update department.", error: error.message });
  }
};

export const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await query("DELETE FROM departments WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Department not found." });
    }

    await logAudit({ userId: req.user?.id, action: "department_deleted", entityType: "department", entityId: Number(id) });
    res.json({ message: "Department deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete department.", error: error.message });
  }
};
