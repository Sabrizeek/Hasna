import { getPool, query } from "../config/db.js";
import { notifyUser, notifyUsers } from "../utils/notificationService.js";

const parsePositiveInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseScore = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 10 ? parsed : null;
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

export const getDashboardData = async (req, res) => {
  try {
    const studentId = req.user.id;
    
    // Get active semester
    const [activeSemesters] = await query("SELECT id, semester_name, academic_year FROM semesters WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1");
    const activeSemester = activeSemesters[0];
    
    if (!activeSemester) {
      return res.json({
        activeSemester: null,
        evaluationWindow: null,
        department: null,
        courses: []
      });
    }

    // Get student department(s) from the student_departments table
    const [departments] = await query(
      `SELECT d.id, d.department_name 
       FROM student_departments sd 
       JOIN departments d ON sd.department_id = d.id 
       WHERE sd.student_id = ?`, 
      [studentId]
    );
    const department = departments.length > 0 
      ? { id: departments[0].id, name: departments.map(d => d.department_name).join(', ') } 
      : null;

    // Get evaluation window for this semester
    const [windows] = await query(
      `SELECT id, open_date, close_date, status 
       FROM evaluation_windows 
       WHERE semester_id = ? AND status IN ('open', 'scheduled') 
         AND open_date <= NOW() AND close_date >= NOW() 
       ORDER BY open_date DESC LIMIT 1`, 
      [activeSemester.id]
    );
    const evaluationWindow = windows[0] ? {
      isOpen: true,
      window: windows[0],
      message: "Evaluation window is open."
    } : {
      isOpen: false,
      window: null,
      message: "No active evaluation window."
    };

    // Get enrolled courses
    const [courses] = await query(
      `SELECT c.id, c.course_code, c.course_name, d.department_name,
              EXISTS(SELECT 1 FROM lecturer_modules lm WHERE lm.course_id = c.id) as has_lecturers,
              EXISTS(SELECT 1 FROM evaluation_submissions es WHERE es.course_id = c.id AND es.student_id = ? AND es.semester_id = ?) as is_evaluated
       FROM student_courses sc
       JOIN courses c ON sc.course_id = c.id
       LEFT JOIN departments d ON c.department_id = d.id
       WHERE sc.student_id = ? AND sc.semester_id = ?
       ORDER BY c.course_code ASC`,
      [studentId, activeSemester.id, studentId, activeSemester.id]
    );

    res.json({
      activeSemester,
      evaluationWindow,
      department,
      courses
    });

  } catch (error) {
    res.status(500).json({ message: "Failed to fetch dashboard data.", error: error.message });
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
      return res.status(400).json({ message: "Overall grade is required." });
    }

    if (!comment) {
      return res.status(400).json({ message: "Comment is required." });
    }

    const normalizedResponses = responses.map((response) => ({
      questionId: parsePositiveInt(response.questionId),
      score: parseScore(response.score),
    }));

    if (normalizedResponses.some((response) => !response.questionId || !response.score)) {
      return res.status(400).json({ message: "Every response must include a valid question and score from 1 to 10." });
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

    try {
      const [notificationRows] = await query(
        `SELECT c.course_code, c.course_name, d.department_name, l.full_name AS lecturer_name,
                l.department_id AS lecturer_department_id, s.semester_name
         FROM courses c
         INNER JOIN users l ON l.id = ?
         INNER JOIN departments d ON l.department_id = d.id
         INNER JOIN semesters s ON s.id = ?
         WHERE c.id = ?
         LIMIT 1`,
        [lecturerId, semesterId, courseId]
      );
      const notificationInfo = notificationRows[0] || {};

      await notifyUser({
        userId: lecturerId,
        title: "New Evaluation Submitted",
        message: `A ${type} evaluation was submitted for ${notificationInfo.course_code || "your module"} - ${notificationInfo.course_name || "course"}.`,
        type: "info",
        relatedEntityType: "evaluation_submission",
        relatedEntityId: submissionResult.insertId,
      });

      await notifyUser({
        userId: req.user.id,
        title: "Evaluation Submitted",
        message: `Your ${type} evaluation for ${notificationInfo.lecturer_name || "the selected lecturer"} was submitted successfully.`,
        type: "success",
        relatedEntityType: "evaluation_submission",
        relatedEntityId: submissionResult.insertId,
      });

      if (notificationInfo.lecturer_department_id) {
        const [hods] = await query(
          `SELECT id FROM users
           WHERE role = 'hod'
             AND department_id = ?
             AND status = 'approved'
             AND deleted_at IS NULL`,
          [notificationInfo.lecturer_department_id]
        );
        await notifyUsers(hods.map((hod) => hod.id), {
          title: "Department Evaluation Submitted",
          message: `A ${type} evaluation was submitted for ${notificationInfo.lecturer_name || "a lecturer"} in ${notificationInfo.department_name || "your department"}.`,
          type: "info",
          relatedEntityType: "evaluation_submission",
          relatedEntityId: submissionResult.insertId,
        });
      }
    } catch (notificationError) {
      console.error("Evaluation notification failed:", notificationError.message);
    }

    res.status(201).json({
      message: "Evaluation submitted successfully.",
      submissionId: submissionResult.insertId,
    });
  } catch (error) {
    await connection.rollback();

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "You have already submitted this evaluation." });
    }

    console.error("Evaluation submission error:", error.message);
    res.status(500).json({ message: "Failed to submit evaluation.", error: error.message });
  } finally {
    connection.release();
  }
};

export const getEvaluationLecturers = async (req, res) => {
  try {
    const studentId = req.user.id;

    // Get active semester
    const [activeSemesters] = await query("SELECT id, academic_year FROM semesters WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1");
    if (activeSemesters.length === 0) {
      return res.status(400).json({ message: "No active semester." });
    }
    const semesterId = activeSemesters[0].id;
    const academicYear = activeSemesters[0].academic_year;

    // Get enrolled course IDs
    const [enrolled] = await query("SELECT course_id FROM student_courses WHERE student_id = ? AND semester_id = ?", [studentId, semesterId]);
    const courseIds = enrolled.map(e => e.course_id);

    if (courseIds.length === 0) {
      return res.json({ lecturers: [] });
    }

    const coursePlaceholders = courseIds.map(() => "?").join(", ");

    const [lecturers] = await query(
      `SELECT c.id AS course_id, c.course_code, c.course_name, u.id AS lecturer_id, u.full_name AS lecturer_name, 'both' AS type
       FROM courses c
       INNER JOIN users u ON c.lecturer_id = u.id
       WHERE c.id IN (${coursePlaceholders}) AND c.semester_id = ? AND u.role = 'lecturer' AND u.status = 'approved'
       UNION
       SELECT c.id AS course_id, c.course_code, c.course_name, u.id AS lecturer_id, u.full_name AS lecturer_name, lm.type
       FROM lecturer_modules lm
       INNER JOIN courses c ON lm.course_id = c.id
       INNER JOIN users u ON lm.lecturer_id = u.id
       WHERE lm.course_id IN (${coursePlaceholders}) AND lm.semester_id = ? AND lm.academic_year = ? AND u.role = 'lecturer' AND u.status = 'approved'
       ORDER BY course_code ASC, lecturer_name ASC`,
      [...courseIds, semesterId, ...courseIds, semesterId, academicYear]
    );

    const [submissions] = await query(
      `SELECT lecturer_id, course_id, type FROM evaluation_submissions 
       WHERE student_id = ? AND semester_id = ? AND course_id IN (${coursePlaceholders})`,
      [req.user.id, semesterId, ...courseIds]
    );

    const filteredLecturers = [];
    
    for (const lecturer of lecturers) {
      const hasTheory = submissions.some(s => s.lecturer_id === lecturer.lecturer_id && s.course_id === lecturer.course_id && s.type === 'theory');
      const hasPractical = submissions.some(s => s.lecturer_id === lecturer.lecturer_id && s.course_id === lecturer.course_id && s.type === 'practical');
      
      if (lecturer.type === 'both') {
        if (!hasTheory && !hasPractical) filteredLecturers.push(lecturer);
        else if (!hasTheory && hasPractical) filteredLecturers.push({ ...lecturer, type: 'theory' });
        else if (hasTheory && !hasPractical) filteredLecturers.push({ ...lecturer, type: 'practical' });
      } else if (lecturer.type === 'theory' && !hasTheory) {
        filteredLecturers.push(lecturer);
      } else if (lecturer.type === 'practical' && !hasPractical) {
        filteredLecturers.push(lecturer);
      }
    }

    res.json({ lecturers: filteredLecturers });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch evaluation lecturers.", error: error.message });
  }
};

export const createBulkSubmissions = async (req, res) => {
  const pool = await getPool();
  const connection = await pool.getConnection();

  try {
    const submissions = Array.isArray(req.body.submissions) ? req.body.submissions : [];

    if (submissions.length === 0) {
      return res.status(400).json({ message: "Submissions are required." });
    }

    // Get active semester
    const [activeSemesters] = await connection.execute("SELECT id, academic_year FROM semesters WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1");
    if (activeSemesters.length === 0) {
      return res.status(400).json({ message: "No active semester." });
    }
    const semesterId = activeSemesters[0].id;
    const academicYear = activeSemesters[0].academic_year;

    const openWindow = await getOpenEvaluationWindow(semesterId, academicYear);
    if (!openWindow) {
      return res.status(403).json({ message: "Evaluation is currently closed for this semester." });
    }

    await connection.beginTransaction();

    const insertedSubmissions = [];

    for (const sub of submissions) {
      const lecturerId = parsePositiveInt(sub.lecturerId);
      const courseId = parsePositiveInt(sub.courseId);
      const type = sub.type?.trim();
      const responses = Array.isArray(sub.responses) ? sub.responses : [];
      const comment = sub.comment?.trim();

      if (!lecturerId || !courseId || !type || !comment) {
        throw new Error("Missing required fields in one or more submissions.");
      }



      // STRICT VALIDATION: Backend calculated overallGrade
      if (responses.length !== 10) {
        throw new Error("Exactly 10 question responses are required for each submission.");
      }

      const normalizedResponses = responses.map((r) => ({
        questionId: parsePositiveInt(r.questionId),
        score: parseScore(r.score),
      }));

      if (normalizedResponses.some((r) => !r.questionId || !r.score)) {
        throw new Error("Every response must include a valid question and score from 1 to 10.");
      }

      const totalScore = normalizedResponses.reduce((sum, r) => sum + r.score, 0);
      const overallGrade = (totalScore / (normalizedResponses.length * 10)) * 100;

      // STRICT VALIDATION: Check if student is actually enrolled in this course for this semester
      const [enrollmentCheck] = await connection.execute(
        `SELECT id FROM student_courses WHERE student_id = ? AND course_id = ? AND semester_id = ?`,
        [req.user.id, courseId, semesterId]
      );
      if (enrollmentCheck.length === 0) {
        const err = new Error(`You are not registered for course ${courseId} in the active semester.`);
        err.status = 403;
        throw err;
      }

      const [assignmentCheck] = await connection.execute(
        `SELECT 1 FROM courses c
         LEFT JOIN lecturer_modules lm ON c.id = lm.course_id AND lm.lecturer_id = ?
         WHERE c.id = ? AND (c.lecturer_id = ? OR lm.lecturer_id = ?)
         LIMIT 1`,
        [lecturerId, courseId, lecturerId, lecturerId]
      );
      if (assignmentCheck.length === 0) {
        const err = new Error(`Lecturer ${lecturerId} is not assigned to course ${courseId}.`);
        err.status = 403;
        throw err;
      }



      const [existingSubmissions] = await connection.execute(
        `SELECT id FROM evaluation_submissions
         WHERE student_id = ? AND lecturer_id = ? AND course_id = ? AND semester_id = ? AND type = ?
         LIMIT 1`,
        [req.user.id, lecturerId, courseId, semesterId, type]
      );

      if (existingSubmissions.length > 0) {
        throw new Error(`Evaluation already submitted for ${type} module.`);
      }

      const [submissionResult] = await connection.execute(
        `INSERT INTO evaluation_submissions
         (student_id, lecturer_id, course_id, semester_id, academic_year, type, overall_grade, comment_text)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, lecturerId, courseId, semesterId, academicYear, type, overallGrade, comment]
      );

      const responsePlaceholders = responses.map(() => "(?, ?, ?)").join(", ");
      const responseParams = responses.flatMap((r) => [
        submissionResult.insertId,
        parsePositiveInt(r.questionId),
        parsePositiveInt(r.score), // 1-10 scale
      ]);

      await connection.execute(
        `INSERT INTO evaluation_responses (submission_id, question_id, score)
         VALUES ${responsePlaceholders}`,
        responseParams
      );

      insertedSubmissions.push(submissionResult.insertId);
    }

    await connection.commit();

    try {
      await notifyUser({
        userId: req.user.id,
        title: "Evaluation Submitted",
        message: "Your evaluations were submitted successfully.",
        type: "success",
        relatedEntityType: "evaluation_submission",
        relatedEntityId: insertedSubmissions[0],
      });
    } catch (notificationError) {
      console.error("Evaluation notification failed:", notificationError.message);
    }

    res.status(201).json({ message: "Evaluations submitted successfully." });
  } catch (error) {
    await connection.rollback();
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    res.status(error.message.includes("already submitted") || error.message.includes("required") ? 400 : 500).json({ 
      message: error.message || "Failed to submit evaluations." 
    });
  } finally {
    connection.release();
  }
};

export const getEligibleModules = async (req, res) => {
  try {
    const studentId = req.user.id;

    // 1. Get active semester and deadline
    const [activeSemesters] = await query("SELECT id, academic_year, semester_name, module_selection_deadline FROM semesters WHERE is_active = 1 LIMIT 1");
    if (!activeSemesters.length) {
      return res.status(400).json({ message: "No active semester found." });
    }
    const activeSemester = activeSemesters[0];

    // 2. Determine Student Year (Option A)
    const [userRows] = await query("SELECT university_id FROM users WHERE id = ?", [studentId]);
    if (!userRows.length || !userRows[0].university_id) {
      return res.status(400).json({ message: "Invalid student profile." });
    }
    const universityId = userRows[0].university_id;
    const match = universityId.match(/SC\/(\d{4})\//i);
    let currentYear = 1; // Default
    if (match) {
      const entryYear = parseInt(match[1], 10);
      const currentAcademicYearStart = parseInt(activeSemester.academic_year.substring(0, 4), 10);
      currentYear = currentAcademicYearStart - entryYear + 1;
      if (currentYear < 1) currentYear = 1;
      if (currentYear > 4) currentYear = 4;
    }
    const yearString = `Year ${currentYear}`;

    // 3. Get Student Departments
    const [depts] = await query("SELECT department_id FROM student_departments WHERE student_id = ?", [studentId]);
    if (!depts.length) {
      return res.json({ courses: [], deadline: activeSemester.module_selection_deadline, currentYear });
    }
    const deptIds = depts.map(d => d.department_id);
    const deptPlaceholders = deptIds.map(() => "?").join(", ");

    // 4. Fetch Eligible Courses
    // The user specified: "1st number is the year".
    const [allCourses] = await query(
      `SELECT c.id, c.course_code, c.course_name, c.is_core, d.department_name
       FROM courses c
       JOIN departments d ON c.department_id = d.id
       WHERE c.semester_id = ? 
       AND c.department_id IN (${deptPlaceholders})
       ORDER BY d.department_name, c.course_code`,
      [activeSemester.id, ...deptIds]
    );

    const courses = allCourses.filter(c => {
      const match = c.course_code.match(/\d/);
      return match && match[0] === String(currentYear);
    });

    // 5. Get currently selected courses
    const [selected] = await query("SELECT course_id FROM student_courses WHERE student_id = ? AND semester_id = ?", [studentId, activeSemester.id]);
    const selectedCourseIds = selected.map(s => s.course_id);

    res.json({
      courses,
      selectedCourseIds,
      deadline: activeSemester.module_selection_deadline,
      currentYear,
      semester: activeSemester
    });

  } catch (error) {
    res.status(500).json({ message: "Failed to fetch eligible modules.", error: error.message });
  }
};

export const saveModuleSelections = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { courseIds } = req.body;

    if (!Array.isArray(courseIds)) {
      return res.status(400).json({ message: "Invalid course selections." });
    }

    const [activeSemesters] = await query("SELECT id, module_selection_deadline, academic_year FROM semesters WHERE is_active = 1 LIMIT 1");
    if (!activeSemesters.length) {
      return res.status(400).json({ message: "No active semester found." });
    }
    const activeSemester = activeSemesters[0];

    if (activeSemester.module_selection_deadline && new Date() > new Date(activeSemester.module_selection_deadline)) {
      return res.status(403).json({ message: "The module selection deadline has passed." });
    }

    // Re-verify eligibility to prevent malicious injection
    const [depts] = await query("SELECT department_id FROM student_departments WHERE student_id = ?", [studentId]);
    if (depts.length === 0) {
      return res.status(403).json({ message: "No registered departments found." });
    }
    const deptIds = depts.map(d => d.department_id);

    const [userRec] = await query("SELECT university_id FROM users WHERE id = ?", [studentId]);
    const uIdMatch = userRec[0]?.university_id?.match(/SC\/(\d{4})\/\d+/);
    if (!uIdMatch) {
      return res.status(400).json({ message: "Invalid student university ID format." });
    }
    const intakeYear = parseInt(uIdMatch[1], 10);
    const semYearMatch = activeSemester.academic_year.match(/^(\d{4})/);
    const semYear = semYearMatch ? parseInt(semYearMatch[1], 10) : new Date().getFullYear();
    const currentYear = Math.max(1, semYear - intakeYear + 1);

    const deptPlaceholders = deptIds.map(() => "?").join(", ");
    const [allCourses] = await query(
      `SELECT c.id, c.course_code, c.is_core 
       FROM courses c
       WHERE c.semester_id = ? 
       AND c.department_id IN (${deptPlaceholders})`,
      [activeSemester.id, ...deptIds]
    );

    const eligibleCourseIds = allCourses
      .filter(c => {
        const match = c.course_code.match(/\d/);
        return match && match[0] === String(currentYear);
      });

    const eligibleCourseIdsList = eligibleCourseIds.map(c => c.id);
    const coreCourseIdsList = eligibleCourseIds.filter(c => c.is_core === 1).map(c => c.id);

    // Filter valid courses submitted by user
    const validCourseIds = courseIds.filter(id => eligibleCourseIdsList.includes(parseInt(id, 10)));
    
    // Ensure all core modules are always included
    const finalCourseIds = new Set([...validCourseIds.map(id => parseInt(id, 10)), ...coreCourseIdsList]);

    // Save
    await query("DELETE FROM student_courses WHERE student_id = ? AND semester_id = ?", [studentId, activeSemester.id]);
    
    for (const courseId of finalCourseIds) {
      await query(
        "INSERT INTO student_courses (student_id, course_id, semester_id) VALUES (?, ?, ?)",
        [studentId, courseId, activeSemester.id]
      );
    }

    res.json({ message: "Module selections saved successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to save module selections.", error: error.message });
  }
};
