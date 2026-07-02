import fs from "fs";
import path from "path";
import { query } from "../config/db.js";
import { peerEvaluationsUploadDir, supervisionReportsUploadDir } from "../utils/uploadDirectories.js";
import { notifyAdmins } from "../utils/notificationService.js";
import { summarizeCommentTexts } from "../services/aiSummarizerService.js";

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

export const summarizeLecturerComments = async (req, res) => {
  try {
    const lecturerId = req.user.id;
    const courseId = parsePositiveInt(req.body.courseId);
    const semesterId = parsePositiveInt(req.body.semesterId);
    const academicYear = req.body.academicYear?.trim();
    const type = req.body.type?.trim();

    if (!courseId || !semesterId || !academicYear || !["theory", "practical"].includes(type)) {
      return res.status(400).json({ message: "Course, semester, academic year and valid type are required." });
    }

    const course = await getAccessibleCourse(lecturerId, courseId, semesterId, academicYear);
    if (!course) {
      return res.status(404).json({ message: "Module not found for this lecturer." });
    }

    const [rows] = await query(
      `SELECT comment_text
       FROM evaluation_submissions
       WHERE lecturer_id = ?
         AND course_id = ?
         AND semester_id = ?
         AND academic_year = ?
         AND type = ?
         AND comment_text IS NOT NULL
         AND TRIM(comment_text) <> ''
       ORDER BY submitted_at DESC`,
      [lecturerId, courseId, semesterId, academicYear, type]
    );

    const comments = rows.map((row) => row.comment_text);
    if (comments.length === 0) {
      return res.json({
        totalComments: 0,
        summary: "No student comments are available for summarization.",
        keyStrengths: [],
        improvementAreas: [],
        commonThemes: [],
        generatedAt: new Date().toISOString(),
      });
    }

    const summary = await summarizeCommentTexts(comments);
    res.json({
      totalComments: comments.length,
      summary: summary.summary,
      keyStrengths: summary.keyStrengths || [],
      improvementAreas: summary.improvementAreas || [],
      commonThemes: summary.commonThemes || [],
      generatedAt: new Date().toISOString(),
    });
  } catch {
    res.status(500).json({ message: "Unable to summarize comments right now. Please try again later." });
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

export const getPeerEvaluations = async (req, res) => {
  try {
    const [assignments] = await query(
      `SELECT a.id AS assignment_id, a.academic_year, a.status AS assignment_status,
              u.full_name AS evaluated_name, s.semester_name,
              p.id AS upload_id, p.file_name, p.file_path, p.status AS upload_status, p.submitted_at
       FROM peer_evaluation_assignments a
       INNER JOIN users u ON a.evaluated_id = u.id
       INNER JOIN semesters s ON a.semester_id = s.id
       LEFT JOIN peer_evaluation_uploads p ON p.assignment_id = a.id
       WHERE a.evaluator_id = ?
       ORDER BY a.created_at DESC`,
      [req.user.id]
    );

    res.json({ assignments });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch peer evaluations.", error: error.message });
  }
};

export const uploadPeerEvaluation = async (req, res) => {
  try {
    const assignmentId = parsePositiveInt(req.params.assignmentId);

    if (!assignmentId) {
      if (req.file?.path) fs.unlink(req.file.path, () => {});
      return res.status(400).json({ message: "Valid assignment is required." });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Please upload a valid document (PDF, JPG, PNG)." });
    }

    const [assignments] = await query(
      `SELECT id, evaluated_id FROM peer_evaluation_assignments 
       WHERE id = ? AND evaluator_id = ? LIMIT 1`,
      [assignmentId, req.user.id]
    );

    if (assignments.length === 0) {
      if (req.file?.path) fs.unlink(req.file.path, () => {});
      return res.status(404).json({ message: "Assignment not found." });
    }

    const assignment = assignments[0];

    const [existingUploads] = await query(
      "SELECT id, file_path FROM peer_evaluation_uploads WHERE assignment_id = ? AND evaluator_id = ?", 
      [assignmentId, req.user.id]
    );

    if (existingUploads.length > 0) {
      if (existingUploads[0].file_path) {
        const existingPath = path.join(existingUploads[0].file_path);
        fs.unlink(existingPath, () => {});
      }
      await query("DELETE FROM peer_evaluation_uploads WHERE id = ?", [existingUploads[0].id]);
    }

    const relativePath = path.join("uploads", "peer-evaluations", req.file.filename);

    const [result] = await query(
      `INSERT INTO peer_evaluation_uploads
       (assignment_id, evaluator_id, evaluated_id, file_name, file_path, file_type, file_size, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'submitted')`,
      [assignmentId, req.user.id, assignment.evaluated_id, req.file.originalname, relativePath, req.file.mimetype, req.file.size]
    );

    await query("UPDATE peer_evaluation_assignments SET status = 'completed' WHERE id = ?", [assignmentId]);

    await notifyAdmins({
      title: "New Peer Evaluation Uploaded",
      message: `A new peer evaluation has been submitted by ${req.user.full_name || "a lecturer"}.`,
      type: "info",
      relatedEntityType: "peer_evaluation_upload",
      relatedEntityId: result.insertId,
    });

    res.status(201).json({
      message: "Peer evaluation uploaded successfully.",
      uploadId: result.insertId,
    });
  } catch (error) {
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    res.status(500).json({ message: "Failed to upload peer evaluation.", error: error.message });
  }
};

export const downloadPeerEvaluation = async (req, res) => {
  try {
    const uploadId = parsePositiveInt(req.params.uploadId);

    if (!uploadId) {
      return res.status(400).json({ message: "Valid upload ID is required." });
    }

    const [uploads] = await query(
      `SELECT file_name, file_path
       FROM peer_evaluation_uploads
       WHERE id = ? AND evaluator_id = ?
       LIMIT 1`,
      [uploadId, req.user.id]
    );

    if (uploads.length === 0) {
      return res.status(404).json({ message: "Upload not found." });
    }

    const storedName = path.basename(uploads[0].file_path);
    const absolutePath = path.join(peerEvaluationsUploadDir, storedName);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: "File not found." });
    }

    res.download(absolutePath, uploads[0].file_name);
  } catch (error) {
    res.status(500).json({ message: "Failed to download peer evaluation.", error: error.message });
  }
};
