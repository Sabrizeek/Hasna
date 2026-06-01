import bcrypt from "bcrypt";
import { query } from "../config/db.js";

export const getPendingUsers = async (req, res) => {
  try {
    const [users] = await query(
      `SELECT u.id, u.full_name, u.email, u.role, u.status, u.department_id, d.department_name, u.created_at
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.status = 'pending' AND u.role IN ('student', 'lecturer')
       ORDER BY u.created_at ASC`
    );

    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch pending users.", error: error.message });
  }
};

export const approveUser = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await query("UPDATE users SET status = 'approved' WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json({ message: "User approved successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to approve user.", error: error.message });
  }
};

export const rejectUser = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await query("UPDATE users SET status = 'rejected' WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json({ message: "User rejected successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to reject user.", error: error.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const [users] = await query(
      `SELECT u.id, u.full_name, u.email, u.role, u.status, u.department_id, d.department_name, u.created_at, u.updated_at
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       ORDER BY u.created_at DESC`
    );

    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users.", error: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await query("DELETE FROM users WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json({ message: "User deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete user.", error: error.message });
  }
};
