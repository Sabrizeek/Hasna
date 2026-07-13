import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios.js";
import DashboardAnnouncements from "../components/DashboardAnnouncements.jsx";
import StudentLayout from "../components/StudentLayout.jsx";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [activeSemester, setActiveSemester] = useState(null);
  const [evaluationWindow, setEvaluationWindow] = useState(null);
  const [department, setDepartment] = useState(null);
  const [courses, setCourses] = useState([]);
  
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        const response = await api.get("/student/dashboard-data");
        
        setActiveSemester(response.data.activeSemester);
        setEvaluationWindow(response.data.evaluationWindow);
        setDepartment(response.data.department);
        setCourses(response.data.courses || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  const handleCourseSelection = (courseId) => {
    setSelectedCourseIds((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId]
    );
  };

  const selectedCourses = useMemo(
    () => courses.filter((course) => selectedCourseIds.includes(String(course.id))),
    [courses, selectedCourseIds]
  );

  const isEvaluateDisabled = selectedCourses.length === 0 || !evaluationWindow?.isOpen;

  const handleEvaluate = () => {
    if (!isEvaluateDisabled) {
      const courseIdsStr = selectedCourses.map(c => c.id).join(",");
      navigate(`/student/evaluation-hub?courseIds=${courseIdsStr}&semesterId=${activeSemester?.id}&academicYear=${activeSemester?.academic_year}`);
    }
  };

  if (loading) {
    return (
      <StudentLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brandBlue"></div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-slate-900">Student Dashboard</h1>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">My Modules</h2>
              
              {!activeSemester ? (
                <div className="bg-amber-50 text-amber-800 p-4 rounded-lg border border-amber-200">
                  No active semester is currently set.
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Department</p>
                      <p className="font-bold text-slate-900">{department?.name || "Unassigned"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500">Academic Year</p>
                      <p className="font-bold text-slate-900">{activeSemester.academic_year}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500">Semester</p>
                      <p className="font-bold text-slate-900">{activeSemester.semester_name}</p>
                    </div>
                  </div>

                  <div className="mt-6">
                    {courses.length === 0 ? (
                      <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200 border-dashed">
                        <p className="text-slate-500">You are not registered for any modules in this semester.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm font-semibold text-slate-700 mb-3">
                          Select modules to evaluate:
                        </p>
                        {courses.map((course) => (
                          <label
                            key={course.id}
                            className={`flex items-start space-x-3 p-4 rounded-lg border transition-colors ${
                              !course.has_lecturers || course.is_evaluated
                                ? "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed"
                                : selectedCourseIds.includes(String(course.id))
                                  ? "bg-brandBlue/5 border-brandBlue cursor-pointer"
                                  : "bg-white border-slate-200 hover:bg-slate-50 cursor-pointer"
                            }`}
                          >
                            <div className="flex-shrink-0 pt-0.5">
                              <input
                                type="checkbox"
                                checked={selectedCourseIds.includes(String(course.id))}
                                onChange={() => !course.is_evaluated && course.has_lecturers && handleCourseSelection(String(course.id))}
                                disabled={!course.has_lecturers || course.is_evaluated}
                                className="w-4 h-4 text-brandBlue rounded border-slate-300 focus:ring-brandBlue disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                            </div>
                            <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="font-medium text-slate-900">
                                {course.course_code} - {course.course_name}
                              </div>
                              {course.is_evaluated ? (
                                <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 whitespace-nowrap">
                                  Already Evaluated
                                </span>
                              ) : !course.has_lecturers ? (
                                <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10 whitespace-nowrap">
                                  No Lecturers Assigned
                                </span>
                              ) : null}
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-slate-600">
                      {selectedCourseIds.length} module(s) selected
                    </div>
                    
                    {!evaluationWindow?.isOpen ? (
                      <div className="text-amber-600 font-medium px-4 py-2 bg-amber-50 rounded-lg">
                        {evaluationWindow?.message || "Evaluations are currently closed"}
                      </div>
                    ) : (
                      <button
                        onClick={handleEvaluate}
                        disabled={isEvaluateDisabled}
                        className="w-full sm:w-auto px-6 py-2.5 bg-brandBlue text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-brandBlue focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Start Evaluation
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="lg:col-span-1">
            <DashboardAnnouncements role="student" />
          </div>
        </div>
      </div>
    </StudentLayout>
  );
};

export default StudentDashboard;
