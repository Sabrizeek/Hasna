import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { query } from "../config/db.js";
import { notifyAdmins } from "../utils/notificationService.js";
import { sendPasswordResetEmail } from "../utils/emailService.js";

const publicRegistrationDisabledMessage = "Public registration is disabled. Please use your University ID to log in.";
const forgotPasswordGenericMessage = "If the details are correct, a password reset request will be sent to the Admin.";

const buildToken = (user) => jwt.sign(
  {
    id: user.id,
    university_id: user.university_id,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    status: user.status,
    department_id: user.department_id,
  },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
);

const toAuthUser = (user) => ({
  id: user.id,
  universityId: user.university_id,
  university_id: user.university_id,
  name: user.full_name,
  full_name: user.full_name,
  email: user.email,
  role: user.role,
  status: user.status,
  departmentId: user.department_id,
  department_id: user.department_id,
  department_name: user.department_name,
  profilePhoto: user.profile_photo,
  profile_photo: user.profile_photo,
  firstLogin: Boolean(user.first_login),
  first_login: Number(user.first_login || 0),
  mustChangePassword: Boolean(user.must_change_password),
  must_change_password: Number(user.must_change_password || 0),
});

const fetchUserForLogin = async (whereClause, params) => {
  const [users] = await query(
    `SELECT u.id, u.university_id, u.full_name, u.email, u.password, u.role, u.status,
            u.department_id, u.profile_photo, u.first_login, u.must_change_password,
            d.department_name
     FROM users u
     LEFT JOIN departments d ON u.department_id = d.id
     WHERE ${whereClause}
       AND u.deleted_at IS NULL
     LIMIT 1`,
    params
  );
  return users[0] || null;
};

const completeLogin = async (user, password, invalidMessage, res) => {
  if (!user) return res.status(401).json({ message: invalidMessage });

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) return res.status(401).json({ message: invalidMessage });

  if (user.status === "pending") return res.status(403).json({ message: "Your account is waiting for admin approval." });
  if (user.status === "rejected") return res.status(403).json({ message: "Your account has been rejected." });

  await query("UPDATE users SET last_login = NOW() WHERE id = ?", [user.id]);

  return res.json({
    token: buildToken(user),
    user: toAuthUser(user),
  });
};

export const register = async (req, res) => {
  res.status(403).json({ message: publicRegistrationDisabledMessage });
};

export const login = async (req, res) => {
  const identifier = req.body.identifier || req.body.email || req.body.universityId;
  const password = req.body.password;
  if (!identifier || !password) return res.status(400).json({ message: "University ID or email and password are required." });

  try {
    const user = await fetchUserForLogin("(u.university_id = ? OR u.email = ?)", [identifier, identifier]);
    return completeLogin(user, password, "Invalid credentials.", res);
  } catch (error) {
    return res.status(500).json({ message: "Login failed.", error: error.message });
  }
};

export const studentLogin = async (req, res) => {
  const universityId = req.body.universityId || req.body.university_id;
  const password = req.body.password;
  if (!universityId || !password) return res.status(400).json({ message: "University ID and password are required." });

  try {
    const user = await fetchUserForLogin("u.university_id = ? AND u.role = 'student'", [universityId]);
    return completeLogin(user, password, "Invalid University ID or password.", res);
  } catch (error) {
    return res.status(500).json({ message: "Student login failed.", error: error.message });
  }
};

export const staffLogin = async (req, res) => {
  const identifier = req.body.identifier || req.body.universityId || req.body.email;
  const password = req.body.password;
  if (!identifier || !password) return res.status(400).json({ message: "University ID or email and password are required." });

  try {
    const user = await fetchUserForLogin(
      "(u.university_id = ? OR u.email = ?) AND u.role IN ('lecturer', 'hod', 'dean', 'admin')",
      [identifier, identifier]
    );
    return completeLogin(user, password, "Invalid staff credentials.", res);
  } catch (error) {
    return res.status(500).json({ message: "Staff login failed.", error: error.message });
  }
};

export const forgotPasswordRequest = async (req, res) => {
  const universityId = req.body.universityId || req.body.university_id;
  const email = req.body.email;

  if (!universityId || !email) {
    return res.status(400).json({ message: "University ID and email are required." });
  }

  try {
    const [users] = await query(
      `SELECT id, university_id, email, full_name
       FROM users
       WHERE university_id = ?
         AND email = ?
         AND status = 'approved'
         AND deleted_at IS NULL
       LIMIT 1`,
      [universityId.trim(), email.trim()]
    );

    if (users.length > 0) {
      const user = users[0];
      
      // Generate a clean 8-character temporary password
      const tempPassword = Math.random().toString(36).substring(2, 10);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // Update the user's password directly in the database
      await query("UPDATE users SET password = ?, first_login = 1, must_change_password = 1 WHERE id = ?", [hashedPassword, user.id]);

      // Email it to the user
      await sendPasswordResetEmail({
        to: user.email,
        name: user.full_name,
        universityId: user.university_id,
        temporaryPassword: tempPassword,
      });
      
      return res.json({ message: "A temporary password has been sent to your email." });
    }

    // User wants an explicit error message if the ID or email is incorrect
    return res.status(404).json({ message: "No account found with the provided University ID and Email combination." });
  } catch (error) {
    res.status(500).json({ message: "Failed to process password reset request.", error: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters." });
    }

    const [users] = await query("SELECT id, password FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1", [userId]);
    if (users.length === 0) return res.status(404).json({ message: "User not found." });

    const isCurrentValid = await bcrypt.compare(currentPassword, users[0].password);
    if (!isCurrentValid) return res.status(401).json({ message: "Current password is incorrect." });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await query(
      "UPDATE users SET password = ?, first_login = 0, must_change_password = 0 WHERE id = ?",
      [hashedPassword, userId]
    );

    const user = await fetchUserForLogin("u.id = ?", [userId]);
    res.json({ message: "Password changed successfully.", user: toAuthUser(user) });
  } catch (error) {
    res.status(500).json({ message: "Failed to change password.", error: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await fetchUserForLogin("u.id = ?", [req.user.id]);
    if (!user) return res.status(404).json({ message: "User not found." });
    res.json({ user: toAuthUser(user) });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user profile.", error: error.message });
  }
};
