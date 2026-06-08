import { getPool, query } from "../config/db.js";

const parsePositiveInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseScore = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 5 ? parsed : null;
};

const getOpenEvaluationWindow = async (semesterId, academicYear) => {
  const [windows] = await query(
    `SELECT id, semester_id, academic_year, open_date, close_date, status
     FROM evaluation_windows
     WHERE semester_id = ?
       AND academic_year = ?
       AND status IN ('open', 'scheduled')
       AND open_date <= NOW()
       AND close_date >= NOW()
     ORDER BY open_date DESC
     LIMIT 1`,
    [semesterId, academicYear]
  );

  return windows[0] || null;
};

export const getStudentDepartments = async (req, res) => {
  try {
    const [departments] = await query(
      "SELECT id, department_name, faculty_name FROM departments ORDER BY department_name ASC"
    );

    res.json({ departments });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch departments.", error: error.message });
  }
};

export const getStudentAcademicYears = async (req, res) => {
  try {
    const [academicYears] = await query(
      `SELECT DISTINCT academic_year
       FROM (
         SELECT s.academic_year
         FROM courses c
         INNER JOIN semesters s ON c.semester_id = s.id
         UNION
         SELECT lm.academic_year
         FROM lecturer_modules lm
       ) years
       WHERE academic_year IS NOT NULL AND academic_year != ''
       ORDER BY academic_year DESC`
    );

    res.json({ academicYears: academicYears.map((row) => row.academic_year) });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch academic years.", error: error.message });
  }
};

export const getStudentSemesters = async (req, res) => {
  try {
    const [semesters] = await query(
      "SELECT id, semester_name, academic_year, is_active FROM semesters ORDER BY is_active DESC, created_at DESC"
    );

    res.json({ semesters });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch semesters.", error: error.message });
  }
};

export const getStudentCourses = async (req, res) => {
  try {
    const departmentId = parsePositiveInt(req.query.departmentId);
    const semesterId = parsePositiveInt(req.query.semesterId);
    const academicYear = req.query.academicYear?.trim();

    const conditions = [];
    const params = [];

    if (departmentId) {
      conditions.push("c.department_id = ?");
      params.push(departmentId);
    }

    if (semesterId) {
      conditions.push("c.semester_id = ?");
      params.push(semesterId);
    }

    if (academicYear) {
      conditions.push("s.academic_year = ?");
      params.push(academicYear);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [courses] = await query(
      `SELECT c.id, c.course_code, c.course_name, c.department_id, c.semester_id,
              d.department_name, s.semester_name, s.academic_year
       FROM courses c
       INNER JOIN departments d ON c.department_id = d.id
       INNER JOIN semesters s ON c.semester_id = s.id
       ${whereClause}
       ORDER BY c.course_code ASC, c.course_name ASC`,
      params
    );

    res.json({ courses });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch courses.", error: error.message });
  }
};

export const getStudentEvaluationWindow = async (req, res) => {
  try {
    const semesterId = parsePositiveInt(req.query.semesterId);
    const academicYear = req.query.academicYear?.trim();

    if (!semesterId || !academicYear) {
      return res.status(400).json({ message: "Semester and academic year are required." });
    }

    const openWindow = await getOpenEvaluationWindow(semesterId, academicYear);

    if (openWindow) {
      return res.json({
        isOpen: true,
        window: openWindow,
        message: "Evaluation is open.",
      });
    }

    const [latestWindows] = await query(
      `SELECT id, semester_id, academic_year, open_date, close_date, status
       FROM evaluation_windows
       WHERE semester_id = ? AND academic_year = ?
       ORDER BY open_date DESC
       LIMIT 1`,
      [semesterId, academicYear]
    );

    res.json({
      isOpen: false,
      window: latestWindows[0] || null,
      message: latestWindows.length > 0
        ? `Evaluation is ${latestWindows[0].status === "closed" ? "closed" : "not open yet"}.`
        : "No evaluation window has been opened for this semester.",
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch evaluation window.", error: error.message });
  }
};

export const getCourseLecturers = async (req, res) => {
  try {
    const courseId = parsePositiveInt(req.params.courseId);
    const semesterId = parsePositiveInt(req.query.semesterId);
    const academicYear = req.query.academicYear?.trim();

    if (!courseId || !semesterId || !academicYear) {
      return res.status(400).json({ message: "Course, semester and academic year are required." });
    }

    const [courses] = await query(
      `SELECT c.id, c.course_code, c.course_name, c.department_id, d.department_name,
              c.semester_id, s.semester_name, s.academic_year
       FROM courses c
       INNER JOIN departments d ON c.department_id = d.id
       INNER JOIN semesters s ON c.semester_id = s.id
       WHERE c.id = ? AND c.semester_id = ? AND s.academic_year = ?
       LIMIT 1`,
      [courseId, semesterId, academicYear]
    );

    if (courses.length === 0) {
      return res.status(404).json({ message: "Course not found for the selected semester." });
    }

    const [lecturers] = await query(
      `SELECT DISTINCT lecturer.id, lecturer.full_name, lecturer.email, lecturer.department_name,
              lecturer.photo_url, lecturer.designation
       FROM (
         SELECT u.id, u.full_name, u.email, d.department_name, lp.photo_url, lp.designation
         FROM courses c
         INNER JOIN users u ON c.lecturer_id = u.id
         LEFT JOIN departments d ON u.department_id = d.id
         LEFT JOIN lecturer_profiles lp ON lp.user_id = u.id
         INNER JOIN semesters s ON c.semester_id = s.id
         WHERE c.id = ? AND c.semester_id = ? AND s.academic_year = ? AND u.role = 'lecturer' AND u.status = 'approved'
         UNION
         SELECT u.id, u.full_name, u.email, d.department_name, lp.photo_url, lp.designation
         FROM lecturer_modules lm
         INNER JOIN users u ON lm.lecturer_id = u.id
         LEFT JOIN departments d ON u.department_id = d.id
         LEFT JOIN lecturer_profiles lp ON lp.user_id = u.id
         WHERE lm.course_id = ? AND lm.semester_id = ? AND lm.academic_year = ? AND u.role = 'lecturer' AND u.status = 'approved'
       ) lecturer
       ORDER BY lecturer.full_name ASC`,
      [courseId, semesterId, academicYear, courseId, semesterId, academicYear]
    );

    res.json({ course: courses[0], lecturers });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch lecturers.", error: error.message });
  }
};

export const getLecturerProfile = async (req, res) => {
  try {
    const lecturerId = parsePositiveInt(req.params.lecturerId);

    if (!lecturerId) {
      return res.status(400).json({ message: "Valid lecturer is required." });
    }

    const [lecturers] = await query(
      `SELECT u.id, u.full_name AS name, u.email, d.department_name AS department,
              lp.designation, lp.photo_url, lp.qualifications
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN lecturer_profiles lp ON lp.user_id = u.id
       WHERE u.id = ? AND u.role = 'lecturer' AND u.status = 'approved'
       LIMIT 1`,
      [lecturerId]
    );

    if (lecturers.length === 0) {
      return res.status(404).json({ message: "Lecturer profile not found." });
    }

    res.json({ lecturer: lecturers[0] });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch lecturer profile.", error: error.message });
  }
};

export const checkStudentSubmission = async (req, res) => {
  try {
    const lecturerId = parsePositiveInt(req.query.lecturerId);
    const courseId = parsePositiveInt(req.query.courseId);
    const semesterId = parsePositiveInt(req.query.semesterId);
    const academicYear = req.query.academicYear?.trim();
    const type = req.query.type?.trim();

    if (!lecturerId || !courseId || !semesterId || !academicYear || !["theory", "practical"].includes(type)) {
      return res.status(400).json({ message: "Lecturer, course, semester, academic year and evaluation type are required." });
    }

    const [submissions] = await query(
      `SELECT id
       FROM evaluation_submissions
       WHERE student_id = ? AND lecturer_id = ? AND course_id = ? AND semester_id = ? AND academic_year = ? AND type = ?
       LIMIT 1`,
      [req.user.id, lecturerId, courseId, semesterId, academicYear, type]
    );

    res.json({ alreadySubmitted: submissions.length > 0 });
  } catch (error) {
    res.status(500).json({ message: "Failed to check evaluation submission.", error: error.message });
  }
};

export const createStudentSubmission = async (req, res) => {
  const pool = await getPool();
  const connection = await pool.getConnection();

  try {
    const lecturerId = parsePositiveInt(req.body.lecturerId);
    const courseId = parsePositiveInt(req.body.courseId);
    const semesterId = parsePositiveInt(req.body.semesterId);
    const academicYear = req.body.academicYear?.trim();
    const type = req.body.type?.trim();
    const responses = Array.isArray(req.body.responses) ? req.body.responses : [];
    const overallGrade = parseScore(req.body.overallGrade);
    const comment = req.body.comment?.trim();

    if (!lecturerId || !courseId || !semesterId || !academicYear || !type) {
      return res.status(400).json({ message: "Lecturer, course, semester, academic year and type are required." });
    }

    if (!["theory", "practical"].includes(type)) {
      return res.status(400).json({ message: "Evaluation type must be theory or practical." });
    }

    const openWindow = await getOpenEvaluationWindow(semesterId, academicYear);
    if (!openWindow) {
      return res.status(403).json({ message: "Evaluation is currently closed for this semester." });
    }

    if (responses.length !== 10) {
      return res.status(400).json({ message: "Exactly 10 question responses are required." });
    }

    if (!overallGrade) {
      return res.status(400).json({ message: "Overall grade must be between 1 and 5." });
    }

    if (!comment) {
      return res.status(400).json({ message: "Comment is required." });
    }

    const normalizedResponses = responses.map((response) => ({
      questionId: parsePositiveInt(response.questionId),
      score: parseScore(response.score),
    }));

    if (normalizedResponses.some((response) => !response.questionId || !response.score)) {
      return res.status(400).json({ message: "Every response must include a valid question and score from 1 to 5." });
    }

    const uniqueQuestionIds = [...new Set(normalizedResponses.map((response) => response.questionId))];
    if (uniqueQuestionIds.length !== 10) {
      return res.status(400).json({ message: "Each question must be answered once." });
    }

    const questionPlaceholders = uniqueQuestionIds.map(() => "?").join(", ");
    const [matchingQuestions] = await query(
      `SELECT id
       FROM questions
       WHERE id IN (${questionPlaceholders}) AND type = ? AND is_active = 1`,
      [...uniqueQuestionIds, type]
    );

    if (matchingQuestions.length !== 10) {
      return res.status(400).json({ message: "Submitted questions do not match the selected evaluation type." });
    }

    const [courseRows] = await query(
      `SELECT c.id
       FROM courses c
       INNER JOIN semesters s ON c.semester_id = s.id
       WHERE c.id = ? AND c.semester_id = ? AND s.academic_year = ?
       LIMIT 1`,
      [courseId, semesterId, academicYear]
    );

    if (courseRows.length === 0) {
      return res.status(400).json({ message: "Selected course does not match the selected semester." });
    }

    const [lecturerRows] = await query(
      "SELECT id FROM users WHERE id = ? AND role = 'lecturer' AND status = 'approved' LIMIT 1",
      [lecturerId]
    );

    if (lecturerRows.length === 0) {
      return res.status(400).json({ message: "Selected lecturer is not available." });
    }

    const [existingSubmissions] = await query(
      `SELECT id
       FROM evaluation_submissions
       WHERE student_id = ? AND lecturer_id = ? AND course_id = ? AND semester_id = ? AND type = ?
       LIMIT 1`,
      [req.user.id, lecturerId, courseId, semesterId, type]
    );

    if (existingSubmissions.length > 0) {
      return res.status(409).json({ message: "You have already submitted this evaluation." });
    }

    await connection.beginTransaction();

    const [submissionResult] = await connection.execute(
      `INSERT INTO evaluation_submissions
       (student_id, lecturer_id, course_id, semester_id, academic_year, type, overall_grade, comment_text)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, lecturerId, courseId, semesterId, academicYear, type, overallGrade, comment]
    );

    const responsePlaceholders = normalizedResponses.map(() => "(?, ?, ?)").join(", ");
    const responseParams = normalizedResponses.flatMap((response) => [
      submissionResult.insertId,
      response.questionId,
      response.score,
    ]);

    await connection.execute(
      `INSERT INTO evaluation_responses (submission_id, question_id, score)
       VALUES ${responsePlaceholders}`,
      responseParams
    );

    await connection.commit();

    res.status(201).json({
      message: "Evaluation submitted successfully.",
      submissionId: submissionResult.insertId,
    });
  } catch (error) {
    await connection.rollback();

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "You have already submitted this evaluation." });
    }

    res.status(500).json({ message: "Failed to submit evaluation.", error: error.message });
  } finally {
    connection.release();
  }
};
