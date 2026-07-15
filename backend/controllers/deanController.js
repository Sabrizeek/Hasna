import { query } from "../config/db.js";
import fs from "fs";
import path from "path";
import { supervisionReportsUploadDir, peerEvaluationsUploadDir } from "../utils/uploadDirectories.js";

const parsePositiveInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseFilters = (req) => ({
  semesterId: parsePositiveInt(req.query.semesterId),
  academicYear: req.query.academicYear?.trim() || null,
});

const formatAverage = (value) => (value === null || value === undefined ? 0 : Number(Number(value).toFixed(1)));

const buildEvalConditions = (filters, params, alias = "es") => {
  const conditions = [];
  if (filters.semesterId) {
    conditions.push(`${alias}.semester_id = ?`);
    params.push(filters.semesterId);
  }
  if (filters.academicYear) {
    conditions.push(`${alias}.academic_year = ?`);
    params.push(filters.academicYear);
  }
  return conditions;
};

export const getDeanSemesters = async (req, res) => {
  try {
    const [semesters] = await query(
      "SELECT id, semester_name, academic_year, is_active FROM semesters ORDER BY is_active DESC, academic_year DESC, semester_name ASC"
    );
    res.json({ semesters });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch semesters.", error: error.message });
  }
};

export const getFacultyOverview = async (req, res) => {
  try {
    const filters = parseFilters(req);
    const semId = filters.semesterId || null;
    const acadYear = filters.academicYear || null;

    // Build semester sub-query fragment for sub-selects
    const subEvalWhere = semId ? "AND sub.semester_id = ?" : "";
    const subLasWhere = semId ? "AND las2.semester_id = ?" : "";

    const [lecturerRows] = await query(
      "SELECT COUNT(*) AS totalLecturers FROM users WHERE role = 'lecturer' AND status = 'approved'"
    );

    // Faculty average and total evaluations — sub-queries now respect semester filter
    const facultySubParams = [];
    if (semId) facultySubParams.push(semId, semId, semId, semId, semId);
    if (semId) facultySubParams.push(semId); // for the outer es join
    const evalOuterWhere = semId ? `AND es.semester_id = ?` : "";
    const evalAcadWhere = acadYear ? `AND es.academic_year = ?` : "";
    if (acadYear) facultySubParams.push(acadYear);

    const [evaluationRows] = await query(
      `SELECT COUNT(DISTINCT es.id) AS totalEvaluations, 
              ROUND(
                AVG(
                  (COALESCE((SELECT AVG(sub.overall_grade) FROM evaluation_submissions sub WHERE sub.lecturer_id = u.id ${subEvalWhere}), 0) * 0.50) +
                  (COALESCE((SELECT MAX(las2.peer_evaluation_score) FROM lecturer_award_scores las2 WHERE las2.lecturer_id = u.id ${subLasWhere}), 0) * 0.20) +
                  (COALESCE((SELECT MAX(las2.mentoring_score) FROM lecturer_award_scores las2 WHERE las2.lecturer_id = u.id ${subLasWhere}), 0) * 0.15) +
                  (COALESCE((SELECT MAX(las2.supervision_score) FROM lecturer_award_scores las2 WHERE las2.lecturer_id = u.id ${subLasWhere}), 0) * 0.10) +
                  (COALESCE((SELECT MAX(las2.other_score) FROM lecturer_award_scores las2 WHERE las2.lecturer_id = u.id ${subLasWhere}), 0) * 0.05)
                ),
                1
              ) AS facultyAverageScore
       FROM users u
       LEFT JOIN evaluation_submissions es ON es.lecturer_id = u.id ${evalOuterWhere} ${evalAcadWhere}
       WHERE u.role = 'lecturer' AND u.status = 'approved'`,
      facultySubParams
    );

    // The previous departmentsEvaluated query only checked student evaluations, which caused 
    // a mismatch with departmentAverages which includes peer/other scores.
    // We will calculate it directly from departmentAverages.

    // Per-department averages — all sub-queries also get semester filter
    const deptSubParams = [];
    if (semId) deptSubParams.push(semId, semId, semId, semId, semId);
    if (semId) deptSubParams.push(semId); // outer es join
    if (acadYear) deptSubParams.push(acadYear); // outer es join academic_year
    const deptEsOuterWhere = semId ? `AND es.semester_id = ?` : "";
    const deptEsAcadWhere = acadYear ? `AND es.academic_year = ?` : "";
    // params are repeated per sub-select and then the outer join
    const allDeptParams = [];
    if (semId) allDeptParams.push(semId, semId, semId, semId, semId, semId);
    if (acadYear) allDeptParams.push(acadYear);

    const [departmentAverages] = await query(
      `SELECT d.id AS departmentId, d.department_name AS departmentName,
              COUNT(es.id) AS totalEvaluations,
              ROUND(
                AVG(
                  (COALESCE((SELECT AVG(sub.overall_grade) FROM evaluation_submissions sub WHERE sub.lecturer_id = u.id ${subEvalWhere}), 0) * 0.50) +
                  (COALESCE((SELECT MAX(las2.peer_evaluation_score) FROM lecturer_award_scores las2 WHERE las2.lecturer_id = u.id ${subLasWhere}), 0) * 0.20) +
                  (COALESCE((SELECT MAX(las2.mentoring_score) FROM lecturer_award_scores las2 WHERE las2.lecturer_id = u.id ${subLasWhere}), 0) * 0.15) +
                  (COALESCE((SELECT MAX(las2.supervision_score) FROM lecturer_award_scores las2 WHERE las2.lecturer_id = u.id ${subLasWhere}), 0) * 0.10) +
                  (COALESCE((SELECT MAX(las2.other_score) FROM lecturer_award_scores las2 WHERE las2.lecturer_id = u.id ${subLasWhere}), 0) * 0.05)
                ),
                1
              ) AS averageScore
       FROM departments d
       LEFT JOIN users u ON u.department_id = d.id AND u.role = 'lecturer' AND u.status = 'approved'
       LEFT JOIN evaluation_submissions es ON es.lecturer_id = u.id ${semId ? "AND es.semester_id = ?" : ""} ${acadYear ? "AND es.academic_year = ?" : ""}
       GROUP BY d.id, d.department_name
       ORDER BY averageScore DESC, d.department_name ASC`,
      allDeptParams
    );

    // Top performers: also filter las by semester
    const perfParams = [];
    const perfEsWhere = semId ? `AND es.semester_id = ?` : "";
    const perfEsAcadWhere = acadYear ? `AND es.academic_year = ?` : "";
    const perfLasWhere = semId ? `AND las.semester_id = ?` : "";
    if (semId) perfParams.push(semId);
    if (acadYear) perfParams.push(acadYear);
    if (semId) perfParams.push(semId);

    const [performerRows] = await query(
      `SELECT u.id AS lecturerId, u.full_name AS name, d.department_name AS departmentName,
              COUNT(es.id) AS totalEvaluations,
              ROUND(
                (COALESCE(AVG(es.overall_grade), 0) * 0.50) +
                (COALESCE(MAX(las.peer_evaluation_score), 0) * 0.20) +
                (COALESCE(MAX(las.mentoring_score), 0) * 0.15) +
                (COALESCE(MAX(las.supervision_score), 0) * 0.10) +
                (COALESCE(MAX(las.other_score), 0) * 0.05),
                1
              ) AS averageScore
       FROM users u
       INNER JOIN departments d ON u.department_id = d.id
       LEFT JOIN evaluation_submissions es ON es.lecturer_id = u.id ${perfEsWhere} ${perfEsAcadWhere}
       LEFT JOIN lecturer_award_scores las ON las.lecturer_id = u.id ${perfLasWhere}
       WHERE u.role = 'lecturer' AND u.status = 'approved'
       GROUP BY u.id, u.full_name, d.department_name
       HAVING totalEvaluations > 0
       ORDER BY averageScore DESC, u.full_name ASC`,
      perfParams
    );

    const normalizePerformer = (row) => ({
      lecturerId: row.lecturerId,
      name: row.name,
      departmentName: row.departmentName,
      averageScore: formatAverage(row.averageScore),
    });

    res.json({
      kpis: {
        totalLecturers: Number(lecturerRows[0]?.totalLecturers || 0),
        totalEvaluationsCompleted: Number(evaluationRows[0]?.totalEvaluations || 0),
        facultyAverageScore: formatAverage(evaluationRows[0]?.facultyAverageScore),
        departmentsEvaluated: departmentAverages.filter(d => formatAverage(d.averageScore) > 0 || Number(d.totalEvaluations) > 0).length,
      },
      departmentAverages: departmentAverages.map((department) => ({
        departmentId: department.departmentId,
        departmentName: department.departmentName,
        averageScore: formatAverage(department.averageScore),
        totalEvaluations: Number(department.totalEvaluations || 0),
      })),
      topPerformers: performerRows.slice(0, 3).map(normalizePerformer),
      needsAttention: [...performerRows].reverse().slice(0, 3).map(normalizePerformer),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch faculty overview.", error: error.message });
  }
};

export const getDeanDepartment = async (req, res) => {
  try {
    const departmentId = parsePositiveInt(req.params.departmentId);
    const filters = parseFilters(req);

    if (!departmentId) {
      return res.status(400).json({ message: "Valid department is required." });
    }

    const [departments] = await query(
      "SELECT id, department_name, faculty_name FROM departments WHERE id = ? LIMIT 1",
      [departmentId]
    );
    if (departments.length === 0) {
      return res.status(404).json({ message: "Department not found." });
    }

    const [hods] = await query(
      "SELECT id, full_name AS name, email FROM users WHERE department_id = ? AND role = 'hod' AND status = 'approved' ORDER BY full_name ASC LIMIT 1",
      [departmentId]
    );

    const evalParams = [];
    const evalConditions = buildEvalConditions(filters, evalParams);
    const evalFilter = evalConditions.length ? `AND ${evalConditions.join(" AND ")}` : "";

    const [lecturers] = await query(
      `SELECT u.id AS lecturerId, u.full_name AS name, d.department_name AS department,
              AVG(es.overall_grade) AS studentEvaluationScore,
              ROUND(
                (COALESCE(AVG(es.overall_grade), 0) * 0.50) +
                (COALESCE(MAX(las.peer_evaluation_score), 0) * 0.20) +
                (COALESCE(MAX(las.mentoring_score), 0) * 0.15) +
                (COALESCE(MAX(las.supervision_score), 0) * 0.10) +
                (COALESCE(MAX(las.other_score), 0) * 0.05),
                1
              ) AS overallScore,
              COUNT(es.id) AS totalEvaluations,
              MAX(las.supervision_score) AS supervisionScore,
              MAX(las.mentoring_score) AS mentoringScore,
              MAX(las.other_score) AS otherScore,
              MAX(las.peer_evaluation_score) AS peerEvaluationScore
       FROM users u
       INNER JOIN departments d ON u.department_id = d.id
       LEFT JOIN evaluation_submissions es ON es.lecturer_id = u.id ${evalFilter}
       LEFT JOIN lecturer_award_scores las ON las.lecturer_id = u.id ${filters.semesterId ? "AND las.semester_id = ?" : ""}
       WHERE u.department_id = ? AND u.role = 'lecturer' AND u.status = 'approved'
       GROUP BY u.id, u.full_name, d.department_name
       ORDER BY overallScore DESC, u.full_name ASC`,
      [...evalParams, ...(filters.semesterId ? [filters.semesterId] : []), departmentId]
    );

    res.json({
      department: departments[0],
      hod: hods[0] || null,
      lecturers: lecturers.map((lecturer) => ({
        lecturerId: lecturer.lecturerId,
        name: lecturer.name,
        department: lecturer.department,
        studentEvaluationScore: formatAverage(lecturer.studentEvaluationScore),
        overallScore: formatAverage(lecturer.overallScore),
        totalEvaluations: Number(lecturer.totalEvaluations || 0),
        supervisionScore: formatAverage(lecturer.supervisionScore),
        mentoringScore: formatAverage(lecturer.mentoringScore),
        otherScore: formatAverage(lecturer.otherScore),
        peerEvaluationScore: formatAverage(lecturer.peerEvaluationScore),
      })),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch department drill-down.", error: error.message });
  }
};

export const getDeanLecturerDetails = async (req, res) => {
  try {
    const lecturerId = parsePositiveInt(req.params.lecturerId);
    const filters = parseFilters(req);

    if (!lecturerId) {
      return res.status(400).json({ message: "Valid lecturer is required." });
    }

    const [lecturers] = await query(
      `SELECT u.id, u.full_name AS name, u.email, d.department_name AS department,
              lp.photo_url, lp.designation, lp.qualifications
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN lecturer_profiles lp ON lp.user_id = u.id
       WHERE u.id = ? AND u.role = 'lecturer' AND u.status = 'approved'
       LIMIT 1`,
      [lecturerId]
    );

    if (lecturers.length === 0) {
      return res.status(404).json({ message: "Lecturer not found." });
    }

    const moduleParams = [lecturerId];
    let where1 = "";
    let where2 = "";
    if (filters.semesterId) {
      where1 += " AND lm.semester_id = ?";
      where2 += " AND c.semester_id = ?";
      moduleParams.push(filters.semesterId);
    }
    if (filters.academicYear) {
      where1 += " AND lm.academic_year = ?";
      where2 += " AND s.academic_year = ?";
      moduleParams.push(filters.academicYear);
    }

    const [assignedModules] = await query(
      `SELECT c.id AS courseId, c.course_code, c.course_name, s.id AS semesterId,
              s.semester_name, s.academic_year
       FROM lecturer_modules lm
       INNER JOIN courses c ON lm.course_id = c.id
       INNER JOIN semesters s ON lm.semester_id = s.id
       WHERE lm.lecturer_id = ? ${where1}
       
       UNION
       
       SELECT c.id AS courseId, c.course_code, c.course_name, s.id AS semesterId,
              s.semester_name, s.academic_year
       FROM courses c
       INNER JOIN semesters s ON c.semester_id = s.id
       WHERE c.lecturer_id = ? ${where2}
       
       ORDER BY academic_year DESC, semester_name ASC, course_code ASC`,
      [...moduleParams, ...moduleParams]
    );

    const evalParams = [lecturerId];
    const evalConditions = ["es.lecturer_id = ?"];
    evalConditions.push(...buildEvalConditions(filters, evalParams));

    const [scoreRows] = await query(
      `SELECT 
         ROUND(AVG(es.overall_grade), 1) AS studentEvaluationScore,
         MAX(las.peer_evaluation_score) AS peerEvaluationScore,
         MAX(las.mentoring_score) AS mentoringScore,
         MAX(las.supervision_score) AS supervisionScore,
         MAX(las.other_score) AS otherScore,
         ROUND(
           (COALESCE(AVG(es.overall_grade), 0) * 0.50) +
           (COALESCE(MAX(las.peer_evaluation_score), 0) * 0.20) +
           (COALESCE(MAX(las.mentoring_score), 0) * 0.15) +
           (COALESCE(MAX(las.supervision_score), 0) * 0.10) +
           (COALESCE(MAX(las.other_score), 0) * 0.05),
           1
         ) AS overallScore,
         COUNT(DISTINCT es.id) AS totalResponses
       FROM users u
       LEFT JOIN evaluation_submissions es ON es.lecturer_id = u.id ${evalConditions.length > 1 ? `AND ${evalConditions.slice(1).join(" AND ")}` : ""}
       LEFT JOIN lecturer_award_scores las ON las.lecturer_id = u.id ${filters.semesterId ? "AND las.semester_id = ?" : ""}
       WHERE u.id = ?
       GROUP BY u.id`,
      [...evalParams.slice(1), ...(filters.semesterId ? [filters.semesterId] : []), lecturerId]
    );

    const scores = {
      studentEvaluationScore: formatAverage(scoreRows[0]?.studentEvaluationScore),
      peerEvaluationScore: formatAverage(scoreRows[0]?.peerEvaluationScore),
      mentoringScore: formatAverage(scoreRows[0]?.mentoringScore),
      supervisionScore: formatAverage(scoreRows[0]?.supervisionScore),
      otherScore: formatAverage(scoreRows[0]?.otherScore),
      overallScore: formatAverage(scoreRows[0]?.overallScore),
      totalResponses: Number(scoreRows[0]?.totalResponses || 0),
    };

    const [reports] = await query(
      `SELECT id, title, file_name, file_type, file_size, status, admin_comment, reviewed_at, submitted_at, report_type
       FROM supervision_reports
       WHERE lecturer_id = ?
       ORDER BY submitted_at DESC`,
      [lecturerId]
    );

    const [peerEvaluations] = await query(
      `SELECT peu.id, peu.file_name, peu.status, peu.submitted_at, u.full_name AS evaluator_name 
       FROM peer_evaluation_uploads peu
       INNER JOIN users u ON peu.evaluator_id = u.id
       WHERE peu.evaluated_id = ?
       ORDER BY peu.submitted_at DESC`,
      [lecturerId]
    );

    res.json({
      lecturer: lecturers[0],
      assignedModules,
      scores,
      supervisionReports: reports,
      peerEvaluations,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch lecturer details.", error: error.message });
  }
};

const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

export const exportFacultyReport = async (req, res) => {
  try {
    if ((req.query.format?.trim() || "csv") !== "csv") {
      return res.status(400).json({ message: "Only CSV export is supported right now." });
    }

    const filters = parseFilters(req);
    const params = [];
    const conditions = buildEvalConditions(filters, params);
    const filter = conditions.length ? `AND ${conditions.join(" AND ")}` : "";

    const [rows] = await query(
      `SELECT d.department_name AS departmentName,
              COUNT(es.id) AS totalEvaluations,
              AVG(es.overall_grade) AS averageScore
       FROM departments d
       LEFT JOIN users u ON u.department_id = d.id AND u.role = 'lecturer' AND u.status = 'approved'
       LEFT JOIN evaluation_submissions es ON es.lecturer_id = u.id ${filter}
       GROUP BY d.id, d.department_name
       ORDER BY d.department_name ASC`,
      params
    );

    const lines = [
      ["Faculty Report", "Faculty of Science"].map(escapeCsv).join(","),
      ["Generated", new Date().toISOString()].map(escapeCsv).join(","),
      "",
      ["Department", "Total Evaluations", "Average Score"].map(escapeCsv).join(","),
      ...rows.map((row) =>
        [row.departmentName, Number(row.totalEvaluations || 0), formatAverage(row.averageScore)]
          .map(escapeCsv)
          .join(",")
      ),
    ];

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=\"dean-faculty-report.csv\"");
    res.send(lines.join("\n"));
  } catch (error) {
    res.status(500).json({ message: "Failed to export faculty report.", error: error.message });
  }
};

export const exportDeanDepartmentReport = async (req, res) => {
  try {
    if ((req.query.format?.trim() || "csv") !== "csv") {
      return res.status(400).json({ message: "Only CSV export is supported right now." });
    }

    const departmentId = parsePositiveInt(req.params.departmentId);
    const filters = parseFilters(req);
    const params = [];
    const conditions = buildEvalConditions(filters, params);
    const filter = conditions.length ? `AND ${conditions.join(" AND ")}` : "";

    const [departmentRows] = await query("SELECT department_name FROM departments WHERE id = ? LIMIT 1", [departmentId]);
    if (departmentRows.length === 0) {
      return res.status(404).json({ message: "Department not found." });
    }

    const [rows] = await query(
      `SELECT u.full_name AS lecturerName,
              AVG(CASE WHEN es.type = 'theory' THEN es.overall_grade END) AS theoryScore,
              AVG(CASE WHEN es.type = 'practical' THEN es.overall_grade END) AS practicalScore,
              AVG(es.overall_grade) AS overallScore,
              COUNT(es.id) AS totalEvaluations
       FROM users u
       LEFT JOIN evaluation_submissions es ON es.lecturer_id = u.id ${filter}
       WHERE u.department_id = ? AND u.role = 'lecturer' AND u.status = 'approved'
       GROUP BY u.id, u.full_name
       ORDER BY u.full_name ASC`,
      [...params, departmentId]
    );

    const lines = [
      ["Department Report", departmentRows[0].department_name].map(escapeCsv).join(","),
      ["Generated", new Date().toISOString()].map(escapeCsv).join(","),
      "",
      ["Lecturer", "Theory Score", "Practical Score", "Overall Score", "Total Evaluations"].map(escapeCsv).join(","),
      ...rows.map((row) =>
        [
          row.lecturerName,
          formatAverage(row.theoryScore),
          formatAverage(row.practicalScore),
          formatAverage(row.overallScore),
          Number(row.totalEvaluations || 0),
        ].map(escapeCsv).join(",")
      ),
    ];

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=\"dean-department-report.csv\"");
    res.send(lines.join("\n"));
  } catch (error) {
    res.status(500).json({ message: "Failed to export department report.", error: error.message });
  }
};

export const downloadDeanSupervisionReport = async (req, res) => {
  try {
    const reportId = parsePositiveInt(req.params.reportId);

    if (!reportId) {
      return res.status(400).json({ message: "Valid report is required." });
    }

    const [reports] = await query(
      `SELECT file_name, file_path
       FROM supervision_reports
       WHERE id = ?
       LIMIT 1`,
      [reportId]
    );

    if (reports.length === 0) {
      return res.status(404).json({ message: "Report not found." });
    }

    const absolutePath = path.join(supervisionReportsUploadDir, path.basename(reports[0].file_path));
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: "Report file not found." });
    }

    res.download(absolutePath, reports[0].file_name);
  } catch (error) {
    res.status(500).json({ message: "Failed to download supervision report.", error: error.message });
  }
};

export const downloadDeanPeerEvaluation = async (req, res) => {
  try {
    const reportId = parsePositiveInt(req.params.reportId);
    if (!reportId || !req.user.faculty_id) {
      return res.status(400).json({ message: "Valid report and faculty are required." });
    }

    const [reports] = await query(
      `SELECT peu.file_name, peu.file_path
       FROM peer_evaluation_uploads peu
       INNER JOIN users u ON peu.evaluated_id = u.id
       INNER JOIN departments d ON u.department_id = d.id
       WHERE peu.id = ? AND d.faculty_id = ?
       LIMIT 1`,
      [reportId, req.user.faculty_id]
    );

    if (reports.length === 0) {
      return res.status(404).json({ message: "Peer evaluation report not found in your faculty." });
    }

    const absolutePath = path.join(peerEvaluationsUploadDir, path.basename(reports[0].file_path));
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ message: "Report file not found." });
    }

    res.download(absolutePath, reports[0].file_name);
  } catch (error) {
    res.status(500).json({ message: "Failed to download peer evaluation report.", error: error.message });
  }
};
