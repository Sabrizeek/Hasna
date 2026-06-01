import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { query } from "../config/db.js";

const allowedRegisterRoles = ["student", "lecturer"];

const buildToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      status: user.status,
      department_id: user.department_id,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};

export const register = async (req, res) => {
  try {
    const { full_name, email, password, role, department_id } = req.body;

    if (!full_name || !email || !password || !role || !department_id) {
      return res.status(400).json({ message: "All fields are required." });
    }

    if (!allowedRegisterRoles.includes(role)) {
      return res.status(400).json({ message: "Only student and lecturer registration is allowed." });
    }

    const departmentId = Number(department_id);
    if (!Number.isInteger(departmentId) || departmentId <= 0) {
      return res.status(400).json({ message: "Invalid department." });
    }

    const [existingUsers] = await query("SELECT id FROM users WHERE email = ?", [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: "Email already exists." });
    }

    const [departments] = await query("SELECT id FROM departments WHERE id = ?", [departmentId]);
    if (departments.length === 0) {
      return res.status(400).json({ message: "Invalid department." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const status = "pending";

    const [result] = await query(
      "INSERT INTO users (full_name, email, password, role, status, department_id) VALUES (?, ?, ?, ?, ?, ?)",
      [full_name, email, hashedPassword, role, status, departmentId]
    );

    res.status(201).json({
      message: "Registration successful. Please wait for admin approval.",
      userId: result.insertId,
    });
  } catch (error) {
    res.status(500).json({ message: "Registration failed.", error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const [users] = await query(
      `SELECT u.id, u.full_name, u.email, u.password, u.role, u.status, u.department_id, d.department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.email = ?
       LIMIT 1`,
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    if (user.status === "pending") {
      return res.status(403).json({ message: "Your account is waiting for admin approval." });
    }

    if (user.status === "rejected") {
      return res.status(403).json({ message: "Your account has been rejected." });
    }

    const token = buildToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        status: user.status,
        department_id: user.department_id,
        department_name: user.department_name,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Login failed.", error: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const userId = req.user.id;

    const [users] = await query(
      `SELECT u.id, u.full_name, u.email, u.role, u.status, u.department_id, d.department_name, u.created_at, u.updated_at
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.id = ?
       LIMIT 1`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    res.json({ user: users[0] });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user profile.", error: error.message });
  }
};
