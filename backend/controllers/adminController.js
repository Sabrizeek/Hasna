import bcrypt from "bcrypt";
import { query } from "../config/db.js";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { logAudit } from "../utils/auditLogger.js";
import { supervisionReportsUploadDir } from "../utils/uploadDirectories.js";
import {
  sendAccountCreatedEmail,
  sendPasswordResetApprovedEmail,
  sendPasswordResetEmail,
  sendPasswordResetRejectedEmail,
} from "../utils/emailService.js";
import { notifyRole, notifyUser } from "../utils/notificationService.js";

const parsePositiveInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseScore = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : null;
};

const defaultUserPassword = () => process.env.DEFAULT_USER_PASSWORD || "UOR@12345";

const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

const buildEvaluationRecordFilters = (filters = {}) => {
  const departmentId = filters.departmentId ? parsePositiveInt(filters.departmentId) : null;
  const courseId = filters.courseId ? parsePositiveInt(filters.courseId) : null;
  const lecturerId = filters.lecturerId ? parsePositiveInt(filters.lecturerId) : null;
  const semesterId = filters.semesterId ? parsePositiveInt(filters.semesterId) : null;
  const academicYear = filters.academicYear?.trim();
  const type = filters.type?.trim();
  const dateFrom = filters.dateFrom || filters.from;
  const dateTo = filters.dateTo || filters.to;
  const search = filters.search?.trim();

  if (type && !["theory", "practical"].includes(type)) {
    return { error: "Evaluation type must be theory or practical." };
  }

  const conditions = [];
  const params = [];

  if (departmentId) { conditions.push("d.id = ?"); params.push(departmentId); }
  if (courseId) { conditions.push("c.id = ?"); params.push(courseId); }
  if (lecturerId) { conditions.push("l.id = ?"); params.push(lecturerId); }
  if (semesterId) { conditions.push("es.semester_id = ?"); params.push(semesterId); }
  if (academicYear) { conditions.push("es.academic_year = ?"); params.push(academicYear); }
  if (type) { conditions.push("es.type = ?"); params.push(type); }
  if (dateFrom) { conditions.push("DATE(es.submitted_at) >= ?"); params.push(dateFrom); }
  if (dateTo) { conditions.push("DATE(es.submitted_at) <= ?"); params.push(dateTo); }
  if (search) {
    conditions.push(`(
      st.full_name LIKE ? OR st.email LIKE ? OR l.full_name LIKE ? OR
      c.course_code LIKE ? OR c.course_name LIKE ? OR d.department_name LIKE ?
    )`);
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  return {
    where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
    auditFilters: { departmentId, courseId, lecturerId, semesterId, academicYear, type, dateFrom, dateTo, search },
  };
};

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

    await logAudit({ userId: req.user.id, action: "user_approved", entityType: "user", entityId: Number(id) });
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

    await logAudit({ userId: req.user.id, action: "user_rejected", entityType: "user", entityId: Number(id) });
    res.json({ message: "User rejected successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to reject user.", error: error.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const [users] = await query(
      `SELECT u.id, u.university_id, u.full_name, u.email, u.role, u.status, u.department_id,
              u.profile_photo, u.phone, u.first_login, u.must_change_password, u.last_login,
              d.department_name, u.created_at, u.updated_at
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.deleted_at IS NULL
       ORDER BY u.created_at DESC`
    );

    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users.", error: error.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const { universityId, fullName, email, role, departmentId, phone, designation, qualifications, status = "approved" } = req.body;
    const allowedRoles = ["student", "lecturer", "hod", "dean", "admin"];
    const resolvedDepartmentId = departmentId ? parsePositiveInt(departmentId) : null;
    const normalizedUniversityId = universityId?.trim();
    const normalizedFullName = fullName?.trim();
    const normalizedEmail = email?.trim();

    if (!normalizedUniversityId || !normalizedFullName || !normalizedEmail || !role) {
      return res.status(400).json({ message: "University ID, name, email and role are required." });
    }
    if (!allowedRoles.includes(role)) return res.status(400).json({ message: "Invalid user role." });
    if (role !== "admin" && !resolvedDepartmentId) return res.status(400).json({ message: "Department is required for this role." });

    const defaultPassword = defaultUserPassword();
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    const [activeConflicts] = await query(
      `SELECT id FROM users
       WHERE deleted_at IS NULL AND (university_id = ? OR email = ?)
       LIMIT 1`,
      [normalizedUniversityId, normalizedEmail]
    );
    if (activeConflicts.length > 0) {
      return res.status(409).json({ message: "University ID or email already exists." });
    }

    const [deletedMatches] = await query(
      `SELECT id FROM users
       WHERE deleted_at IS NOT NULL AND (university_id = ? OR email = ?)
       ORDER BY deleted_at DESC
       LIMIT 1`,
      [normalizedUniversityId, normalizedEmail]
    );

    let userId;
    let restored = false;

    if (deletedMatches.length > 0) {
      userId = deletedMatches[0].id;
      restored = true;
      await query(
        `UPDATE users
         SET university_id = ?, full_name = ?, email = ?, password = ?, role = ?, status = ?,
             department_id = ?, phone = ?, first_login = 1, must_change_password = 1,
             created_by = ?, deleted_at = NULL
         WHERE id = ?`,
        [normalizedUniversityId, normalizedFullName, normalizedEmail, hashedPassword, role, status, resolvedDepartmentId, phone || null, req.user.id, userId]
      );
    } else {
      const [result] = await query(
        `INSERT INTO users (university_id, full_name, email, password, role, status, department_id, phone, first_login, must_change_password, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?)`,
        [normalizedUniversityId, normalizedFullName, normalizedEmail, hashedPassword, role, status, resolvedDepartmentId, phone || null, req.user.id]
      );
      userId = result.insertId;
    }

    if (["lecturer", "hod", "dean"].includes(role)) {
      await query(
        `INSERT INTO lecturer_profiles (user_id, designation, qualifications)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE designation = VALUES(designation), qualifications = VALUES(qualifications)`,
        [userId, designation || null, qualifications || null]
      );
    }

    const emailStatus = await sendAccountCreatedEmail({
      to: normalizedEmail,
      name: normalizedFullName,
      universityId: normalizedUniversityId,
      email: normalizedEmail,
      defaultPassword,
    });

    await notifyUser({
      userId,
      title: "LES Account Created",
      message: "Your LES account has been created. Please log in with your University ID and default password.",
      type: "success",
      relatedEntityType: "user",
      relatedEntityId: userId,
    });

    await logAudit({
      userId: req.user.id,
      action: restored ? "user_restored" : "user_created",
      entityType: "user",
      entityId: userId,
      details: { universityId: normalizedUniversityId, role, departmentId: resolvedDepartmentId },
    });

    res.status(restored ? 200 : 201).json({
      message: restored ? "Deleted user restored and credentials resent successfully." : "User created successfully.",
      userId,
      emailStatus,
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "University ID or email already exists." });
    }
    res.status(500).json({ message: "Failed to create user.", error: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    const { universityId, fullName, email, role, departmentId, phone, status, designation, qualifications } = req.body;
    if (!id || !universityId || !fullName || !email || !role || !status) {
      return res.status(400).json({ message: "University ID, name, email, role and status are required." });
    }
    const resolvedDepartmentId = role === "admin" ? null : parsePositiveInt(departmentId);
    if (role !== "admin" && !resolvedDepartmentId) return res.status(400).json({ message: "Department is required for this role." });

    const [result] = await query(
      `UPDATE users
       SET university_id = ?, full_name = ?, email = ?, role = ?, status = ?, department_id = ?, phone = ?
       WHERE id = ? AND deleted_at IS NULL`,
      [universityId.trim(), fullName.trim(), email.trim(), role, status, resolvedDepartmentId, phone || null, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: "User not found." });

    if (["lecturer", "hod", "dean"].includes(role)) {
      await query(
        `INSERT INTO lecturer_profiles (user_id, designation, qualifications)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE designation = VALUES(designation), qualifications = VALUES(qualifications)`,
        [id, designation || null, qualifications || null]
      );
    }

    await logAudit({ userId: req.user.id, action: "user_updated", entityType: "user", entityId: id, details: { universityId, role, status } });
    res.json({ message: "User updated successfully." });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "University ID or email already exists." });
    res.status(500).json({ message: "Failed to update user.", error: error.message });
  }
};

export const deactivateUser = async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    const [result] = await query("UPDATE users SET status = 'rejected' WHERE id = ? AND deleted_at IS NULL", [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "User not found." });
    await logAudit({ userId: req.user.id, action: "user_deactivated", entityType: "user", entityId: id });
    res.json({ message: "User deactivated successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to deactivate user.", error: error.message });
  }
};

export const activateUser = async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    const [result] = await query("UPDATE users SET status = 'approved' WHERE id = ? AND deleted_at IS NULL", [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "User not found." });
    await logAudit({ userId: req.user.id, action: "user_activated", entityType: "user", entityId: id });
    await notifyUser({
      userId: id,
      title: "Account Activated",
      message: "Your LES account has been activated.",
      type: "success",
      relatedEntityType: "user",
      relatedEntityId: id,
    });
    res.json({ message: "User activated successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to activate user.", error: error.message });
  }
};

export const resetUserPassword = async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    const [users] = await query("SELECT id, university_id, full_name, email FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1", [id]);
    if (users.length === 0) return res.status(404).json({ message: "User not found." });

    const defaultPassword = defaultUserPassword();
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    await query("UPDATE users SET password = ?, first_login = 1, must_change_password = 1 WHERE id = ?", [hashedPassword, id]);

    const emailStatus = await sendPasswordResetEmail({
      to: users[0].email,
      name: users[0].full_name,
      universityId: users[0].university_id,
      defaultPassword,
    });

    await logAudit({ userId: req.user.id, action: "user_password_reset", entityType: "user", entityId: id });
    res.json({ message: "Password reset to the default password and notification sent.", emailStatus });
  } catch (error) {
    res.status(500).json({ message: "Failed to reset password.", error: error.message });
  }
};

export const getPasswordResetRequests = async (req, res) => {
  try {
    const status = req.query.status?.trim();
    const allowedStatuses = ["pending", "approved", "rejected"];
    const params = [];
    const statusFilter = allowedStatuses.includes(status) ? "WHERE prr.status = ?" : "";
    if (statusFilter) params.push(status);

    const [requests] = await query(
      `SELECT prr.id, prr.user_id AS userId, prr.university_id AS universityId,
              prr.email, prr.status, prr.requested_at AS requestedAt,
              prr.reviewed_at AS reviewedAt, prr.admin_note AS adminNote,
              u.full_name AS fullName, u.role, d.department_name AS departmentName,
              reviewer.full_name AS reviewedByName
       FROM password_reset_requests prr
       INNER JOIN users u ON prr.user_id = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN users reviewer ON prr.reviewed_by = reviewer.id
       ${statusFilter}
       ORDER BY prr.requested_at DESC`,
      params
    );

    res.json({ requests });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch password reset requests.", error: error.message });
  }
};

export const approvePasswordResetRequest = async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) return res.status(400).json({ message: "Valid request ID is required." });

    const [requests] = await query(
      `SELECT prr.id, prr.status, u.id AS userId, u.full_name, u.email, u.university_id
       FROM password_reset_requests prr
       INNER JOIN users u ON prr.user_id = u.id
       WHERE prr.id = ? AND u.deleted_at IS NULL
       LIMIT 1`,
      [id]
    );
    if (requests.length === 0) return res.status(404).json({ message: "Password reset request not found." });
    if (requests[0].status !== "pending") return res.status(409).json({ message: "This request has already been reviewed." });

    const request = requests[0];
    const defaultPassword = defaultUserPassword();
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    await query(
      "UPDATE users SET password = ?, first_login = 1, must_change_password = 1 WHERE id = ?",
      [hashedPassword, request.userId]
    );
    await query(
      "UPDATE password_reset_requests SET status = 'approved', reviewed_by = ?, reviewed_at = NOW(), admin_note = NULL WHERE id = ?",
      [req.user.id, id]
    );

    const emailStatus = await sendPasswordResetApprovedEmail({
      to: request.email,
      name: request.full_name,
      universityId: request.university_id,
      defaultPassword,
    });

    await notifyUser({
      userId: request.userId,
      title: "Password Reset Approved",
      message: "Your password was reset to the default password. Please log in and change it immediately.",
      type: "success",
      relatedEntityType: "password_reset_request",
      relatedEntityId: id,
    });

    await logAudit({
      userId: req.user.id,
      action: "password_reset_request_approved",
      entityType: "password_reset_request",
      entityId: id,
      details: { userId: request.userId, universityId: request.university_id },
    });

    res.json({ message: "Password reset request approved and user password reset.", emailStatus });
  } catch (error) {
    res.status(500).json({ message: "Failed to approve password reset request.", error: error.message });
  }
};

export const rejectPasswordResetRequest = async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    const adminNote = req.body.adminNote?.trim() || null;
    if (!id) return res.status(400).json({ message: "Valid request ID is required." });

    const [requests] = await query(
      `SELECT prr.id, prr.status, u.id AS userId, u.full_name, u.email
       FROM password_reset_requests prr
       INNER JOIN users u ON prr.user_id = u.id
       WHERE prr.id = ? AND u.deleted_at IS NULL
       LIMIT 1`,
      [id]
    );
    if (requests.length === 0) return res.status(404).json({ message: "Password reset request not found." });
    if (requests[0].status !== "pending") return res.status(409).json({ message: "This request has already been reviewed." });

    const request = requests[0];
    await query(
      "UPDATE password_reset_requests SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW(), admin_note = ? WHERE id = ?",
      [req.user.id, adminNote, id]
    );

    const emailStatus = await sendPasswordResetRejectedEmail({
      to: request.email,
      name: request.full_name,
      adminNote,
    });

    await notifyUser({
      userId: request.userId,
      title: "Password Reset Rejected",
      message: "Your password reset request was rejected. Please contact the system administrator for support.",
      type: "error",
      relatedEntityType: "password_reset_request",
      relatedEntityId: id,
    });

    await logAudit({
      userId: req.user.id,
      action: "password_reset_request_rejected",
      entityType: "password_reset_request",
      entityId: id,
      details: { userId: request.userId, adminNote },
    });

    res.json({ message: "Password reset request rejected.", emailStatus });
  } catch (error) {
    res.status(500).json({ message: "Failed to reject password reset request.", error: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) return res.status(400).json({ message: "Valid user ID is required." });

    const [users] = await query(
      "SELECT id, university_id, email FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1",
      [id]
    );
    if (users.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    const releasedUniversityId = `DEL${id}_${String(users[0].university_id || "").slice(0, 35)}`;
    const releasedEmail = `deleted-${id}-${String(users[0].email || "").slice(0, 120)}`;

    const [result] = await query(
      `UPDATE users
       SET deleted_at = NOW(),
           status = 'rejected',
           university_id = ?,
           email = ?
       WHERE id = ? AND deleted_at IS NULL`,
      [releasedUniversityId, releasedEmail, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    await logAudit({
      userId: req.user.id,
      action: "user_deleted",
      entityType: "user",
      entityId: id,
      details: { releasedUniversityId: users[0].university_id, releasedEmail: users[0].email },
    });
    res.json({ message: "User deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete user.", error: error.message });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    await syncEvaluationWindowStatuses();
    const [[students], [lecturers], [hods], [submissions], [windows], [pendingReports], [recentReports], [recentActivity]] =
      await Promise.all([
        query("SELECT COUNT(*) AS count FROM users WHERE role = 'student'"),
        query("SELECT COUNT(*) AS count FROM users WHERE role = 'lecturer'"),
        query("SELECT COUNT(*) AS count FROM users WHERE role = 'hod'"),
        query("SELECT COUNT(*) AS count FROM evaluation_submissions"),
        query("SELECT COUNT(*) AS count FROM evaluation_windows WHERE status = 'open' AND open_date <= NOW() AND close_date > NOW()"),
        query("SELECT COUNT(*) AS count FROM supervision_reports WHERE status IN ('submitted', 'under_review')"),
        query(
          `SELECT sr.id, sr.title, sr.status, sr.submitted_at, u.full_name AS lecturer_name
           FROM supervision_reports sr
           INNER JOIN users u ON sr.lecturer_id = u.id
           ORDER BY sr.submitted_at DESC
           LIMIT 5`
        ),
        query(
          `SELECT al.id, al.action, al.entity_type, al.created_at, u.full_name AS user_name
           FROM audit_logs al
           LEFT JOIN users u ON al.user_id = u.id
           ORDER BY al.created_at DESC
           LIMIT 5`
        ),
      ]);

    res.json({
      stats: {
        totalStudents: Number(students[0]?.count || 0),
        totalLecturers: Number(lecturers[0]?.count || 0),
        totalHoDs: Number(hods[0]?.count || 0),
        totalSubmissions: Number(submissions[0]?.count || 0),
        activeEvaluationWindows: Number(windows[0]?.count || 0),
        pendingSupervisionReports: Number(pendingReports[0]?.count || 0),
      },
      recentReports,
      recentActivity,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch dashboard stats.", error: error.message });
  }
};

export const getModuleAssignments = async (req, res) => {
  try {
    const [assignments] = await query(
      `SELECT lm.id, lm.lecturer_id, u.full_name AS lecturer_name,
              c.id AS course_id, c.course_code, c.course_name, c.department_id,
              d.department_name, s.id AS semester_id, s.semester_name, lm.academic_year
       FROM lecturer_modules lm
       INNER JOIN users u ON lm.lecturer_id = u.id
       INNER JOIN courses c ON lm.course_id = c.id
       INNER JOIN departments d ON c.department_id = d.id
       INNER JOIN semesters s ON lm.semester_id = s.id
       ORDER BY d.department_name, c.course_code, s.semester_name, u.full_name`
    );
    res.json({ assignments });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch module assignments.", error: error.message });
  }
};

export const createModuleAssignment = async (req, res) => {
  try {
    const lecturerId = parsePositiveInt(req.body.lecturerId);
    const courseId = parsePositiveInt(req.body.courseId);
    const semesterId = parsePositiveInt(req.body.semesterId);
    const academicYear = req.body.academicYear?.trim();

    if (!lecturerId || !courseId || !semesterId || !academicYear) {
      return res.status(400).json({ message: "Lecturer, course, semester and academic year are required." });
    }

    const [result] = await query(
      `INSERT INTO lecturer_modules (lecturer_id, course_id, semester_id, academic_year)
       VALUES (?, ?, ?, ?)`,
      [lecturerId, courseId, semesterId, academicYear]
    );

    try {
      const [assignmentInfo] = await query(
        `SELECT c.course_code, c.course_name, s.semester_name
         FROM courses c
         INNER JOIN semesters s ON s.id = ?
         WHERE c.id = ?
         LIMIT 1`,
        [semesterId, courseId]
      );

      await notifyUser({
        userId: lecturerId,
        title: "Module Assigned",
        message: `You have been assigned to ${assignmentInfo[0]?.course_code || "a module"} - ${assignmentInfo[0]?.course_name || "Course"} for ${assignmentInfo[0]?.semester_name || "the selected semester"} ${academicYear}.`,
        type: "system",
        relatedEntityType: "lecturer_module",
        relatedEntityId: result.insertId,
      });
    } catch (notificationError) {
      console.error("Module assignment notification failed:", notificationError.message);
    }

    await logAudit({
      userId: req.user.id,
      action: "module_assignment_created",
      entityType: "lecturer_module",
      entityId: result.insertId,
      details: { lecturerId, courseId, semesterId, academicYear },
    });

    res.status(201).json({ message: "Module assignment created successfully.", assignmentId: result.insertId });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "This lecturer is already assigned to that module." });
    }
    res.status(500).json({ message: "Failed to create module assignment.", error: error.message });
  }
};

export const deleteModuleAssignment = async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    const [result] = await query("DELETE FROM lecturer_modules WHERE id = ?", [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Assignment not found." });
    await logAudit({ userId: req.user.id, action: "module_assignment_removed", entityType: "lecturer_module", entityId: id });
    res.json({ message: "Module assignment removed successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to remove module assignment.", error: error.message });
  }
};

export const getEvaluationWindows = async (req, res) => {
  try {
    await syncEvaluationWindowStatuses();
    const [windows] = await query(
      `SELECT ew.*, s.semester_name, u.full_name AS created_by_name
       FROM evaluation_windows ew
       INNER JOIN semesters s ON ew.semester_id = s.id
       LEFT JOIN users u ON ew.created_by = u.id
       ORDER BY ew.open_date DESC`
    );
    res.json({ windows });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch evaluation windows.", error: error.message });
  }
};

const getWindowStatus = (openDate, closeDate) => {
  const now = new Date();
  if (new Date(closeDate) <= now) return "closed";
  if (new Date(openDate) <= now) return "open";
  return "scheduled";
};

const syncEvaluationWindowStatuses = async () => {
  await query("UPDATE evaluation_windows SET status = 'closed' WHERE status != 'closed' AND close_date <= NOW()");
  await query("UPDATE evaluation_windows SET status = 'open' WHERE status = 'scheduled' AND open_date <= NOW() AND close_date > NOW()");
};

const validateWindow = async ({ semesterId, academicYear, openDate, closeDate, excludeId = null }) => {
  if (!semesterId || !academicYear || !openDate || !closeDate) return "Semester, academic year, open date and close date are required.";
  if (new Date(openDate) >= new Date(closeDate)) return "Open date must be before close date.";
  await syncEvaluationWindowStatuses();
  const params = [semesterId, academicYear, closeDate, openDate];
  let exclude = "";
  if (excludeId) {
    exclude = "AND id != ?";
    params.push(excludeId);
  }
  const [rows] = await query(
    `SELECT id FROM evaluation_windows
     WHERE semester_id = ? AND academic_year = ?
       AND status != 'closed'
       AND open_date < ? AND close_date > ?
       ${exclude}
     LIMIT 1`,
    params
  );
  return rows.length ? "Evaluation window overlaps with an existing window." : null;
};

export const createEvaluationWindow = async (req, res) => {
  try {
    const payload = {
      semesterId: parsePositiveInt(req.body.semesterId),
      academicYear: req.body.academicYear?.trim(),
      openDate: req.body.openDate,
      closeDate: req.body.closeDate,
    };
    const validationError = await validateWindow(payload);
    if (validationError) return res.status(400).json({ message: validationError });

    const status = getWindowStatus(payload.openDate, payload.closeDate);
    const [result] = await query(
      `INSERT INTO evaluation_windows (semester_id, academic_year, open_date, close_date, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [payload.semesterId, payload.academicYear, payload.openDate, payload.closeDate, status, req.user.id]
    );
    if (status === "open") {
      const [semesters] = await query("SELECT semester_name FROM semesters WHERE id = ? LIMIT 1", [payload.semesterId]);
      await notifyRole("student", {
        title: "Evaluation Window Open",
        message: `Evaluation window is now open for ${semesters[0]?.semester_name || "the selected semester"} ${payload.academicYear}.`,
        type: "system",
        relatedEntityType: "evaluation_window",
        relatedEntityId: result.insertId,
      });
    }
    await logAudit({ userId: req.user.id, action: "evaluation_window_created", entityType: "evaluation_window", entityId: result.insertId, details: payload });
    res.status(201).json({ message: "Evaluation window created successfully.", windowId: result.insertId });
  } catch (error) {
    res.status(500).json({ message: "Failed to create evaluation window.", error: error.message });
  }
};

export const updateEvaluationWindow = async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    const payload = {
      semesterId: parsePositiveInt(req.body.semesterId),
      academicYear: req.body.academicYear?.trim(),
      openDate: req.body.openDate,
      closeDate: req.body.closeDate,
      excludeId: id,
    };
    const validationError = await validateWindow(payload);
    if (validationError) return res.status(400).json({ message: validationError });
    const status = getWindowStatus(payload.openDate, payload.closeDate);
    const [result] = await query(
      `UPDATE evaluation_windows SET semester_id = ?, academic_year = ?, open_date = ?, close_date = ?, status = ? WHERE id = ?`,
      [payload.semesterId, payload.academicYear, payload.openDate, payload.closeDate, status, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: "Evaluation window not found." });
    await logAudit({ userId: req.user.id, action: "evaluation_window_updated", entityType: "evaluation_window", entityId: id, details: payload });
    res.json({ message: "Evaluation window updated successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to update evaluation window.", error: error.message });
  }
};

export const reopenEvaluationWindow = async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    const closeDate = req.body.closeDate;
    const openDate = req.body.openDate;
    if (!id) return res.status(400).json({ message: "Valid evaluation window ID is required." });

    const [existing] = await query("SELECT * FROM evaluation_windows WHERE id = ? LIMIT 1", [id]);
    if (existing.length === 0) return res.status(404).json({ message: "Evaluation window not found." });

    const nextOpenDate = openDate || existing[0].open_date;
    const nextCloseDate = closeDate || existing[0].close_date;
    const validationError = await validateWindow({
      semesterId: existing[0].semester_id,
      academicYear: existing[0].academic_year,
      openDate: nextOpenDate,
      closeDate: nextCloseDate,
      excludeId: id,
    });
    if (validationError) return res.status(400).json({ message: validationError });

    const status = getWindowStatus(nextOpenDate, nextCloseDate);
    if (status === "closed") return res.status(400).json({ message: "Close date must be in the future to reopen a window." });

    await query(
      "UPDATE evaluation_windows SET open_date = ?, close_date = ?, status = ? WHERE id = ?",
      [nextOpenDate, nextCloseDate, status, id]
    );

    await notifyRole("student", {
      title: "Evaluation Window Reopened",
      message: `Evaluation window has been reopened for ${existing[0].academic_year}.`,
      type: "system",
      relatedEntityType: "evaluation_window",
      relatedEntityId: id,
    });
    await logAudit({ userId: req.user.id, action: "evaluation_window_reopened", entityType: "evaluation_window", entityId: id, details: { openDate: nextOpenDate, closeDate: nextCloseDate } });
    res.json({ message: "Evaluation window reopened successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to reopen evaluation window.", error: error.message });
  }
};

export const deleteEvaluationWindow = async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) return res.status(400).json({ message: "Valid evaluation window ID is required." });
    const [result] = await query("DELETE FROM evaluation_windows WHERE id = ?", [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Evaluation window not found." });
    await logAudit({ userId: req.user.id, action: "evaluation_window_deleted", entityType: "evaluation_window", entityId: id });
    res.json({ message: "Evaluation window deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete evaluation window.", error: error.message });
  }
};

export const closeEvaluationWindow = async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    const [existing] = await query(
      `SELECT ew.id, ew.status, ew.academic_year, s.semester_name
       FROM evaluation_windows ew
       INNER JOIN semesters s ON ew.semester_id = s.id
       WHERE ew.id = ?
       LIMIT 1`,
      [id]
    );
    if (existing.length === 0) return res.status(404).json({ message: "Evaluation window not found." });
    if (existing[0].status === "closed") {
      return res.json({ message: "Evaluation window is already closed.", alreadyClosed: true });
    }

    const [result] = await query("UPDATE evaluation_windows SET status = 'closed', close_date = NOW() WHERE id = ? AND status != 'closed'", [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Evaluation window not found." });
    await notifyRole("student", {
      title: "Evaluation Window Closed",
      message: `Evaluation window is now closed for ${existing[0].semester_name} ${existing[0].academic_year}.`,
      type: "system",
      relatedEntityType: "evaluation_window",
      relatedEntityId: id,
    });
    await logAudit({ userId: req.user.id, action: "evaluation_window_closed", entityType: "evaluation_window", entityId: id });
    res.json({ message: "Evaluation window closed successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to close evaluation window.", error: error.message });
  }
};

export const getAccessTokens = async (req, res) => {
  try {
    const [tokens] = await query(
      `SELECT tok.*, d.department_name, s.semester_name, u.full_name AS created_by_name
       FROM access_tokens tok
       LEFT JOIN departments d ON tok.department_id = d.id
       INNER JOIN semesters s ON tok.semester_id = s.id
       LEFT JOIN users u ON tok.created_by = u.id
       ORDER BY tok.created_at DESC`
    );
    res.json({ tokens });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch access tokens.", error: error.message });
  }
};

export const generateAccessToken = async (req, res) => {
  try {
    const departmentId = req.body.departmentId ? parsePositiveInt(req.body.departmentId) : null;
    const semesterId = parsePositiveInt(req.body.semesterId);
    const academicYear = req.body.academicYear?.trim();
    const expiresAt = req.body.expiresAt;
    if (!semesterId || !academicYear || !expiresAt) return res.status(400).json({ message: "Semester, academic year and expiry are required." });
    const token = crypto.randomBytes(16).toString("hex");
    const [result] = await query(
      `INSERT INTO access_tokens (token, department_id, semester_id, academic_year, status, expires_at, created_by)
       VALUES (?, ?, ?, ?, 'active', ?, ?)`,
      [token, departmentId, semesterId, academicYear, expiresAt, req.user.id]
    );
    await logAudit({ userId: req.user.id, action: "access_token_generated", entityType: "access_token", entityId: result.insertId, details: { departmentId, semesterId, academicYear } });
    res.status(201).json({ message: "Access token generated successfully.", token });
  } catch (error) {
    res.status(500).json({ message: "Failed to generate access token.", error: error.message });
  }
};

export const revokeAccessToken = async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    const [result] = await query("UPDATE access_tokens SET status = 'revoked' WHERE id = ?", [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Access token not found." });
    await logAudit({ userId: req.user.id, action: "access_token_revoked", entityType: "access_token", entityId: id });
    res.json({ message: "Access token revoked successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to revoke access token.", error: error.message });
  }
};

export const getAdminSupervisionReports = async (req, res) => {
  try {
    const [reports] = await query(
      `SELECT sr.*, u.full_name AS lecturer_name, d.department_name
       FROM supervision_reports sr
       INNER JOIN users u ON sr.lecturer_id = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       ORDER BY sr.submitted_at DESC`
    );
    res.json({ reports });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch supervision reports.", error: error.message });
  }
};

export const updateSupervisionReportStatus = async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    const status = req.body.status;
    const adminComment = req.body.adminComment || null;
    if (!["submitted", "under_review", "accepted", "rejected"].includes(status)) return res.status(400).json({ message: "Invalid report status." });
    const [result] = await query(
      "UPDATE supervision_reports SET status = ?, admin_comment = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?",
      [status, adminComment, req.user.id, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: "Report not found." });
    const [reports] = await query("SELECT lecturer_id, title FROM supervision_reports WHERE id = ? LIMIT 1", [id]);
    if (reports.length > 0) {
      await notifyUser({
        userId: reports[0].lecturer_id,
        title: "Supervision Report Updated",
        message: `Your supervision report "${reports[0].title}" status has been updated to ${status}.`,
        type: status === "accepted" ? "success" : status === "rejected" ? "error" : "info",
        relatedEntityType: "supervision_report",
        relatedEntityId: id,
      });
    }
    await logAudit({ userId: req.user.id, action: "supervision_report_status_changed", entityType: "supervision_report", entityId: id, details: { status, adminComment } });
    res.json({ message: "Report status updated successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to update report status.", error: error.message });
  }
};

export const downloadAdminSupervisionReport = async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    const [reports] = await query("SELECT file_name, file_path FROM supervision_reports WHERE id = ? LIMIT 1", [id]);
    if (reports.length === 0) return res.status(404).json({ message: "Report not found." });
    const absolutePath = path.join(supervisionReportsUploadDir, path.basename(reports[0].file_path));
    if (!fs.existsSync(absolutePath)) return res.status(404).json({ message: "Report file not found." });
    res.download(absolutePath, reports[0].file_name);
  } catch (error) {
    res.status(500).json({ message: "Failed to download report.", error: error.message });
  }
};

export const getAdminEvaluations = async (req, res) => {
  try {
    const filter = buildEvaluationRecordFilters(req.query);
    if (filter.error) return res.status(400).json({ message: filter.error });

    const [rows] = await query(
      `SELECT es.id AS submissionId, es.submitted_at AS submittedAt,
              st.id AS studentId, st.full_name AS studentName, st.email AS studentEmail,
              st.university_id AS studentRegistrationNumber,
              d.id AS departmentId, d.department_name AS departmentName,
              c.id AS courseId, c.course_code AS courseCode, c.course_name AS courseName,
              l.id AS lecturerId, l.full_name AS lecturerName,
              s.id AS semesterId, s.semester_name AS semesterName,
              es.academic_year AS academicYear, es.type, es.overall_grade AS overallGrade,
              es.comment_text AS commentText
       FROM evaluation_submissions es
       INNER JOIN users st ON es.student_id = st.id
       INNER JOIN users l ON es.lecturer_id = l.id
       INNER JOIN courses c ON es.course_id = c.id
       INNER JOIN departments d ON c.department_id = d.id
       INNER JOIN semesters s ON es.semester_id = s.id
       ${filter.where}
       ORDER BY es.submitted_at DESC`,
      filter.params
    );

    res.json({ evaluations: rows });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch evaluation records.", error: error.message });
  }
};

export const getAdminEvaluationById = async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) return res.status(400).json({ message: "Valid evaluation submission ID is required." });

    const [submissions] = await query(
      `SELECT es.id AS submissionId, es.submitted_at AS submittedAt,
              st.id AS studentId, st.full_name AS studentName, st.email AS studentEmail,
              st.university_id AS studentRegistrationNumber,
              d.id AS departmentId, d.department_name AS departmentName,
              c.id AS courseId, c.course_code AS courseCode, c.course_name AS courseName,
              l.id AS lecturerId, l.full_name AS lecturerName, l.email AS lecturerEmail,
              s.id AS semesterId, s.semester_name AS semesterName,
              es.academic_year AS academicYear, es.type, es.overall_grade AS overallGrade,
              es.comment_text AS commentText
       FROM evaluation_submissions es
       INNER JOIN users st ON es.student_id = st.id
       INNER JOIN users l ON es.lecturer_id = l.id
       INNER JOIN courses c ON es.course_id = c.id
       INNER JOIN departments d ON c.department_id = d.id
       INNER JOIN semesters s ON es.semester_id = s.id
       WHERE es.id = ?
       LIMIT 1`,
      [id]
    );

    if (submissions.length === 0) return res.status(404).json({ message: "Evaluation record not found." });

    const [responses] = await query(
      `SELECT q.id AS questionId, q.label, q.question_text AS questionText,
              q.display_order AS displayOrder, er.score
       FROM evaluation_responses er
       INNER JOIN questions q ON er.question_id = q.id
       WHERE er.submission_id = ?
       ORDER BY q.display_order ASC, q.id ASC`,
      [id]
    );

    await logAudit({
      userId: req.user.id,
      action: "evaluation_record_viewed",
      entityType: "evaluation_submission",
      entityId: id,
      details: { studentRegistrationNumber: submissions[0].studentRegistrationNumber },
    });

    res.json({ evaluation: { ...submissions[0], responses } });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch evaluation record.", error: error.message });
  }
};

export const exportEvaluations = async (req, res) => {
  try {
    const filter = buildEvaluationRecordFilters(req.query);
    if (filter.error) return res.status(400).json({ message: filter.error });

    const [rows] = await query(
      `SELECT es.id AS submission_id, st.id AS student_id, st.full_name AS student_name,
              st.email AS student_email, st.university_id AS student_registration_number,
              d.department_name, c.course_code, c.course_name, s.semester_name,
              es.academic_year, l.full_name AS lecturer_name, l.email AS lecturer_email,
              es.type, es.overall_grade, es.comment_text, es.submitted_at,
              GROUP_CONCAT(CONCAT(COALESCE(q.label, CONCAT('Q', q.display_order)), ': ', er.score)
                           ORDER BY q.display_order ASC SEPARATOR ' | ') AS question_scores
       FROM evaluation_submissions es
       INNER JOIN users st ON es.student_id = st.id
       INNER JOIN users l ON es.lecturer_id = l.id
       INNER JOIN courses c ON es.course_id = c.id
       INNER JOIN departments d ON c.department_id = d.id
       INNER JOIN semesters s ON es.semester_id = s.id
       LEFT JOIN evaluation_responses er ON er.submission_id = es.id
       LEFT JOIN questions q ON er.question_id = q.id
       ${filter.where}
       GROUP BY es.id, st.id, st.full_name, st.email, st.university_id, d.department_name, c.course_code,
                c.course_name, s.semester_name, es.academic_year, l.full_name, l.email,
                es.type, es.overall_grade, es.comment_text, es.submitted_at
       ORDER BY es.submitted_at DESC`,
      filter.params
    );

    await logAudit({
      userId: req.user.id,
      action: "evaluation_records_exported",
      entityType: "evaluation_export",
      details: filter.auditFilters,
    });

    const lines = [
      [
        "Submission ID",
        "Student ID",
        "Student Name",
        "Student Email",
        "Student Registration",
        "Department",
        "Course Code",
        "Course",
        "Semester",
        "Academic Year",
        "Lecturer",
        "Lecturer Email",
        "Type",
        "Overall Grade",
        "Comment",
        "Question Scores",
        "Submitted At",
      ].map(escapeCsv).join(","),
      ...rows.map((row) => [
        row.submission_id,
        row.student_id,
        row.student_name,
        row.student_email,
        row.student_registration_number,
        row.department_name,
        row.course_code,
        row.course_name,
        row.semester_name,
        row.academic_year,
        row.lecturer_name,
        row.lecturer_email,
        row.type,
        row.overall_grade,
        row.comment_text,
        row.question_scores,
        row.submitted_at,
      ].map(escapeCsv).join(",")),
    ];
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=\"evaluation-export.csv\"");
    res.send(lines.join("\n"));
  } catch (error) {
    res.status(500).json({ message: "Failed to export evaluations.", error: error.message });
  }
};

export const getLecturerAwardScores = async (req, res) => {
  try {
    const semesterId = req.query.semesterId ? parsePositiveInt(req.query.semesterId) : null;
    const departmentId = req.query.departmentId ? parsePositiveInt(req.query.departmentId) : null;
    const academicYear = req.query.academicYear?.trim();

    const params = [];
    const conditions = ["u.role = 'lecturer'", "u.status = 'approved'"];
    let evalFilter = "";
    let reportFilter = "";
    let scoreJoinFilter = "";

    if (departmentId) {
      conditions.push("u.department_id = ?");
      params.push(departmentId);
    }

    const evalParams = [];
    if (semesterId) { evalFilter += " AND es.semester_id = ?"; evalParams.push(semesterId); }
    if (academicYear) { evalFilter += " AND es.academic_year = ?"; evalParams.push(academicYear); }

    const reportParams = [];
    if (academicYear) { reportFilter += " AND YEAR(sr.submitted_at) IN (?, ?)"; reportParams.push(Number(academicYear.slice(0, 4)) || 0, Number(academicYear.slice(-4)) || 0); }

    const scoreParams = [];
    if (semesterId) { scoreJoinFilter += " AND las.semester_id = ?"; scoreParams.push(semesterId); }
    if (academicYear) { scoreJoinFilter += " AND las.academic_year = ?"; scoreParams.push(academicYear); }

    const where = `WHERE ${conditions.join(" AND ")}`;
    const [rows] = await query(
      `SELECT u.id AS lecturerId, u.full_name AS lecturerName, u.email,
              d.department_name AS departmentName,
              COUNT(DISTINCT es.id) AS evaluationCount,
              COALESCE(AVG(es.overall_grade), 0) AS evaluationAverage,
              COUNT(DISTINCT sr.id) AS reportsSubmitted,
              COUNT(DISTINCT CASE WHEN sr.status = 'accepted' THEN sr.id END) AS acceptedReports,
              COALESCE(MAX(las.supervision_score), 0) AS supervisionScore,
              MAX(las.admin_comment) AS adminComment,
              MAX(las.updated_at) AS scoreUpdatedAt
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN evaluation_submissions es ON es.lecturer_id = u.id ${evalFilter}
       LEFT JOIN supervision_reports sr ON sr.lecturer_id = u.id ${reportFilter}
       LEFT JOIN lecturer_award_scores las ON las.lecturer_id = u.id ${scoreJoinFilter}
       ${where}
       GROUP BY u.id, u.full_name, u.email, d.department_name
       ORDER BY (COALESCE(AVG(es.overall_grade), 0) * 20 + COALESCE(MAX(las.supervision_score), 0)) DESC, u.full_name ASC`,
      [...evalParams, ...reportParams, ...scoreParams, ...params]
    );

    const lecturers = rows.map((row, index) => {
      const evaluationAverage = Number(row.evaluationAverage || 0);
      const evaluationScore = Number((evaluationAverage * 20).toFixed(2));
      const supervisionScore = Number(row.supervisionScore || 0);
      return {
        rank: index + 1,
        lecturerId: row.lecturerId,
        lecturerName: row.lecturerName,
        email: row.email,
        departmentName: row.departmentName,
        evaluationCount: Number(row.evaluationCount || 0),
        evaluationAverage: Number(evaluationAverage.toFixed(2)),
        evaluationScore,
        reportsSubmitted: Number(row.reportsSubmitted || 0),
        acceptedReports: Number(row.acceptedReports || 0),
        supervisionScore,
        adminComment: row.adminComment || "",
        finalScore: Number((evaluationScore + supervisionScore).toFixed(2)),
        scoreUpdatedAt: row.scoreUpdatedAt,
      };
    });

    res.json({
      scale: {
        evaluationScore: "Student evaluation average multiplied by 20. Read-only.",
        supervisionScore: "Admin editable score from 0 to 100.",
        finalScore: "Evaluation score plus supervision score. Maximum 200.",
      },
      lecturers,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch lecturer award scores.", error: error.message });
  }
};

export const updateLecturerAwardScore = async (req, res) => {
  try {
    const lecturerId = parsePositiveInt(req.params.lecturerId);
    const semesterId = parsePositiveInt(req.body.semesterId);
    const academicYear = req.body.academicYear?.trim();
    const supervisionScore = parseScore(req.body.supervisionScore);
    const adminComment = req.body.adminComment?.trim() || null;

    if (!lecturerId || !semesterId || !academicYear || supervisionScore === null) {
      return res.status(400).json({ message: "Lecturer, semester, academic year and supervision score from 0 to 100 are required." });
    }

    const [lecturers] = await query("SELECT id FROM users WHERE id = ? AND role = 'lecturer' LIMIT 1", [lecturerId]);
    if (lecturers.length === 0) return res.status(404).json({ message: "Lecturer not found." });

    const [result] = await query(
      `INSERT INTO lecturer_award_scores (lecturer_id, semester_id, academic_year, supervision_score, admin_comment, updated_by)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         supervision_score = VALUES(supervision_score),
         admin_comment = VALUES(admin_comment),
         updated_by = VALUES(updated_by)`,
      [lecturerId, semesterId, academicYear, supervisionScore, adminComment, req.user.id]
    );

    await logAudit({
      userId: req.user.id,
      action: "lecturer_award_score_updated",
      entityType: "lecturer_award_score",
      entityId: result.insertId || lecturerId,
      details: { lecturerId, semesterId, academicYear, supervisionScore, adminComment },
    });

    res.json({ message: "Supervision award score saved successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to save supervision award score.", error: error.message });
  }
};

export const getAuditLogs = async (req, res) => {
  try {
    const search = req.query.search?.trim();
    const from = req.query.from;
    const to = req.query.to;
    const page = Math.max(parsePositiveInt(req.query.page) || 1, 1);
    const limit = Math.min(parsePositiveInt(req.query.limit) || 25, 100);
    const offset = (page - 1) * limit;
    const params = [];
    const conditions = [];
    if (search) {
      conditions.push("(al.action LIKE ? OR al.entity_type LIKE ? OR u.full_name LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (from) { conditions.push("al.created_at >= ?"); params.push(from); }
    if (to) { conditions.push("al.created_at <= ?"); params.push(to); }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const [logs] = await query(
      `SELECT al.id, al.user_id, u.full_name AS user_name, al.action, al.entity_type, al.entity_id, al.details, al.created_at
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${where}
       ORDER BY al.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );
    res.json({ logs, page, limit });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch audit logs.", error: error.message });
  }
};

export const deleteAuditLog = async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    if (!id) return res.status(400).json({ message: "Valid audit log ID is required." });

    const [logs] = await query("SELECT id, user_id, action, entity_type, entity_id, details, created_at FROM audit_logs WHERE id = ? LIMIT 1", [id]);
    if (logs.length === 0) return res.status(404).json({ message: "Audit log not found." });

    const [result] = await query("DELETE FROM audit_logs WHERE id = ?", [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Audit log not found." });

    await logAudit({
      userId: req.user.id,
      action: "audit_log_deleted",
      entityType: "audit_log",
      entityId: id,
      details: {
        deletedAction: logs[0].action,
        deletedEntityType: logs[0].entity_type,
        deletedEntityId: logs[0].entity_id,
      },
    });

    res.json({ message: "Audit log deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete audit log.", error: error.message });
  }
};
