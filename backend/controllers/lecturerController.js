import fs from "fs";
import path from "path";
import { query } from "../config/db.js";
import { supervisionReportsUploadDir } from "../utils/uploadDirectories.js";
import { notifyAdmins } from "../utils/notificationService.js";

const parsePositiveInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const emptyDistribution = () => ({
  5: 0,
  4: 0,
  3: 0,
  2: 0,
  1: 0,
});

const toPercentages = (distribution, total) => {
  const percentages = emptyDistribution();

  for (const score of [5, 4, 3, 2, 1]) {
    percentages[score] = total > 0 ? Number(((distribution[score] / total) * 100).toFixed(1)) : 0;
  }

  return percentages;
};

const getAccessibleCourse = async (lecturerId, courseId, semesterId, academicYear) => {
  const [courses] = await query(
    `SELECT DISTINCT c.id, c.course_code, c.course_name, c.department_id, d.department_name,
            s.id AS semester_id, s.semester_name, s.academic_year
     FROM courses c
     INNER JOIN departments d ON c.department_id = d.id
     INNER JOIN semesters s ON c.semester_id = s.id
     LEFT JOIN lecturer_modules lm
       ON lm.course_id = c.id
      AND lm.semester_id = c.semester_id
      AND lm.academic_year = s.academic_year
      AND lm.lecturer_id = ?
     WHERE c.id = ?
       AND c.semester_id = ?
       AND s.academic_year = ?
       AND (c.lecturer_id = ? OR lm.lecturer_id = ?)
     LIMIT 1`,
    [lecturerId, courseId, semesterId, academicYear, lecturerId, lecturerId]
  );

  return courses[0] || null;
};

export const getLecturerModules = async (req, res) => {
  try {
    const [modules] = await query(
      `SELECT DISTINCT c.id AS course_id, c.course_code, c.course_name,
              c.department_id, d.department_name, s.id AS semester_id,
              s.semester_name, s.academic_year, s.is_active
       FROM courses c
       INNER JOIN departments d ON c.department_id = d.id
       INNER JOIN semesters s ON c.semester_id = s.id
       LEFT JOIN lecturer_modules lm
         ON lm.course_id = c.id
        AND lm.semester_id = c.semester_id
        AND lm.academic_year = s.academic_year
        AND lm.lecturer_id = ?
       WHERE c.lecturer_id = ? OR lm.lecturer_id = ?
       ORDER BY s.is_active DESC, s.academic_year DESC, s.semester_name ASC, c.course_code ASC`,
      [req.user.id, req.user.id, req.user.id]
    );

    res.json({ modules });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch lecturer modules.", error: error.message });
  }
};

export const getEvaluationResults = async (req, res) => {
  try {
    const lecturerId = req.user.id;
    const courseId = parsePositiveInt(req.params.courseId);
    const semesterId = parsePositiveInt(req.query.semesterId);
    const academicYear = req.query.academicYear?.trim();
    const type = req.query.type?.trim();

    if (!courseId || !semesterId || !academicYear || !["theory", "practical"].includes(type)) {
      return res.status(400).json({ message: "Course, semester, academic year and valid type are required." });
    }

    const course = await getAccessibleCourse(lecturerId, courseId, semesterId, academicYear);
    if (!course) {
      return res.status(404).json({ message: "Module not found for this lecturer." });
    }

    const [submissionRows] = await query(
      `SELECT id, overall_grade, comment_text, submitted_at
       FROM evaluation_submissions
       WHERE lecturer_id = ? AND course_id = ? AND semester_id = ? AND academic_year = ? AND type = ?`,
      [lecturerId, courseId, semesterId, academicYear, type]
    );

    const totalResponses = submissionRows.length;
    const submissionIds = submissionRows.map((submission) => submission.id);

    const [questions] = await query(
      `SELECT id, label, question_text
       FROM questions
       WHERE type = ? AND is_active = 1
       ORDER BY display_order ASC, id ASC`,
      [type]
    );

    const questionDistributions = new Map();
    const overallGradeDistribution = emptyDistribution();

    for (const question of questions) {
      questionDistributions.set(question.id, emptyDistribution());
    }

    for (const submission of submissionRows) {
      const grade = Number(submission.overall_grade);
      if (overallGradeDistribution[grade] !== undefined) {
        overallGradeDistribution[grade] += 1;
      }
    }

    if (submissionIds.length > 0) {
      const placeholders = submissionIds.map(() => "?").join(", ");
      const [responseRows] = await query(
        `SELECT question_id, score, COUNT(*) AS count
         FROM evaluation_responses
         WHERE submission_id IN (${placeholders})
         GROUP BY question_id, score`,
        submissionIds
      );

      for (const row of responseRows) {
        const distribution = questionDistributions.get(row.question_id);
        if (distribution && distribution[row.score] !== undefined) {
          distribution[row.score] = Number(row.count);
        }
      }
    }

    res.json({
      course: {
        id: course.id,
        course_code: course.course_code,
        course_name: course.course_name,
        department_name: course.department_name,
      },
      semester: {
        id: course.semester_id,
        semester_name: course.semester_name,
      },
      academicYear,
      type,
      totalResponses,
      comments: submissionRows
        .filter((submission) => submission.comment_text?.trim())
        .map((submission) => ({
          commentText: submission.comment_text,
          submittedAt: submission.submitted_at,
        })),
      questions: questions.map((question) => {
        const distribution = questionDistributions.get(question.id) || emptyDistribution();
        return {
          questionId: question.id,
          label: question.label,
          questionText: question.question_text,
          distribution,
          percentages: toPercentages(distribution, totalResponses),
        };
      }),
      overallGradeDistribution,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch evaluation results.", error: error.message });
  }
};

export const getSupervisionReports = async (req, res) => {
  try {
    const [reports] = await query(
      `SELECT id, title, file_name, file_type, file_size, status,
              admin_comment, reviewed_at, submitted_at
       FROM supervision_reports
       WHERE lecturer_id = ?
       ORDER BY submitted_at DESC`,
      [req.user.id]
    );

    res.json({ reports });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch supervision reports.", error: error.message });
  }
};

export const uploadSupervisionReport = async (req, res) => {
  try {
    const title = req.body.title?.trim();

    if (!title) {
      if (req.file?.path) {
        fs.unlink(req.file.path, () => {});
      }
      return res.status(400).json({ message: "Report title is required." });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Please upload a PDF, DOC, or DOCX report." });
    }

    const relativePath = path.join("uploads", "supervision-reports", req.file.filename);

    const [result] = await query(
      `INSERT INTO supervision_reports
       (lecturer_id, title, file_name, file_path, file_type, file_size, status)
       VALUES (?, ?, ?, ?, ?, ?, 'submitted')`,
      [req.user.id, title, req.file.originalname, relativePath, req.file.mimetype, req.file.size]
    );

    await notifyAdmins({
      title: "New Supervision Report",
      message: `A new supervision report has been submitted by ${req.user.full_name || "a lecturer"}.`,
      type: "info",
      relatedEntityType: "supervision_report",
      relatedEntityId: result.insertId,
    });

    res.status(201).json({
      message: "Supervision report uploaded successfully.",
      reportId: result.insertId,
    });
  } catch (error) {
    if (req.file?.path) {
      fs.unlink(req.file.path, () => {});
    }
    res.status(500).json({ message: "Failed to upload supervision report.", error: error.message });
  }
};

export const downloadSupervisionReport = async (req, res) => {
  try {
    const reportId = parsePositiveInt(req.params.reportId);

    if (!reportId) {
      return res.status(400).json({ message: "Valid report is required." });
    }

    const [reports] = await query(
      `SELECT file_name, file_path
       FROM supervision_reports
       WHERE id = ? AND lecturer_id = ?
       LIMIT 1`,
      [reportId, req.user.id]
    );

    if (reports.length === 0) {
      return res.status(404).json({ message: "Report not found." });
    }

    const storedName = path.basename(reports[0].file_path);
    const absolutePath = path.join(supervisionReportsUploadDir, storedName);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: "Report file not found." });
    }

    res.download(absolutePath, reports[0].file_name);
  } catch (error) {
    res.status(500).json({ message: "Failed to download supervision report.", error: error.message });
  }
};

export const downloadSupervisionTemplate = async (req, res) => {
  const templateContent = [
    "Lecturer Evaluation System - Supervision Report Template",
    "",
    "Lecturer Name:",
    "Department:",
    "Academic Year:",
    "Semester:",
    "Course/Module:",
    "",
    "Supervision Summary:",
    "",
    "Activities Completed:",
    "",
    "Challenges / Observations:",
    "",
    "Lecturer Signature:",
    "Date:",
  ].join("\n");

  res.setHeader("Content-Type", "application/msword");
  res.setHeader("Content-Disposition", "attachment; filename=\"supervision-report-template.doc\"");
  res.send(templateContent);
};
