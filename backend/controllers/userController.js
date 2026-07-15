import bcrypt from "bcrypt";
import { query } from "../config/db.js";

const toUserProfile = (user) => ({
  id: user.id,
  universityId: user.university_id,
  university_id: user.university_id,
  name: user.full_name,
  full_name: user.full_name,
  email: user.email,
  role: user.role,
  departmentId: user.department_id,
  department_id: user.department_id,
  department_name: user.department_name,
  profilePhoto: user.profile_photo,
  profile_photo: user.profile_photo,
  phone: user.phone,
  firstLogin: Boolean(user.first_login),
  mustChangePassword: Boolean(user.must_change_password),
});

const getCurrentUser = async (userId) => {
  const [users] = await query(
    `SELECT u.id, u.university_id, u.full_name, u.email, u.role, u.department_id,
            u.profile_photo, u.phone, u.first_login, u.must_change_password, d.department_name
     FROM users u
     LEFT JOIN departments d ON u.department_id = d.id
     WHERE u.id = ? AND u.deleted_at IS NULL
     LIMIT 1`,
    [userId]
  );
  return users[0] || null;
};

const validatePasswordStrength = (password) => {
  if (!password || password.length < 8) return "New password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "New password must include at least one uppercase letter.";
  if (!/[a-z]/.test(password)) return "New password must include at least one lowercase letter.";
  if (!/[0-9]/.test(password)) return "New password must include at least one number.";
  return null;
};

export const getMyProfile = async (req, res) => {
  try {
    const user = await getCurrentUser(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found." });
    res.json({ user: toUserProfile(user) });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch profile.", error: error.message });
  }
};

export const updateMyProfile = async (req, res) => {
  try {
    const fullName = req.body.fullName || req.body.full_name || req.body.name;
    const phone = req.body.phone || null;
    if (!fullName?.trim()) return res.status(400).json({ message: "Name is required." });

    await query("UPDATE users SET full_name = ?, phone = ? WHERE id = ?", [fullName.trim(), phone, req.user.id]);
    const user = await getCurrentUser(req.user.id);
    res.json({ message: "Profile updated successfully.", user: toUserProfile(user) });
  } catch (error) {
    res.status(500).json({ message: "Failed to update profile.", error: error.message });
  }
};

export const updateMyPhoto = async (req, res) => {
  try {
    // Multer v2: fileFilter rejection is stored in req.fileValidationError
    if (req.fileValidationError) return res.status(400).json({ message: req.fileValidationError });
    if (!req.file) return res.status(400).json({ message: "Profile photo is required." });
    const photoUrl = `/uploads/profile-photos/${req.file.filename}`;
    await query("UPDATE users SET profile_photo = ? WHERE id = ?", [photoUrl, req.user.id]);
    const user = await getCurrentUser(req.user.id);
    res.json({ message: "Profile photo updated successfully.", user: toUserProfile(user) });
  } catch (error) {
    res.status(500).json({ message: "Failed to update profile photo.", error: error.message });
  }
};


export const updateMyPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "Current password, new password and confirmation are required." });
    }
    if (newPassword !== confirmPassword) return res.status(400).json({ message: "New password and confirmation do not match." });
    const strengthError = validatePasswordStrength(newPassword);
    if (strengthError) return res.status(400).json({ message: strengthError });

    const [users] = await query("SELECT id, password FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1", [req.user.id]);
    if (users.length === 0) return res.status(404).json({ message: "User not found." });
    const isValid = await bcrypt.compare(currentPassword, users[0].password);
    if (!isValid) return res.status(401).json({ message: "Current password is incorrect." });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await query("UPDATE users SET password = ?, first_login = 0, must_change_password = 0 WHERE id = ?", [hashedPassword, req.user.id]);
    const user = await getCurrentUser(req.user.id);
    res.json({ message: "Password changed successfully.", user: toUserProfile(user) });
  } catch (error) {
    res.status(500).json({ message: "Failed to change password.", error: error.message });
  }
};
