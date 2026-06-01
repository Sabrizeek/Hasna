import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout.jsx";
import api from "../api/axios.js";

const emptyForm = {
  course_code: "",
  course_name: "",
  department_id: "",
  lecturer_id: "",
  semester_id: "",
};

const CourseManagement = () => {
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const loadData = async () => {
    const [coursesRes, departmentsRes, semestersRes, usersRes] = await Promise.all([
      api.get("/courses"),
      api.get("/departments"),
      api.get("/semesters"),
      api.get("/admin/users"),
    ]);

    setCourses(coursesRes.data.courses || []);
    setDepartments(departmentsRes.data.departments || []);
    setSemesters(semestersRes.data.semesters || []);
    setLecturers((usersRes.data.users || []).filter((user) => user.role === "lecturer"));

    const firstDepartment = departmentsRes.data.departments?.[0];
    const firstSemester = semestersRes.data.semesters?.[0];
    if (!editingId) {
      setFormData((current) => ({
        ...current,
        department_id: current.department_id || String(firstDepartment?.id || ""),
        semester_id: current.semester_id || String(firstSemester?.id || ""),
      }));
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      ...formData,
      department_id: Number(formData.department_id),
      lecturer_id: formData.lecturer_id ? Number(formData.lecturer_id) : null,
      semester_id: Number(formData.semester_id),
    };

    if (editingId) {
      await api.put(`/courses/${editingId}`, payload);
    } else {
      await api.post("/courses", payload);
    }

    setFormData(emptyForm);
    setEditingId(null);
    loadData();
  };

  const handleEdit = (course) => {
    setEditingId(course.id);
    setFormData({
      course_code: course.course_code,
      course_name: course.course_name,
      department_id: String(course.department_id),
      lecturer_id: course.lecturer_id ? String(course.lecturer_id) : "",
      semester_id: String(course.semester_id),
    });
  };

  const handleDelete = async (id) => {
    await api.delete(`/courses/${id}`);
    loadData();
  };

  return (
    <AdminLayout title="Courses">
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-bold text-brandBlue">{editingId ? "Edit Course" : "Add Course"}</h3>
          <div className="mt-5 space-y-4">
            <input name="course_code" value={formData.course_code} onChange={handleChange} placeholder="Course code" className="w-full rounded-2xl border border-slate-300 px-4 py-3" required />
            <input name="course_name" value={formData.course_name} onChange={handleChange} placeholder="Course name" className="w-full rounded-2xl border border-slate-300 px-4 py-3" required />
            <select name="department_id" value={formData.department_id} onChange={handleChange} className="w-full rounded-2xl border border-slate-300 px-4 py-3" required>
              <option value="">Select department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>{department.department_name}</option>
              ))}
            </select>
            <select name="lecturer_id" value={formData.lecturer_id} onChange={handleChange} className="w-full rounded-2xl border border-slate-300 px-4 py-3">
              <option value="">Select lecturer</option>
              {lecturers.map((lecturer) => (
                <option key={lecturer.id} value={lecturer.id}>{lecturer.full_name}</option>
              ))}
            </select>
            <select name="semester_id" value={formData.semester_id} onChange={handleChange} className="w-full rounded-2xl border border-slate-300 px-4 py-3" required>
              <option value="">Select semester</option>
              {semesters.map((semester) => (
                <option key={semester.id} value={semester.id}>{semester.semester_name} - {semester.academic_year}</option>
              ))}
            </select>
          </div>
          <button className="mt-5 rounded-2xl bg-brandBlue px-5 py-3 font-semibold text-white">{editingId ? "Update" : "Save"}</button>
        </form>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="text-slate-500">
                  <th className="py-3 pr-4 font-semibold">Code</th>
                  <th className="py-3 pr-4 font-semibold">Course</th>
                  <th className="py-3 pr-4 font-semibold">Department</th>
                  <th className="py-3 pr-4 font-semibold">Lecturer</th>
                  <th className="py-3 pr-4 font-semibold">Semester</th>
                  <th className="py-3 pr-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.id} className="border-t border-slate-100">
                    <td className="py-4 pr-4 font-medium">{course.course_code}</td>
                    <td className="py-4 pr-4 text-slate-600">{course.course_name}</td>
                    <td className="py-4 pr-4 text-slate-600">{course.department_name}</td>
                    <td className="py-4 pr-4 text-slate-600">{course.lecturer_name || "Not assigned"}</td>
                    <td className="py-4 pr-4 text-slate-600">{course.semester_name}</td>
                    <td className="py-4 pr-4">
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(course)} type="button" className="rounded-full border border-brandBlue px-4 py-2 text-xs font-semibold text-brandBlue">Edit</button>
                        <button onClick={() => handleDelete(course.id)} type="button" className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white">Delete</button>
                      </div>
                    </td>
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

export default CourseManagement;
