import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios.js";
import StudentLayout from "../components/StudentLayout.jsx";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]);
  const [formData, setFormData] = useState({
    departmentId: "",
    academicYear: "",
    semesterId: "",
    courseId: "",
  });
  const [loading, setLoading] = useState(true);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [windowLoading, setWindowLoading] = useState(false);
  const [evaluationWindow, setEvaluationWindow] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [departmentsRes, yearsRes, semestersRes] = await Promise.all([
          api.get("/student/departments"),
          api.get("/student/academic-years"),
          api.get("/student/semesters"),
        ]);

        const loadedDepartments = departmentsRes.data.departments || [];
        const loadedYears = yearsRes.data.academicYears || [];
        const loadedSemesters = semestersRes.data.semesters || [];
        const activeSemester = loadedSemesters.find((semester) => Number(semester.is_active) === 1);

        setDepartments(loadedDepartments);
        setAcademicYears(loadedYears);
        setSemesters(loadedSemesters);
        setFormData((current) => ({
          ...current,
          departmentId: current.departmentId || String(loadedDepartments[0]?.id || ""),
          academicYear: current.academicYear || activeSemester?.academic_year || loadedYears[0] || "",
          semesterId: current.semesterId || String(activeSemester?.id || loadedSemesters[0]?.id || ""),
        }));
      } catch (loadError) {
        setError(loadError.response?.data?.message || "Unable to load course filters.");
      } finally {
        setLoading(false);
      }
    };

    loadFilters();
  }, []);

  useEffect(() => {
    const loadCourses = async () => {
      if (!formData.departmentId || !formData.academicYear || !formData.semesterId) {
        setCourses([]);
        setFormData((current) => ({ ...current, courseId: "" }));
        return;
      }

      setCoursesLoading(true);
      setError("");

      try {
        const response = await api.get("/student/courses", {
          params: {
            departmentId: formData.departmentId,
            academicYear: formData.academicYear,
            semesterId: formData.semesterId,
          },
        });

        const loadedCourses = response.data.courses || [];
        setCourses(loadedCourses);
        setFormData((current) => ({
          ...current,
          courseId: loadedCourses.some((course) => String(course.id) === current.courseId)
            ? current.courseId
            : String(loadedCourses[0]?.id || ""),
        }));
      } catch (loadError) {
        setCourses([]);
        setError(loadError.response?.data?.message || "Unable to load course units.");
      } finally {
        setCoursesLoading(false);
      }
    };

    loadCourses();
  }, [formData.departmentId, formData.academicYear, formData.semesterId]);

  useEffect(() => {
    const loadEvaluationWindow = async () => {
      if (!formData.semesterId || !formData.academicYear) {
        setEvaluationWindow(null);
        return;
      }

      setWindowLoading(true);

      try {
        const response = await api.get("/student/evaluation-window", {
          params: {
            semesterId: formData.semesterId,
            academicYear: formData.academicYear,
          },
        });
        setEvaluationWindow(response.data);
      } catch (windowError) {
        setEvaluationWindow({
          isOpen: false,
          window: null,
          message: windowError.response?.data?.message || "Unable to check evaluation window.",
        });
      } finally {
        setWindowLoading(false);
      }
    };

    loadEvaluationWindow();
  }, [formData.semesterId, formData.academicYear]);

  const selectedCourse = useMemo(
    () => courses.find((course) => String(course.id) === formData.courseId),
    [courses, formData.courseId]
  );

  const filteredSemesters = useMemo(() => {
    if (!formData.academicYear) {
      return semesters;
    }

    return semesters.filter((semester) => semester.academic_year === formData.academicYear);
  }, [formData.academicYear, semesters]);

  useEffect(() => {
    if (filteredSemesters.length === 0) {
      return;
    }

    if (!filteredSemesters.some((semester) => String(semester.id) === formData.semesterId)) {
      setFormData((current) => ({
        ...current,
        semesterId: String(filteredSemesters[0].id),
        courseId: "",
      }));
    }
  }, [filteredSemesters, formData.semesterId]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
      courseId: name === "courseId" ? value : "",
    }));
  };

  const handleViewLecturers = () => {
    if (!selectedCourse) {
      setError("Please select a course unit before viewing lecturers.");
      return;
    }

    if (!evaluationWindow?.isOpen) {
      setError("Evaluation is not open for the selected semester.");
      return;
    }

    const params = new URLSearchParams({
      semesterId: formData.semesterId,
      academicYear: formData.academicYear,
      departmentId: formData.departmentId,
    });

    navigate(`/student/courses/${selectedCourse.id}/lecturers?${params.toString()}`);
  };

  return (
    <StudentLayout>
      <section className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="rounded-3xl border border-teal-100 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-600">Student Dashboard</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-950">Choose your course unit</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            Select the department, academic year, semester, and course unit to find the lecturer you want to evaluate.
          </p>

          {error && (
            <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {formData.semesterId && formData.academicYear && (
            <div className={`mt-6 rounded-2xl border px-4 py-3 text-sm font-medium ${
              evaluationWindow?.isOpen
                ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                : "border-amber-100 bg-amber-50 text-amber-800"
            }`}>
              {windowLoading ? (
                "Checking evaluation window..."
              ) : evaluationWindow?.isOpen ? (
                <>
                  Evaluation is open from {new Date(evaluationWindow.window.open_date).toLocaleString()} to {new Date(evaluationWindow.window.close_date).toLocaleString()}.
                </>
              ) : (
                evaluationWindow?.message || "Evaluation is not open for this semester."
              )}
            </div>
          )}

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Department</span>
              <select
                name="departmentId"
                value={formData.departmentId}
                onChange={handleChange}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                disabled={loading}
              >
                <option value="">Select department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.department_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Academic Year</span>
              <select
                name="academicYear"
                value={formData.academicYear}
                onChange={handleChange}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                disabled={loading}
              >
                <option value="">Select academic year</option>
                {academicYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Semester</span>
              <select
                name="semesterId"
                value={formData.semesterId}
                onChange={handleChange}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                disabled={loading}
              >
                <option value="">Select semester</option>
                {filteredSemesters.map((semester) => (
                  <option key={semester.id} value={semester.id}>
                    {semester.semester_name} - {semester.academic_year}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Course Unit</span>
              <select
                name="courseId"
                value={formData.courseId}
                onChange={handleChange}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                disabled={coursesLoading || courses.length === 0}
              >
                <option value="">{coursesLoading ? "Loading course units..." : "Select course unit"}</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.course_code} - {course.course_name}
                  </option>
                ))}
              </select>
              {!coursesLoading && formData.departmentId && formData.academicYear && formData.semesterId && courses.length === 0 && (
                <span className="block text-xs font-medium text-amber-700">
                  No course units match this department, academic year, and semester.
                </span>
              )}
            </label>
          </div>

          <button
            type="button"
            onClick={handleViewLecturers}
            disabled={!selectedCourse || !evaluationWindow?.isOpen}
            className="mt-8 rounded-2xl bg-teal-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            View Lecturers
          </button>
        </div>

        <aside className="rounded-3xl border border-teal-100 bg-teal-900 p-6 text-white shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-200">Selection Summary</p>
          <div className="mt-6 space-y-4 text-sm">
            <div>
              <p className="text-teal-200">Department</p>
              <p className="mt-1 font-semibold">{selectedCourse?.department_name || "Not selected"}</p>
            </div>
            <div>
              <p className="text-teal-200">Academic Year</p>
              <p className="mt-1 font-semibold">{formData.academicYear || "Not selected"}</p>
            </div>
            <div>
              <p className="text-teal-200">Course Unit</p>
              <p className="mt-1 font-semibold">
                {selectedCourse ? `${selectedCourse.course_code} - ${selectedCourse.course_name}` : "Not selected"}
              </p>
            </div>
          </div>
        </aside>
      </section>
    </StudentLayout>
  );
};

export default StudentDashboard;
