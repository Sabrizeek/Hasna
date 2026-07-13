import { useEffect, useState } from "react";
import api from "../api/axios.js";
import StudentLayout from "../components/StudentLayout.jsx";

const StudentModuleRegistration = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState(new Set());
  const [deadline, setDeadline] = useState(null);
  const [semester, setSemester] = useState(null);
  const [currentYear, setCurrentYear] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      const { data } = await api.get("/student/eligible-modules");
      setCourses(data.courses || []);
      setDeadline(data.deadline);
      setSemester(data.semester);
      setCurrentYear(data.currentYear);
      
      // If student already has selections, use them. Otherwise, pre-select core modules.
      if (data.selectedCourseIds && data.selectedCourseIds.length > 0) {
        setSelectedCourseIds(new Set(data.selectedCourseIds));
      } else {
        const coreIds = (data.courses || []).filter(c => c.is_core === 1).map(c => c.id);
        setSelectedCourseIds(new Set(coreIds));
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load eligible modules.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleCourse = (courseId, isCore) => {
    if (isCore) return; // Core modules cannot be toggled

    setSelectedCourseIds((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setMessage("");
    setError("");
    try {
      await api.post("/student/module-selections", {
        courseIds: Array.from(selectedCourseIds),
      });
      setMessage("Module selections saved successfully.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save selections.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (loading) {
    return (
      <StudentLayout>
        <div className="flex h-64 items-center justify-center">
          <p className="font-semibold text-slate-500">Loading module selection...</p>
        </div>
      </StudentLayout>
    );
  }

  const isDeadlinePassed = deadline && new Date() > new Date(deadline);
  
  // Format deadline countdown
  let deadlineText = "";
  let deadlineColor = "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (deadline) {
    const diff = new Date(deadline) - new Date();
    if (diff <= 0) {
      deadlineText = "Deadline has passed.";
      deadlineColor = "text-red-700 bg-red-50 border-red-200";
    } else {
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      deadlineText = `Deadline: ${days}d ${hours}h remaining (${new Date(deadline).toLocaleString()})`;
      if (days < 2) {
        deadlineColor = "text-amber-700 bg-amber-50 border-amber-200";
      }
    }
  }

  // Group by department
  const groupedCourses = courses.reduce((acc, course) => {
    if (!acc[course.department_name]) acc[course.department_name] = [];
    acc[course.department_name].push(course);
    return acc;
  }, {});

  return (
    <StudentLayout>
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h2 className="text-3xl font-black tracking-tight text-slate-900">Module Registration</h2>
          {semester && (
            <p className="mt-2 text-slate-600 font-medium">
              Select your modules for <span className="font-bold text-teal-700">{semester.semester_name} {semester.academic_year}</span>. 
              {currentYear && <span> You have been inferred as a <span className="font-bold text-teal-700">Year {currentYear}</span> student.</span>}
            </p>
          )}
        </div>

        {message && <div className="mb-6 rounded-2xl bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">{message}</div>}
        {error && <div className="mb-6 rounded-2xl bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">{error}</div>}

        {deadline && (
          <div className={`mb-8 flex items-center justify-between rounded-2xl border px-6 py-4 shadow-sm ${deadlineColor}`}>
            <div>
              <p className="font-bold">{deadlineText}</p>
              {!isDeadlinePassed && <p className="mt-1 text-sm opacity-90">Please finalize your selections before the deadline. After this, you will not be able to change them.</p>}
            </div>
            {isDeadlinePassed && (
              <span className="flex items-center gap-2 font-bold uppercase tracking-widest text-xs opacity-75">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                Locked
              </span>
            )}
          </div>
        )}

        {courses.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">No Eligible Modules Found</h3>
            <p className="mt-2 text-slate-600">We could not find any Year {currentYear} modules for your registered departments in this semester.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedCourses).map(([deptName, deptCourses]) => (
              <div key={deptName} className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                  <h3 className="text-lg font-bold text-slate-800">{deptName}</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {deptCourses.map((course) => (
                    <label 
                      key={course.id} 
                      className={`flex cursor-pointer items-center gap-4 px-6 py-4 transition hover:bg-slate-50 ${isDeadlinePassed ? 'opacity-75 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCourseIds.has(course.id) || course.is_core === 1}
                        onChange={() => handleToggleCourse(course.id, course.is_core === 1)}
                        disabled={isDeadlinePassed || course.is_core === 1}
                        className="h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-teal-600 disabled:opacity-50"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{course.course_code}</span>
                          {course.is_core === 1 ? (
                            <span className="rounded bg-teal-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-700">Core</span>
                          ) : (
                            <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-600">Optional</span>
                          )}
                        </div>
                        <p className="mt-1 font-medium text-slate-600">{course.course_name}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div className="sticky bottom-6 z-10 flex items-center justify-between rounded-3xl border border-slate-200 bg-white/95 px-6 py-5 shadow-lg backdrop-blur">
              <div>
                <p className="text-sm font-semibold text-slate-600">Selected Modules</p>
                <p className="text-2xl font-black text-slate-900">{selectedCourseIds.size}</p>
              </div>
              <button
                onClick={handleSave}
                disabled={isDeadlinePassed}
                className="rounded-2xl bg-teal-600 px-8 py-3 font-bold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isDeadlinePassed ? "Deadline Passed" : "Save Selections"}
              </button>
            </div>
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default StudentModuleRegistration;
