import { query, getPool } from "../config/db.js";
import { logAudit } from "../utils/auditLogger.js";

const determineAssignmentType = (theory, practical) => {
  if (theory && practical) return 'both';
  if (theory) return 'theory';
  if (practical) return 'practical';
  return 'both'; // Fallback
};

export const createCourse = async (req, res) => {
  let connection;
  try {
    const { course_code, course_name, department_id, semester_id, is_core, assignments } = req.body;

    if (!course_code || !course_name || !department_id || !semester_id) {
      return res.status(400).json({ message: "Course code, course name, department and semester are required." });
    }

    const pool = await getPool();
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Fetch the academic year for the selected semester
    const [[semester]] = await connection.execute("SELECT academic_year FROM semesters WHERE id = ?", [semester_id]);
    const academicYear = semester ? semester.academic_year : "2023/2024";

    const [result] = await connection.execute(
      "INSERT INTO courses (course_code, course_name, department_id, semester_id, is_core) VALUES (?, ?, ?, ?, ?)",
      [course_code, course_name, department_id, semester_id, is_core !== undefined ? is_core : 1]
    );
    const courseId = result.insertId;

    if (Array.isArray(assignments)) {
      for (const assignment of assignments) {
        if (!assignment.lecturerId) continue;
        const type = determineAssignmentType(assignment.typeTheory, assignment.typePractical);
        await connection.execute(
          "INSERT INTO lecturer_modules (lecturer_id, course_id, semester_id, academic_year, type) VALUES (?, ?, ?, ?, ?)",
          [
            assignment.lecturerId,
            courseId,
            semester_id,
            academicYear,
            type
          ]
        );
      }
    }

    await connection.commit();
    await logAudit({ userId: req.user?.id, action: "course_created", entityType: "course", entityId: courseId, details: { course_code, course_name, department_id, semester_id, assignments } });
    res.status(201).json({ message: "Course and assignments created successfully.", courseId });
  } catch (error) {
    if (connection) await connection.rollback();
    res.status(500).json({ message: "Failed to create course.", error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

export const getCourses = async (req, res) => {
  try {
    const [courses] = await query(
      `SELECT c.*, d.department_name, u.full_name AS lecturer_name, s.semester_name, s.academic_year
       FROM courses c
       LEFT JOIN departments d ON c.department_id = d.id
       LEFT JOIN users u ON c.lecturer_id = u.id
       LEFT JOIN semesters s ON c.semester_id = s.id
       ORDER BY c.created_at DESC`
    );

    res.json({ courses });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch courses.", error: error.message });
  }
};

export const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const [courses] = await query(
      `SELECT c.*, d.department_name, u.full_name AS lecturer_name, s.semester_name, s.academic_year
       FROM courses c
       LEFT JOIN departments d ON c.department_id = d.id
       LEFT JOIN users u ON c.lecturer_id = u.id
       LEFT JOIN semesters s ON c.semester_id = s.id
       WHERE c.id = ?`,
      [id]
    );

    if (courses.length === 0) {
      return res.status(404).json({ message: "Course not found." });
    }

    res.json({ course: courses[0] });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch course.", error: error.message });
  }
};

export const updateCourse = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const { course_code, course_name, department_id, semester_id, is_core, assignments } = req.body;

    const pool = await getPool();
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Fetch the academic year for the selected semester
    const [[semester]] = await connection.execute("SELECT academic_year FROM semesters WHERE id = ?", [semester_id]);
    const academicYear = semester ? semester.academic_year : "2023/2024";

    const [result] = await connection.execute(
      "UPDATE courses SET course_code = ?, course_name = ?, department_id = ?, semester_id = ?, is_core = ? WHERE id = ?",
      [course_code, course_name, department_id, semester_id, is_core !== undefined ? is_core : 1, id]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Course not found." });
    }

    if (Array.isArray(assignments)) {
      // Clear existing assignments for this course
      await connection.execute("DELETE FROM lecturer_modules WHERE course_id = ?", [id]);
      
      // Insert new ones
      for (const assignment of assignments) {
        if (!assignment.lecturerId) continue;
        const type = determineAssignmentType(assignment.typeTheory, assignment.typePractical);
        await connection.execute(
          "INSERT INTO lecturer_modules (lecturer_id, course_id, semester_id, academic_year, type) VALUES (?, ?, ?, ?, ?)",
          [
            assignment.lecturerId,
            id,
            semester_id,
            academicYear, 
            type
          ]
        );
      }
    }

    await connection.commit();
    await logAudit({ userId: req.user?.id, action: "course_updated", entityType: "course", entityId: Number(id), details: { course_code, course_name, department_id, semester_id, assignments } });
    res.json({ message: "Course updated successfully." });
  } catch (error) {
    if (connection) await connection.rollback();
    res.status(500).json({ message: "Failed to update course.", error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await query("DELETE FROM courses WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Course not found." });
    }

    await logAudit({ userId: req.user?.id, action: "course_deleted", entityType: "course", entityId: Number(id) });
    res.json({ message: "Course deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete course.", error: error.message });
  }
};
