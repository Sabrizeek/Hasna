import fs from "fs";
import path from "path";
import { query } from "../config/db.js";
import { supervisionReportsUploadDir } from "../utils/uploadDirectories.js";

const parsePositiveInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseFilters = (req) => ({
  semesterId: parsePositiveInt(req.query.semesterId),
  academicYear: req.query.academicYear?.trim() || null,
});

const buildSemesterWhere = (alias, filters, params) => {
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

const formatAverage = (value) => (value === null || value === undefined ? 0 : Number(Number(value).toFixed(2)));

const getDepartment = async (departmentId) => {
  const [departments] = await query(
    "SELECT id, department_name, faculty_name FROM departments WHERE id = ? LIMIT 1",
    [departmentId]
  );
  return departments[0] || null;
};

const ensureDepartmentLecturer = async (lecturerId, departmentId) => {
  const [lecturers] = await query(
    `SELECT u.id, u.full_name AS name, u.email, d.department_name AS department,
            lp.photo_url, lp.designation, lp.qualifications
     FROM users u
     LEFT JOIN departments d ON u.department_id = d.id
     LEFT JOIN lecturer_profiles lp ON lp.user_id = u.id
     WHERE u.id = ? AND u.department_id = ? AND u.role = 'lecturer' AND u.status = 'approved'
     LIMIT 1`,
    [lecturerId, departmentId]
  );

  return lecturers[0] || null;
};

export const getDepartmentOverview = async (req, res) => {
  try {
    const departmentId = req.user.department_id;
    const filters = parseFilters(req);

    if (!departmentId) {
      return res.status(400).json({ message: "HoD department is not assigned." });
    }

    const department = await getDepartment(departmentId);
    const evalConditions = ["u.department_id = ?"];
    const evalParams = [departmentId];
    evalConditions.push(...buildSemesterWhere("es", filters, evalParams));

    const reportConditions = ["u.department_id = ?"];
    const reportParams = [departmentId];

    const [lecturerCountRows] = await query(
      "SELECT COUNT(*) AS totalLecturers FROM users WHERE department_id = ? AND role = 'lecturer' AND status = 'approved'",
      [departmentId]
    );

    const [evaluationRows] = await query(
      `SELECT COUNT(es.id) AS totalEvaluations, ROUND(AVG(es.overall_grade), 1) AS averageScore
       FROM evaluation_submissions es
       INNER JOIN users u ON es.lecturer_id = u.id
       WHERE ${evalConditions.join(" AND ")}`,
      evalParams
    );

    const [pendingRows] = await query(
      `SELECT COUNT(sr.id) AS pendingReports
       FROM supervision_reports sr
       INNER JOIN users u ON sr.lecturer_id = u.id
       WHERE ${reportConditions.join(" AND ")} AND sr.status IN ('submitted', 'under_review')`,
      reportParams
    );

    const [lecturers] = await query(
      `SELECT u.id AS lecturerId, u.full_name AS name,
              COALESCE(
                GROUP_CONCAT(DISTINCT CONCAT(c.course_code, ' - ', c.course_name) ORDER BY c.course_code SEPARATOR '; '),
                ''
              ) AS modules,
              ROUND(AVG(CASE WHEN es.type = 'theory' THEN es.overall_grade END), 1) AS theoryScore,
              ROUND(AVG(CASE WHEN es.type = 'practical' THEN es.overall_grade END), 1) AS practicalScore,
              ROUND(AVG(es.overall_grade), 1) AS overallScore,
              COUNT(DISTINCT sr.id) AS reportsSubmitted
       FROM users u
       LEFT JOIN lecturer_modules lm ON lm.lecturer_id = u.id
       LEFT JOIN courses c ON lm.course_id = c.id ${filters.semesterId ? "AND c.semester_id = ?" : ""}
       LEFT JOIN evaluation_submissions es
         ON es.lecturer_id = u.id
        AND es.course_id = c.id
        ${filters.semesterId ? "AND es.semester_id = ?" : ""}
        ${filters.academicYear ? "AND es.academic_year = ?" : ""}
       LEFT JOIN supervision_reports sr ON sr.lecturer_id = u.id
       WHERE u.department_id = ?
         AND u.role = 'lecturer'
         AND u.status = 'approved'
       GROUP BY u.id, u.full_name
       ORDER BY overallScore DESC, u.full_name ASC`,
      [
        ...(filters.semesterId ? [filters.semesterId] : []),
        ...(filters.semesterId ? [filters.semesterId] : []),
        ...(filters.academicYear ? [filters.academicYear] : []),
        departmentId,
      ]
    );

    const normalizedLecturers = lecturers.map((lecturer) => ({
      lecturerId: lecturer.lecturerId,
      name: lecturer.name,
      modules: lecturer.modules ? lecturer.modules.split("; ") : [],
      theoryScore: formatAverage(lecturer.theoryScore),
      practicalScore: formatAverage(lecturer.practicalScore),
      overallScore: formatAverage(lecturer.overallScore),
      reportsSubmitted: Number(lecturer.reportsSubmitted || 0),
    }));

    res.json({
      department,
      kpis: {
        totalLecturers: Number(lecturerCountRows[0]?.totalLecturers || 0),
        totalEvaluations: Number(evaluationRows[0]?.totalEvaluations || 0),
        averageScore: formatAverage(evaluationRows[0]?.averageScore),
        pendingReports: Number(pendingRows[0]?.pendingReports || 0),
      },
      lecturers: normalizedLecturers,
      chartData: normalizedLecturers.map((lecturer) => ({
        lecturerId: lecturer.lecturerId,
        name: lecturer.name,
        averageScore: lecturer.overallScore,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch HoD department overview.", error: error.message });
  }
};

export const getHodSemesters = async (req, res) => {
  try {
    const [semesters] = await query(
      "SELECT id, semester_name, academic_year, is_active FROM semesters ORDER BY is_active DESC, academic_year DESC, semester_name ASC"
    );

    res.json({ semesters });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch semesters.", error: error.message });
  }
};

export const getHodLecturerDetails = async (req, res) => {
  try {
    const departmentId = req.user.department_id;
    const lecturerId = parsePositiveInt(req.params.lecturerId);
    const filters = parseFilters(req);

    if (!departmentId || !lecturerId) {
      return res.status(400).json({ message: "Department and lecturer are required." });
    }

    const lecturer = await ensureDepartmentLecturer(lecturerId, departmentId);
    if (!lecturer) {
      return res.status(404).json({ message: "Lecturer not found in your department." });
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

    const evalConditions = ["es.lecturer_id = ?"];
    const evalParams = [lecturerId];
    evalConditions.push(...buildSemesterWhere("es", filters, evalParams));

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
      lecturer,
      assignedModules,
      evaluationSummaries,
      supervisionReports: reports,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch lecturer details.", error: error.message });
  }
};

export const exportDepartmentReport = async (req, res) => {
  try {
    const departmentId = req.user.department_id;
    const format = req.query.format?.trim() || "csv";

    if (format !== "csv") {
      return res.status(400).json({ message: "Only CSV export is supported right now." });
    }

    const overviewReq = { ...req, query: req.query };
    const department = await getDepartment(departmentId);
    const filters = parseFilters(overviewReq);

    const evalJoin = [
      "es.lecturer_id = u.id",
      ...(filters.semesterId ? ["es.semester_id = ?"] : []),
      ...(filters.academicYear ? ["es.academic_year = ?"] : []),
    ].join(" AND ");

    const params = [
      ...(filters.semesterId ? [filters.semesterId] : []),
      ...(filters.academicYear ? [filters.academicYear] : []),
      departmentId,
    ];

    const [rows] = await query(
      `SELECT u.full_name AS lecturerName,
              AVG(CASE WHEN es.type = 'theory' THEN es.overall_grade END) AS theoryScore,
              AVG(CASE WHEN es.type = 'practical' THEN es.overall_grade END) AS practicalScore,
              AVG(es.overall_grade) AS overallScore,
              COUNT(es.id) AS totalEvaluations
       FROM users u
       LEFT JOIN evaluation_submissions es ON ${evalJoin}
       WHERE u.department_id = ? AND u.role = 'lecturer' AND u.status = 'approved'
       GROUP BY u.id, u.full_name
       ORDER BY u.full_name ASC`,
      params
    );

    const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const lines = [
      ["Department", department?.department_name || ""].map(escapeCsv).join(","),
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
    res.setHeader("Content-Disposition", "attachment; filename=\"hod-department-report.csv\"");
    res.send(lines.join("\n"));
  } catch (error) {
    res.status(500).json({ message: "Failed to export department report.", error: error.message });
  }
};

export const downloadHodSupervisionReport = async (req, res) => {
  try {
    const reportId = parsePositiveInt(req.params.reportId);

    if (!reportId || !req.user.department_id) {
      return res.status(400).json({ message: "Valid report and department are required." });
    }

    const [reports] = await query(
      `SELECT sr.file_name, sr.file_path
       FROM supervision_reports sr
       INNER JOIN users u ON sr.lecturer_id = u.id
       WHERE sr.id = ? AND u.department_id = ?
       LIMIT 1`,
      [reportId, req.user.department_id]
    );

    if (reports.length === 0) {
      return res.status(404).json({ message: "Report not found in your department." });
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
