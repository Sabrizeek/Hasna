import bcrypt from "bcrypt";
import { query } from "../config/db.js";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { logAudit } from "../utils/auditLogger.js";
import { supervisionReportsUploadDir } from "../utils/uploadDirectories.js";

const parsePositiveInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

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

    await logAudit({ userId: req.user.id, action: "user_deleted", entityType: "user", entityId: Number(id) });
    res.json({ message: "User deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete user.", error: error.message });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const [[students], [lecturers], [hods], [submissions], [windows], [pendingReports], [recentReports], [recentActivity]] =
      await Promise.all([
        query("SELECT COUNT(*) AS count FROM users WHERE role = 'student'"),
        query("SELECT COUNT(*) AS count FROM users WHERE role = 'lecturer'"),
        query("SELECT COUNT(*) AS count FROM users WHERE role = 'hod'"),
        query("SELECT COUNT(*) AS count FROM evaluation_submissions"),
        query("SELECT COUNT(*) AS count FROM evaluation_windows WHERE status = 'open'"),
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

const validateWindow = async ({ semesterId, academicYear, openDate, closeDate, excludeId = null }) => {
  if (!semesterId || !academicYear || !openDate || !closeDate) return "Semester, academic year, open date and close date are required.";
  if (new Date(openDate) >= new Date(closeDate)) return "Open date must be before close date.";
  const params = [semesterId, academicYear, closeDate, openDate];
  let exclude = "";
  if (excludeId) {
    exclude = "AND id != ?";
    params.push(excludeId);
  }
  const [rows] = await query(
    `SELECT id FROM evaluation_windows
     WHERE semester_id = ? AND academic_year = ?
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

    const now = new Date();
    const status = new Date(payload.openDate) <= now && new Date(payload.closeDate) >= now ? "open" : "scheduled";
    const [result] = await query(
      `INSERT INTO evaluation_windows (semester_id, academic_year, open_date, close_date, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [payload.semesterId, payload.academicYear, payload.openDate, payload.closeDate, status, req.user.id]
    );
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
    const [result] = await query(
      `UPDATE evaluation_windows SET semester_id = ?, academic_year = ?, open_date = ?, close_date = ?, status = ? WHERE id = ?`,
      [payload.semesterId, payload.academicYear, payload.openDate, payload.closeDate, req.body.status || "scheduled", id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: "Evaluation window not found." });
    await logAudit({ userId: req.user.id, action: "evaluation_window_updated", entityType: "evaluation_window", entityId: id, details: payload });
    res.json({ message: "Evaluation window updated successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to update evaluation window.", error: error.message });
  }
};

export const closeEvaluationWindow = async (req, res) => {
  try {
    const id = parsePositiveInt(req.params.id);
    const [result] = await query("UPDATE evaluation_windows SET status = 'closed', close_date = NOW() WHERE id = ?", [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Evaluation window not found." });
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

export const exportEvaluations = async (req, res) => {
  try {
    const departmentId = req.query.departmentId ? parsePositiveInt(req.query.departmentId) : null;
    const semesterId = req.query.semesterId ? parsePositiveInt(req.query.semesterId) : null;
    const academicYear = req.query.academicYear?.trim();
    const from = req.query.from;
    const to = req.query.to;
    const params = [];
    const conditions = [];
    if (departmentId) { conditions.push("d.id = ?"); params.push(departmentId); }
    if (semesterId) { conditions.push("es.semester_id = ?"); params.push(semesterId); }
    if (academicYear) { conditions.push("es.academic_year = ?"); params.push(academicYear); }
    if (from) { conditions.push("es.submitted_at >= ?"); params.push(from); }
    if (to) { conditions.push("es.submitted_at <= ?"); params.push(to); }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const [rows] = await query(
      `SELECT d.department_name, c.course_code, c.course_name, s.semester_name, es.academic_year,
              l.full_name AS lecturer_name, es.type, es.overall_grade, es.comment_text, es.submitted_at
       FROM evaluation_submissions es
       INNER JOIN users l ON es.lecturer_id = l.id
       INNER JOIN courses c ON es.course_id = c.id
       INNER JOIN departments d ON c.department_id = d.id
       INNER JOIN semesters s ON es.semester_id = s.id
       ${where}
       ORDER BY es.submitted_at DESC`,
      params
    );
    await logAudit({ userId: req.user.id, action: "evaluations_exported", entityType: "evaluation_export", details: { departmentId, semesterId, academicYear } });
    const lines = [
      ["Department", "Course Code", "Course", "Semester", "Academic Year", "Lecturer", "Type", "Overall Grade", "Anonymous Comment", "Submitted At"].map(escapeCsv).join(","),
      ...rows.map((row) => [row.department_name, row.course_code, row.course_name, row.semester_name, row.academic_year, row.lecturer_name, row.type, row.overall_grade, row.comment_text, row.submitted_at].map(escapeCsv).join(",")),
    ];
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=\"evaluation-export.csv\"");
    res.send(lines.join("\n"));
  } catch (error) {
    res.status(500).json({ message: "Failed to export evaluations.", error: error.message });
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
