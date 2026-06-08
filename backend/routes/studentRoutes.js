import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { requireRole } from "../middleware/roleMiddleware.js";
import {
  checkStudentSubmission,
  createStudentSubmission,
  getCourseLecturers,
  getLecturerProfile,
  getStudentAcademicYears,
  getStudentCourses,
  getStudentDepartments,
  getStudentEvaluationWindow,
  getStudentSemesters,
} from "../controllers/studentController.js";

const router = Router();

router.use(requireAuth, requireRole("student"));

router.get("/departments", getStudentDepartments);
router.get("/academic-years", getStudentAcademicYears);
router.get("/semesters", getStudentSemesters);
router.get("/evaluation-window", getStudentEvaluationWindow);
router.get("/courses", getStudentCourses);
router.get("/courses/:courseId/lecturers", getCourseLecturers);
router.get("/lecturers/:lecturerId/profile", getLecturerProfile);
router.get("/submissions/check", checkStudentSubmission);
router.post("/submissions", createStudentSubmission);

export default router;
