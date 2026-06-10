import { useEffect, useMemo, useState } from "react";
import api from "../api/axios.js";
import AdminLayout from "../components/AdminLayout.jsx";

const ModuleAssignmentManagement = () => {
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [formData, setFormData] = useState({ courseId: "", lecturerId: "" });
  const [error, setError] = useState("");

  const loadData = async () => {
    const [coursesRes, departmentsRes, usersRes, assignmentsRes] = await Promise.all([
      api.get("/courses"),
      api.get("/departments"),
      api.get("/admin/users"),
      api.get("/admin/module-assignments"),
    ]);
    setCourses(coursesRes.data.courses || []);
    setDepartments(departmentsRes.data.departments || []);
    setLecturers((usersRes.data.users || []).filter((user) => user.role === "lecturer" && user.status === "approved"));
    setAssignments(assignmentsRes.data.assignments || []);
    setFormData((current) => ({ ...current, courseId: current.courseId || String(coursesRes.data.courses?.[0]?.id || "") }));
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedCourse = useMemo(
    () => courses.find((course) => String(course.id) === formData.courseId),
    [courses, formData.courseId]
  );

  const handleAssign = async (event) => {
    event.preventDefault();
    setError("");
    if (!selectedCourse || !formData.lecturerId) {
      setError("Please select a course and lecturer.");
      return;
    }
    try {
      await api.post("/admin/module-assignments", {
        courseId: Number(selectedCourse.id),
        lecturerId: Number(formData.lecturerId),
        semesterId: Number(selectedCourse.semester_id),
        academicYear: selectedCourse.academic_year,
      });
      setFormData((current) => ({ ...current, lecturerId: "" }));
      loadData();
    } catch (assignError) {
      setError(assignError.response?.data?.message || "Unable to assign lecturer.");
    }
  };

  const removeAssignment = async (id) => {
    await api.delete(`/admin/module-assignments/${id}`);
    loadData();
  };

  return (
    <AdminLayout title="Module Assignments">
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold text-brandBlue">Departments & Courses</h3>
            <div className="mt-5 max-h-[28rem] space-y-4 overflow-y-auto pr-2">
              {departments.map((department) => (
                <div key={department.id} className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{department.department_name}</p>
                  <div className="mt-2 space-y-1 text-sm text-slate-600">
                    {courses.filter((course) => course.department_id === department.id).map((course) => (
                      <button key={course.id} type="button" onClick={() => setFormData((current) => ({ ...current, courseId: String(course.id) }))} className="block text-left hover:text-brandBlue">
                        {course.course_code} - {course.course_name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleAssign} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-bold text-brandBlue">Assign Lecturer</h3>
            {error && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
            <select value={formData.courseId} onChange={(event) => setFormData((current) => ({ ...current, courseId: event.target.value }))} className="mt-5 w-full rounded-2xl border border-slate-300 px-4 py-3">
              {courses.map((course) => <option key={course.id} value={course.id}>{course.course_code} - {course.course_name}</option>)}
            </select>
            <select value={formData.lecturerId} onChange={(event) => setFormData((current) => ({ ...current, lecturerId: event.target.value }))} className="mt-4 w-full rounded-2xl border border-slate-300 px-4 py-3">
              <option value="">Select lecturer</option>
              {lecturers.map((lecturer) => <option key={lecturer.id} value={lecturer.id}>{lecturer.full_name}</option>)}
            </select>
            <button className="mt-5 rounded-2xl bg-brandBlue px-5 py-3 font-semibold text-white">Assign Lecturer</button>
          </form>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-bold text-brandBlue">Module-Lecturer Assignments</h3>
          <div className="mt-5 max-h-[34rem] overflow-y-auto overflow-x-hidden">
            <table className="w-full table-fixed text-left text-sm [&_td]:break-words [&_th]:break-words">
              <thead className="sticky top-0 z-10 bg-white text-slate-500"><tr><th className="py-3 pr-4">Module</th><th className="py-3 pr-4">Semester</th><th className="py-3 pr-4">Lecturer</th><th className="py-3 pr-4">Action</th></tr></thead>
              <tbody>
                {assignments.map((assignment) => (
                  <tr key={assignment.id} className="border-t border-slate-100">
                    <td className="py-4 pr-4 font-semibold">{assignment.course_code} - {assignment.course_name}</td>
                    <td className="py-4 pr-4 text-slate-600">{assignment.semester_name} - {assignment.academic_year}</td>
                    <td className="py-4 pr-4 text-slate-600">{assignment.lecturer_name}</td>
                    <td className="py-4 pr-4 whitespace-nowrap"><button onClick={() => removeAssignment(assignment.id)} className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white">Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ModuleAssignmentManagement;
