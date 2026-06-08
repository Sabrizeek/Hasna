import { query } from "../config/db.js";
import fs from "fs";
import path from "path";
import { supervisionReportsUploadDir } from "../utils/uploadDirectories.js";

const parsePositiveInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseFilters = (req) => ({
  semesterId: parsePositiveInt(req.query.semesterId),
  academicYear: req.query.academicYear?.trim() || null,
});

const formatAverage = (value) => (value === null || value === undefined ? 0 : Number(Number(value).toFixed(2)));

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
    const evalParams = [];
    const evalConditions = buildEvalConditions(filters, evalParams);
    const evalWhere = evalConditions.length ? `WHERE ${evalConditions.join(" AND ")}` : "";

    const [lecturerRows] = await query(
      "SELECT COUNT(*) AS totalLecturers FROM users WHERE role = 'lecturer' AND status = 'approved'"
    );

    const [evaluationRows] = await query(
      `SELECT COUNT(*) AS totalEvaluations, AVG(overall_grade) AS facultyAverageScore
       FROM evaluation_submissions es
       ${evalWhere}`,
      evalParams
    );

    const [departmentRows] = await query(
      `SELECT COUNT(DISTINCT u.department_id) AS departmentsEvaluated
       FROM evaluation_submissions es
       INNER JOIN users u ON es.lecturer_id = u.id
       ${evalWhere}`,
      evalParams
    );

    const deptParams = [];
    const deptConditions = buildEvalConditions(filters, deptParams);
    const deptFilter = deptConditions.length ? `AND ${deptConditions.join(" AND ")}` : "";

    const [departmentAverages] = await query(
      `SELECT d.id AS departmentId, d.department_name AS departmentName,
              AVG(es.overall_grade) AS averageScore,
              COUNT(es.id) AS totalEvaluations
       FROM departments d
       LEFT JOIN users u ON u.department_id = d.id AND u.role = 'lecturer' AND u.status = 'approved'
       LEFT JOIN evaluation_submissions es ON es.lecturer_id = u.id ${deptFilter}
       GROUP BY d.id, d.department_name
       ORDER BY averageScore DESC, d.department_name ASC`,
      deptParams
    );

    const performerParams = [];
    const performerConditions = buildEvalConditions(filters, performerParams);
    const performerFilter = performerConditions.length ? `AND ${performerConditions.join(" AND ")}` : "";

    const [performerRows] = await query(
      `SELECT u.id AS lecturerId, u.full_name AS name, d.department_name AS departmentName,
              AVG(es.overall_grade) AS averageScore,
              COUNT(es.id) AS totalEvaluations
       FROM users u
       INNER JOIN departments d ON u.department_id = d.id
       LEFT JOIN evaluation_submissions es ON es.lecturer_id = u.id ${performerFilter}
       WHERE u.role = 'lecturer' AND u.status = 'approved'
       GROUP BY u.id, u.full_name, d.department_name
       HAVING totalEvaluations > 0
       ORDER BY averageScore DESC, u.full_name ASC`,
      performerParams
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
        departmentsEvaluated: Number(departmentRows[0]?.departmentsEvaluated || 0),
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
              AVG(CASE WHEN es.type = 'theory' THEN es.overall_grade END) AS theoryScore,
              AVG(CASE WHEN es.type = 'practical' THEN es.overall_grade END) AS practicalScore,
              AVG(es.overall_grade) AS overallScore,
              COUNT(es.id) AS totalEvaluations
       FROM users u
       INNER JOIN departments d ON u.department_id = d.id
       LEFT JOIN evaluation_submissions es ON es.lecturer_id = u.id ${evalFilter}
       WHERE u.department_id = ? AND u.role = 'lecturer' AND u.status = 'approved'
       GROUP BY u.id, u.full_name, d.department_name
       ORDER BY overallScore DESC, u.full_name ASC`,
      [...evalParams, departmentId]
    );

    res.json({
      department: departments[0],
      hod: hods[0] || null,
      lecturers: lecturers.map((lecturer) => ({
        lecturerId: lecturer.lecturerId,
        name: lecturer.name,
        department: lecturer.department,
        theoryScore: formatAverage(lecturer.theoryScore),
        practicalScore: formatAverage(lecturer.practicalScore),
        overallScore: formatAverage(lecturer.overallScore),
        totalEvaluations: Number(lecturer.totalEvaluations || 0),
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

    const moduleConditions = ["c.lecturer_id = ?"];
    const moduleParams = [lecturerId];
    if (filters.semesterId) {
      moduleConditions.push("c.semester_id = ?");
      moduleParams.push(filters.semesterId);
    }
    if (filters.academicYear) {
      moduleConditions.push("s.academic_year = ?");
      moduleParams.push(filters.academicYear);
    }

    const [assignedModules] = await query(
      `SELECT c.id AS courseId, c.course_code, c.course_name, s.id AS semesterId,
              s.semester_name, s.academic_year
       FROM courses c
       INNER JOIN semesters s ON c.semester_id = s.id
       WHERE ${moduleConditions.join(" AND ")}
       ORDER BY s.academic_year DESC, s.semester_name ASC, c.course_code ASC`,
      moduleParams
    );

    const evalParams = [lecturerId];
    const evalConditions = ["es.lecturer_id = ?"];
    evalConditions.push(...buildEvalConditions(filters, evalParams));

    const [summaryRows] = await query(
      `SELECT es.type, COUNT(*) AS totalResponses, AVG(es.overall_grade) AS averageScore
       FROM evaluation_submissions es
       WHERE ${evalConditions.join(" AND ")}
       GROUP BY es.type`,
      evalParams
    );

    const evaluationSummaries = {
      theory: { totalResponses: 0, averageScore: 0 },
      practical: { totalResponses: 0, averageScore: 0 },
    };

    for (const row of summaryRows) {
      evaluationSummaries[row.type] = {
        totalResponses: Number(row.totalResponses || 0),
        averageScore: formatAverage(row.averageScore),
      };
    }

    const [reports] = await query(
      `SELECT id, title, file_name, file_type, file_size, status, admin_comment, reviewed_at, submitted_at
       FROM supervision_reports
       WHERE lecturer_id = ?
       ORDER BY submitted_at DESC`,
      [lecturerId]
    );

    res.json({
      lecturer: lecturers[0],
      assignedModules,
      evaluationSummaries,
      supervisionReports: reports,
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
