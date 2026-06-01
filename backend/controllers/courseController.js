import { query } from "../config/db.js";

export const createCourse = async (req, res) => {
  try {
    const { course_code, course_name, department_id, lecturer_id, semester_id } = req.body;

    if (!course_code || !course_name || !department_id || !semester_id) {
      return res.status(400).json({ message: "Course code, course name, department and semester are required." });
    }

    const [result] = await query(
      "INSERT INTO courses (course_code, course_name, department_id, lecturer_id, semester_id) VALUES (?, ?, ?, ?, ?)",
      [course_code, course_name, department_id, lecturer_id || null, semester_id]
    );

    res.status(201).json({ message: "Course created successfully.", courseId: result.insertId });
  } catch (error) {
    res.status(500).json({ message: "Failed to create course.", error: error.message });
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
  try {
    const { id } = req.params;
    const { course_code, course_name, department_id, lecturer_id, semester_id } = req.body;

    const [result] = await query(
      "UPDATE courses SET course_code = ?, course_name = ?, department_id = ?, lecturer_id = ?, semester_id = ? WHERE id = ?",
      [course_code, course_name, department_id, lecturer_id || null, semester_id, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Course not found." });
    }

    res.json({ message: "Course updated successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to update course.", error: error.message });
  }
};

export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await query("DELETE FROM courses WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Course not found." });
    }

    res.json({ message: "Course deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete course.", error: error.message });
  }
};
