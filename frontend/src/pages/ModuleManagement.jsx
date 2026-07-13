import { useEffect, useMemo, useState } from "react";
import api from "../api/axios.js";
import AdminLayout from "../components/AdminLayout.jsx";

const emptyCourseForm = {
  course_code: "",
  course_name: "",
  department_id: "",
  semester_id: "",
  is_core: 1,
  assignments: [],
};

const ModuleManagement = () => {
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [assignments, setAssignments] = useState([]);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterIsCore, setFilterIsCore] = useState("");
  const [filterType, setFilterType] = useState("");

  // Course State
  const [courseForm, setCourseForm] = useState(emptyCourseForm);
  const [editingCourseId, setEditingCourseId] = useState(null);

  const loadData = async () => {
    const [coursesRes, departmentsRes, semestersRes, usersRes, assignmentsRes] = await Promise.all([
      api.get("/courses"),
      api.get("/departments"),
      api.get("/semesters"),
      api.get("/admin/users"),
      api.get("/admin/module-assignments"),
    ]);

    setCourses(coursesRes.data.courses || []);
    setDepartments(departmentsRes.data.departments || []);
    setSemesters(semestersRes.data.semesters || []);
    setLecturers((usersRes.data.users || []).filter((user) => user.role === "lecturer" && user.status === "approved"));
    setAssignments(assignmentsRes.data.assignments || []);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Set default dropdowns for Course Form when data loads
  useEffect(() => {
    if (!editingCourseId && departments.length > 0 && semesters.length > 0 && !courseForm.department_id) {
      setCourseForm((current) => ({
        ...current,
        department_id: current.department_id || String(departments[0].id),
        semester_id: current.semester_id || String(semesters[0].id),
      }));
    }
  }, [departments, semesters, editingCourseId, courseForm.department_id]);

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesSearch =
        course.course_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.course_name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDepartment = filterDepartment
        ? String(course.department_id) === filterDepartment
        : true;

      const matchesIsCore = filterIsCore !== ""
        ? String(course.is_core) === filterIsCore
        : true;

      const matchesType = filterType
        ? assignments.some(a => a.course_id === course.id && (a.type === filterType || a.type === 'both'))
        : true;

      return matchesSearch && matchesDepartment && matchesIsCore && matchesType;
    });
  }, [courses, searchQuery, filterDepartment, filterIsCore, filterType, assignments]);

  /* ================= COURSE MANAGEMENT ================= */
  const handleCourseChange = (event) => {
    const value = event.target.type === 'checkbox' ? (event.target.checked ? 1 : 0) : event.target.value;
    setCourseForm({ ...courseForm, [event.target.name]: value });
  };

  const addAssignment = () => {
    setCourseForm((prev) => ({
      ...prev,
      assignments: [...prev.assignments, { lecturerId: "", typeTheory: true, typePractical: true }],
    }));
  };

  const removeAssignment = (index) => {
    setCourseForm((prev) => {
      const newAssignments = [...prev.assignments];
      newAssignments.splice(index, 1);
      return { ...prev, assignments: newAssignments };
    });
  };

  const updateAssignment = (index, field, value) => {
    setCourseForm((prev) => {
      const newAssignments = [...prev.assignments];
      newAssignments[index] = { ...newAssignments[index], [field]: value };
      return { ...prev, assignments: newAssignments };
    });
  };

  const handleCourseSubmit = async (event) => {
    event.preventDefault();
    
    // Validation
    const invalidAssignment = courseForm.assignments.find(a => !a.typeTheory && !a.typePractical);
    if (invalidAssignment) {
      alert("Please ensure all assigned lecturers have at least one evaluation type (Theory or Practical) selected.");
      return;
    }

    const payload = {
      ...courseForm,
      department_id: Number(courseForm.department_id),
      semester_id: Number(courseForm.semester_id),
      is_core: Number(courseForm.is_core),
      assignments: courseForm.assignments.filter(a => a.lecturerId).map(a => ({
        ...a,
        lecturerId: Number(a.lecturerId)
      }))
    };

    try {
      if (editingCourseId) {
        await api.put(`/courses/${editingCourseId}`, payload);
      } else {
        await api.post("/courses", payload);
      }
      setCourseForm({
        ...emptyCourseForm,
        department_id: String(departments[0]?.id || ""),
        semester_id: String(semesters[0]?.id || "")
      });
      setEditingCourseId(null);
      loadData();
    } catch (error) {
      console.error("Failed to save course:", error);
      alert(error.response?.data?.message || "Failed to save module.");
    }
  };

  const handleEditCourse = (course) => {
    setEditingCourseId(course.id);
    const courseAssignments = assignments.filter(a => a.course_id === course.id).map(a => ({
      lecturerId: String(a.lecturer_id),
      typeTheory: a.type === 'theory' || a.type === 'both',
      typePractical: a.type === 'practical' || a.type === 'both',
    }));
    
    setCourseForm({
      course_code: course.course_code,
      course_name: course.course_name,
      department_id: String(course.department_id),
      semester_id: String(course.semester_id),
      is_core: course.is_core !== undefined ? Number(course.is_core) : 1,
      assignments: courseAssignments,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteCourse = async (id) => {
    if (!window.confirm("Are you sure you want to delete this module? It will remove all associated assignments and evaluations.")) return;
    try {
      await api.delete(`/courses/${id}`);
      loadData();
    } catch (error) {
      console.error("Failed to delete course:", error);
      alert("Failed to delete module.");
    }
  };

  const cancelCourseEdit = () => {
    setEditingCourseId(null);
    setCourseForm({
      ...emptyCourseForm,
      department_id: String(departments[0]?.id || ""),
      semester_id: String(semesters[0]?.id || "")
    });
  };

  return (
    <AdminLayout title="Module Management">
      <div className="grid gap-6">
        {/* ADD NEW MODULE FORM */}
        <div className="space-y-6">
          <form onSubmit={handleCourseSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col gap-6">
            <div>
              <h3 className="text-xl font-bold text-brandBlue">{editingCourseId ? "Edit Module & Assignments" : "Add New Module & Assignments"}</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1 block">Code</label>
                <input name="course_code" value={courseForm.course_code} onChange={handleCourseChange} placeholder="e.g. CSC2122" className="w-full rounded-2xl border border-slate-300 px-4 py-3" required />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1 block">Name</label>
                <input name="course_name" value={courseForm.course_name} onChange={handleCourseChange} placeholder="e.g. Database Systems" className="w-full rounded-2xl border border-slate-300 px-4 py-3" required />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1 block">Department</label>
                <select name="department_id" value={courseForm.department_id} onChange={handleCourseChange} className="w-full rounded-2xl border border-slate-300 px-4 py-3 bg-white" required>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>{department.department_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1 block">Semester</label>
                <select name="semester_id" value={courseForm.semester_id} onChange={handleCourseChange} className="w-full rounded-2xl border border-slate-300 px-4 py-3 bg-white" required>
                  {semesters.map((semester) => (
                    <option key={semester.id} value={semester.id}>{semester.semester_name} - {semester.academic_year}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end pb-3 gap-8">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={courseForm.is_core === 1} onChange={() => setCourseForm({ ...courseForm, is_core: 1 })} className="w-5 h-5 text-brandBlue rounded border-slate-300 focus:ring-brandBlue" />
                  <span className="font-semibold text-slate-700">Core Module</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={courseForm.is_core === 0} onChange={() => setCourseForm({ ...courseForm, is_core: 0 })} className="w-5 h-5 text-brandBlue rounded border-slate-300 focus:ring-brandBlue" />
                  <span className="font-semibold text-slate-700">Optional Module</span>
                </label>
              </div>
            </div>

            {/* DYNAMIC ASSIGNMENTS LIST */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-sm">Assigned Lecturers</h4>
                <button type="button" onClick={addAssignment} className="text-sm font-semibold text-brandBlue hover:underline bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 transition hover:bg-blue-100">
                  + Add Lecturer
                </button>
              </div>
              <div className="space-y-4">
                {courseForm.assignments.map((assignment, index) => (
                  <div key={index} className="flex flex-wrap md:flex-nowrap gap-4 items-center bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in zoom-in-95">
                    <div className="flex-1 min-w-[200px]">
                      <select value={assignment.lecturerId} onChange={(e) => updateAssignment(index, 'lecturerId', e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-2.5 bg-white" required>
                        <option value="">Choose lecturer...</option>
                        {lecturers.filter(l => l.department_id === Number(courseForm.department_id)).map(l => (
                          <option key={l.id} value={l.id}>{l.full_name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-4 items-center whitespace-nowrap px-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={assignment.typeTheory} onChange={(e) => updateAssignment(index, 'typeTheory', e.target.checked)} className="w-4 h-4 text-brandBlue rounded border-slate-300 focus:ring-brandBlue" />
                        <span className="text-sm font-semibold text-slate-700">Theory</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={assignment.typePractical} onChange={(e) => updateAssignment(index, 'typePractical', e.target.checked)} className="w-4 h-4 text-brandBlue rounded border-slate-300 focus:ring-brandBlue" />
                        <span className="text-sm font-semibold text-slate-700">Practical</span>
                      </label>
                    </div>
                    <button type="button" onClick={() => removeAssignment(index)} className="p-2 text-red-500 hover:bg-red-100 rounded-full transition self-end md:self-auto" title="Remove Assignment">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))}
                {courseForm.assignments.length === 0 && (
                  <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                    <p className="text-sm text-slate-500 italic">No lecturers assigned. Click "+ Add Lecturer" to assign one.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button type="submit" className="rounded-2xl bg-brandBlue px-8 py-3 font-semibold text-white transition hover:opacity-90">{editingCourseId ? "Update Module & Assignments" : "Save Module & Assignments"}</button>
              {editingCourseId && <button type="button" onClick={cancelCourseEdit} className="rounded-2xl bg-slate-200 px-6 py-3 font-semibold text-slate-700 hover:bg-slate-300 transition">Cancel</button>}
            </div>
          </form>
        </div>

        {/* MODULES TABLE */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-brandBlue">All Modules</h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{filteredCourses.length} records</span>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
                <input
                  type="text"
                  placeholder="Search by code or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64 rounded-2xl border border-slate-300 px-4 py-2 text-sm focus:border-brandBlue focus:outline-none transition"
                />
                <select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="w-full sm:w-48 rounded-2xl border border-slate-300 px-4 py-2 text-sm bg-white focus:border-brandBlue focus:outline-none transition"
                >
                  <option value="">All Departments</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.department_name}</option>
                  ))}
                </select>
                <select
                  value={filterIsCore}
                  onChange={(e) => setFilterIsCore(e.target.value)}
                  className="w-full sm:w-36 rounded-2xl border border-slate-300 px-4 py-2 text-sm bg-white focus:border-brandBlue focus:outline-none transition"
                >
                  <option value="">All Modules</option>
                  <option value="1">Core Only</option>
                  <option value="0">Optional Only</option>
                </select>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full sm:w-36 rounded-2xl border border-slate-300 px-4 py-2 text-sm bg-white focus:border-brandBlue focus:outline-none transition"
                >
                  <option value="">All Types</option>
                  <option value="theory">Theory</option>
                  <option value="practical">Practical</option>
                </select>
              </div>
            </div>
            
            <div className="max-h-[38rem] overflow-y-auto overflow-x-auto">
              <table className="w-full table-fixed text-left text-sm [&_td]:break-words [&_th]:break-words min-w-[900px]">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="text-slate-500 border-b border-slate-200">
                    <th className="py-3 pr-4 font-semibold w-24">Code</th>
                    <th className="py-3 pr-4 font-semibold w-1/4">Course</th>
                    <th className="py-3 pr-4 font-semibold w-1/5">Lecturer</th>
                    <th className="py-3 pr-4 font-semibold w-24">Type</th>
                    <th className="py-3 pr-4 font-semibold">Department</th>
                    <th className="py-3 pr-4 font-semibold w-24">Semester</th>
                    <th className="w-[180px] py-3 pr-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCourses.map((course) => {
                    const isSelected = editingCourseId === course.id;
                    const courseAssignments = assignments.filter(a => a.course_id === course.id);
                    return (
                      <tr key={course.id} className={`border-b border-slate-100 transition ${isSelected ? "bg-brandGold/10" : "hover:bg-slate-50"}`}>
                        <td className="py-4 pr-4 font-medium align-top">{course.course_code}</td>
                        <td className="py-4 pr-4 text-slate-700 font-semibold align-top">
                          {course.course_name}
                          {course.is_core === 1 ? (
                            <span className="ml-2 inline-block bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">Core</span>
                          ) : (
                            <span className="ml-2 inline-block bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">Optional</span>
                          )}
                        </td>
                        <td className="py-4 pr-4 align-top">
                          <div className="flex flex-col gap-3">
                            {courseAssignments.map(a => (
                              <div key={a.id} className="text-sm font-medium text-slate-700 flex items-center h-7 line-clamp-1">
                                {a.lecturer_name}
                              </div>
                            ))}
                            {courseAssignments.length === 0 && <span className="text-xs text-slate-400 italic h-7 flex items-center">None</span>}
                          </div>
                        </td>
                        <td className="py-4 pr-4 align-top">
                          <div className="flex flex-col gap-3">
                            {courseAssignments.map(a => (
                              <div key={a.id} className="flex items-center h-7">
                                <span className={`text-[10px] font-bold px-2 py-1 rounded border uppercase tracking-wider ${
                                  a.type === 'theory' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 
                                  a.type === 'practical' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                  'bg-brandGold/10 text-brandGold border-brandGold/20'
                                }`}>
                                  {a.type}
                                </span>
                              </div>
                            ))}
                            {courseAssignments.length === 0 && <span className="h-7"></span>}
                          </div>
                        </td>
                        <td className="py-4 pr-4 text-slate-600 align-top">{course.department_name}</td>
                        <td className="py-4 pr-4 text-slate-600 align-top">{course.semester_name}</td>
                        <td className="py-4 pr-4 whitespace-nowrap text-right align-top">
                          <div className="inline-flex flex-nowrap gap-2 justify-end">
                            <button onClick={() => handleEditCourse(course)} type="button" className="rounded-full border border-brandBlue px-4 py-2 text-xs font-semibold text-brandBlue hover:bg-brandBlue hover:text-white transition">Edit</button>
                            <button onClick={() => handleDeleteCourse(course.id)} type="button" className="rounded-full bg-red-100 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-200 transition">Del</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ModuleManagement;
