import { useEffect, useState, useMemo } from "react";
import api from "../api/axios.js";
import AdminLayout from "../components/AdminLayout.jsx";
import { downloadCSV } from "../utils/csvExport.js";

const AdminReportsAudit = () => {
  const [departments, setDepartments] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [reports, setReports] = useState([]);
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({ departmentId: "", semesterId: "", academicYear: "", role: "", from: "", to: "" });
  const [evaluationFilters, setEvaluationFilters] = useState({
    departmentId: "",
    courseId: "",
    lecturerId: "",
    semesterId: "",
    academicYear: "",
    type: "",
    dateFrom: "",
    dateTo: "",
    search: "",
  });
  const [evaluations, setEvaluations] = useState([]);
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);
  const [evaluationError, setEvaluationError] = useState("");
  const [auditFilters, setAuditFilters] = useState({ search: "", from: "", to: "" });
  const [reportSearch, setReportSearch] = useState("");
  const [reportStatusFilter, setReportStatusFilter] = useState("all");

  const filteredReports = useMemo(() => {
    return reports.filter(r => {
      const matchesSearch = `${r.lecturer_name} ${r.department_name} ${r.title}`.toLowerCase().includes(reportSearch.toLowerCase());
      const matchesStatus = reportStatusFilter === "all" || r.status === reportStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [reports, reportSearch, reportStatusFilter]);

  const formatAuditAction = (action) =>
    String(action || "")
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  const formatAuditDetails = (details) => {
    if (!details) return "";
    let parsed = details;
    if (typeof details === "string") {
      try {
        parsed = JSON.parse(details);
      } catch {
        return details;
      }
    }
    if (parsed && typeof parsed === "object") {
      return Object.entries(parsed)
        .filter(([, value]) => value !== null && value !== undefined && value !== "")
        .map(([key, value]) => {
          const label = key
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (char) => char.toUpperCase());
          return `${label}: ${value}`;
        })
        .join(" | ");
    }
    try {
      return JSON.stringify(parsed);
    } catch {
      return "Details unavailable";
    }
  };

  const loadData = async () => {
    try {
      const [departmentsRes, semestersRes, reportsRes, coursesRes, usersRes] = await Promise.all([
        api.get("/departments"),
        api.get("/semesters"),
        api.get("/admin/supervision-reports"),
        api.get("/courses"),
        api.get("/admin/users"),
      ]);
      setDepartments(departmentsRes.data.departments || []);
      setSemesters(semestersRes.data.semesters || []);
      setReports(reportsRes.data.reports || []);
      setCourses(coursesRes.data.courses || []);
      setLecturers((usersRes.data.users || []).filter((user) => user.role === "lecturer"));
    } catch {
      setReports([]);
    }
  };

  const loadEvaluations = async () => {
    try {
      setEvaluationError("");
      const response = await api.get("/admin/evaluations", { params: evaluationFilters });
      setEvaluations(response.data.evaluations || []);
    } catch (error) {
      setEvaluationError(error.response?.data?.message || "Failed to fetch evaluation records.");
    }
  };

  const loadLogs = async () => {
    try {
      const response = await api.get("/admin/audit-logs", { params: { ...auditFilters, page: 1, limit: 50 } });
      setLogs(response.data.logs || []);
    } catch {
      setLogs([]);
    }
  };

  useEffect(() => { loadData(); loadLogs(); loadEvaluations(); }, []);

  const handleSemester = (value) => {
    const semester = semesters.find((item) => String(item.id) === value);
    setFilters((current) => ({ ...current, semesterId: value, academicYear: semester?.academic_year || "" }));
  };

  const handleEvaluationSemester = (value) => {
    const semester = semesters.find((item) => String(item.id) === value);
    setEvaluationFilters((current) => ({ ...current, semesterId: value, academicYear: semester?.academic_year || "" }));
  };

  const handleDownloadEvaluationsCSV = () => {
    downloadCSV(evaluations, "evaluations.csv", [
      { header: "Course", key: "courseCode" },
      { header: "Lecturer", key: "lecturerName" },
      { header: "Student", key: "studentName" },
      { header: "Grade", key: "overallGrade" },
      { header: "Date", key: (row) => new Date(row.submittedAt).toLocaleDateString() }
    ]);
  };

  const handleDownloadReportsCSV = () => {
    downloadCSV(filteredReports, "supervision_reports.csv", [
      { header: "Title", key: "title" },
      { header: "Lecturer", key: "lecturer_name" },
      { header: "Department", key: "department_name" },
      { header: "Status", key: "status" },
      { header: "Submitted", key: (row) => new Date(row.submitted_at).toLocaleDateString() }
    ]);
  };

  const handleDownloadLogsCSV = () => {
    downloadCSV(logs, "audit_logs.csv", [
      { header: "Timestamp", key: (row) => new Date(row.created_at).toLocaleString() },
      { header: "User", key: "user_name" },
      { header: "Action", key: "action" },
      { header: "Entity", key: "entity_type" },
      { header: "Details", key: "details" }
    ]);
  };

  const openEvaluationDetail = async (evaluation) => {
    const response = await api.get(`/admin/evaluations/${evaluation.submissionId}`);
    setSelectedEvaluation(response.data.evaluation);
    loadLogs();
  };

  const downloadReport = async (report) => {
    const response = await api.get(`/admin/supervision-reports/${report.id}/download`, { responseType: "blob" });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = report.file_name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const updateReportStatus = async (report, status) => {
    await api.patch(`/admin/supervision-reports/${report.id}/status`, { status });
    loadData();
    loadLogs();
  };

  const deleteAuditLog = async (log) => {
    const confirmed = window.confirm(`Delete audit log "${formatAuditAction(log.action)}"?`);
    if (!confirmed) return;
    await api.delete(`/admin/audit-logs/${log.id}`);
    loadLogs();
  };

  return (
    <AdminLayout title="Reports & Audit">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold text-brandBlue">Generate Reports</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <select value={filters.role} onChange={(e) => setFilters((c) => ({ ...c, role: e.target.value }))} className="rounded-2xl border border-slate-300 px-4 py-3"><option value="">All roles</option><option value="student">Students</option><option value="lecturer">Lecturers</option></select>
          <select value={filters.departmentId} onChange={(e) => setFilters((c) => ({ ...c, departmentId: e.target.value }))} className="rounded-2xl border border-slate-300 px-4 py-3"><option value="">All departments</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.department_name}</option>)}</select>
          <select value={filters.semesterId} onChange={(e) => handleSemester(e.target.value)} className="rounded-2xl border border-slate-300 px-4 py-3"><option value="">All semesters</option>{semesters.map((s) => <option key={s.id} value={s.id}>{s.semester_name} - {s.academic_year}</option>)}</select>
          <input type="date" value={filters.from} onChange={(e) => setFilters((c) => ({ ...c, from: e.target.value }))} className="rounded-2xl border border-slate-300 px-4 py-3" />
          <input type="date" value={filters.to} onChange={(e) => setFilters((c) => ({ ...c, to: e.target.value }))} className="rounded-2xl border border-slate-300 px-4 py-3" />
          <button onClick={handleDownloadEvaluationsCSV} className="rounded-2xl bg-brandBlue px-5 py-3 font-semibold text-white">Export CSV</button>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold text-brandBlue">Evaluation Records</h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{evaluations.length} records</span>
            </div>
            <p className="mt-1 text-sm text-slate-500">Admin-only tracking view with student identity for audit and duplicate investigation.</p>
          </div>
          <button onClick={handleDownloadEvaluationsCSV} className="rounded-2xl bg-brandBlue px-5 py-3 font-semibold text-white">Export Records CSV</button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <input placeholder="Search student, lecturer, course" value={evaluationFilters.search} onChange={(e) => setEvaluationFilters((c) => ({ ...c, search: e.target.value }))} className="rounded-2xl border border-slate-300 px-4 py-3" />
          <select value={evaluationFilters.departmentId} onChange={(e) => setEvaluationFilters((c) => ({ ...c, departmentId: e.target.value, courseId: "" }))} className="rounded-2xl border border-slate-300 px-4 py-3"><option value="">All departments</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.department_name}</option>)}</select>
          <select value={evaluationFilters.courseId} onChange={(e) => setEvaluationFilters((c) => ({ ...c, courseId: e.target.value }))} className="rounded-2xl border border-slate-300 px-4 py-3"><option value="">All courses</option>{courses.filter((course) => !evaluationFilters.departmentId || String(course.department_id) === evaluationFilters.departmentId).map((course) => <option key={course.id} value={course.id}>{course.course_code} - {course.course_name}</option>)}</select>
          <select value={evaluationFilters.lecturerId} onChange={(e) => setEvaluationFilters((c) => ({ ...c, lecturerId: e.target.value }))} className="rounded-2xl border border-slate-300 px-4 py-3"><option value="">All lecturers</option>{lecturers.filter((lecturer) => !evaluationFilters.departmentId || String(lecturer.department_id) === evaluationFilters.departmentId).map((lecturer) => <option key={lecturer.id} value={lecturer.id}>{lecturer.full_name}</option>)}</select>
          <select value={evaluationFilters.semesterId} onChange={(e) => handleEvaluationSemester(e.target.value)} className="rounded-2xl border border-slate-300 px-4 py-3"><option value="">All semesters</option>{semesters.map((s) => <option key={s.id} value={s.id}>{s.semester_name} - {s.academic_year}</option>)}</select>
          <select value={evaluationFilters.type} onChange={(e) => setEvaluationFilters((c) => ({ ...c, type: e.target.value }))} className="rounded-2xl border border-slate-300 px-4 py-3"><option value="">All types</option><option value="theory">Theory</option><option value="practical">Practical</option></select>
          <input type="date" value={evaluationFilters.dateFrom} onChange={(e) => setEvaluationFilters((c) => ({ ...c, dateFrom: e.target.value }))} className="rounded-2xl border border-slate-300 px-4 py-3" />
          <input type="date" value={evaluationFilters.dateTo} onChange={(e) => setEvaluationFilters((c) => ({ ...c, dateTo: e.target.value }))} className="rounded-2xl border border-slate-300 px-4 py-3" />
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={loadEvaluations} className="rounded-2xl bg-brandGold px-5 py-3 font-semibold text-white">Search Records</button>
        </div>
        {evaluationError && <p className="mt-3 text-sm font-semibold text-red-600">{evaluationError}</p>}

        <div className="mt-5 max-h-[34rem] overflow-y-auto overflow-x-hidden">
          <table className="w-full table-fixed text-left text-xs sm:text-sm [&_td]:break-words [&_th]:break-words">
            <thead className="sticky top-0 z-10 bg-white text-slate-500">
              <tr><th className="py-3 pr-4">Submitted</th><th className="py-3 pr-4">University ID</th><th className="py-3 pr-4">Student</th><th className="py-3 pr-4">Student Email</th><th className="py-3 pr-4">Department</th><th className="py-3 pr-4">Course</th><th className="py-3 pr-4">Lecturer</th><th className="py-3 pr-4">Type</th><th className="py-3 pr-4">Grade</th><th className="py-3 pr-4">Action</th></tr>
            </thead>
            <tbody>
              {evaluations.map((evaluation) => (
                <tr key={evaluation.submissionId} className="border-t border-slate-100">
                  <td className="py-4 pr-4">{new Date(evaluation.submittedAt).toLocaleString()}</td>
                  <td className="py-4 pr-4 font-semibold">{evaluation.studentRegistrationNumber || "Not recorded"}</td>
                  <td className="py-4 pr-4 font-semibold">{evaluation.studentName}</td>
                  <td className="py-4 pr-4">{evaluation.studentEmail}</td>
                  <td className="py-4 pr-4">{evaluation.departmentName}</td>
                  <td className="py-4 pr-4">{evaluation.courseCode}</td>
                  <td className="py-4 pr-4">{evaluation.lecturerName}</td>
                  <td className="py-4 pr-4 capitalize">{evaluation.type}</td>
                  <td className="py-4 pr-4 font-semibold">{Number(evaluation.overallGrade || 0).toFixed(1)}%</td>
                  <td className="py-4 pr-4 whitespace-nowrap"><button onClick={() => openEvaluationDetail(evaluation)} className="rounded-full border border-brandBlue px-4 py-2 text-xs font-semibold text-brandBlue">View Detail</button></td>
                </tr>
              ))}
              {evaluations.length === 0 && (
                <tr><td colSpan="10" className="py-6 text-center text-slate-500">No evaluation records match the current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-brandBlue">Supervision Report Inbox</h3>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{filteredReports.length} reports</span>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input 
              placeholder="Search reports..." 
              value={reportSearch}
              onChange={(e) => setReportSearch(e.target.value)}
              className="rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-brandBlue w-full sm:w-64"
            />
            <select
              value={reportStatusFilter}
              onChange={(e) => setReportStatusFilter(e.target.value)}
              className="rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-brandBlue w-full sm:w-auto"
            >
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
            <button onClick={handleDownloadReportsCSV} className="rounded-2xl bg-brandGold px-4 py-2 text-sm font-semibold text-white">Export CSV</button>
          </div>
        </div>
        <div className="max-h-[28rem] overflow-y-auto overflow-x-hidden">
          <table className="w-full table-fixed text-left text-sm [&_td]:break-words [&_th]:break-words">
            <thead className="sticky top-0 z-10 bg-white text-slate-500"><tr><th className="py-3 pr-4">Lecturer</th><th className="py-3 pr-4">Department</th><th className="py-3 pr-4">Report Title</th><th className="py-3 pr-4">Submitted</th><th className="py-3 pr-4">Status</th><th className="py-3 pr-4">Action</th></tr></thead>
            <tbody>
              {filteredReports.map((report) => (
                <tr key={report.id} className="border-t border-slate-100">
                  <td className="py-4 pr-4">{report.lecturer_name}</td><td className="py-4 pr-4">{report.department_name}</td><td className="py-4 pr-4 font-semibold">{report.title}</td><td className="py-4 pr-4">{new Date(report.submitted_at).toLocaleDateString()}</td>
                  <td className="py-4 pr-4"><select value={report.status} onChange={(e) => updateReportStatus(report, e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2"><option value="submitted">submitted</option><option value="under_review">under_review</option><option value="accepted">accepted</option><option value="rejected">rejected</option></select></td>
                  <td className="py-4 pr-4 whitespace-nowrap"><button onClick={() => downloadReport(report)} className="rounded-full border border-brandBlue px-4 py-2 text-xs font-semibold text-brandBlue">View/Download</button></td>
                </tr>
              ))}
              {filteredReports.length === 0 && (
                <tr><td colSpan="6" className="py-6 text-center text-slate-500">No reports match the current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-brandBlue">Audit Log</h3>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{logs.length} logs found</span>
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <input placeholder="Search" value={auditFilters.search} onChange={(e) => setAuditFilters((c) => ({ ...c, search: e.target.value }))} className="rounded-2xl border border-slate-300 px-4 py-3" />
            <input type="date" value={auditFilters.from} onChange={(e) => setAuditFilters((c) => ({ ...c, from: e.target.value }))} className="rounded-2xl border border-slate-300 px-4 py-3" />
            <input type="date" value={auditFilters.to} onChange={(e) => setAuditFilters((c) => ({ ...c, to: e.target.value }))} className="rounded-2xl border border-slate-300 px-4 py-3" />
            <div className="flex gap-2">
                <button onClick={loadLogs} className="rounded-2xl bg-brandGold px-5 py-3 font-semibold text-white">Search</button>
                <button onClick={handleDownloadLogsCSV} className="rounded-2xl bg-slate-600 px-5 py-3 font-semibold text-white">Export</button>
            </div>
          </div>
        </div>
        <div className="mt-5 max-h-[34rem] overflow-y-auto overflow-x-hidden">
          <table className="w-full table-fixed text-left text-sm [&_td]:break-words [&_th]:break-words">
            <thead className="sticky top-0 z-10 bg-white text-slate-500">
              <tr><th className="py-3 pr-4">Time</th><th className="py-3 pr-4">User</th><th className="py-3 pr-4">Action</th><th className="py-3 pr-4">Entity</th><th className="py-3 pr-4">Details</th><th className="py-3 pr-4">Action</th></tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-slate-100">
                  <td className="py-4 pr-4">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="py-4 pr-4">{log.user_name || "System"}</td>
                  <td className="py-4 pr-4 font-semibold">{formatAuditAction(log.action)}</td>
                  <td className="py-4 pr-4 text-slate-600">{log.entity_type}{log.entity_id ? ` #${log.entity_id}` : ""}</td>
                  <td className="py-4 pr-4 text-slate-600">{formatAuditDetails(log.details) || "-"}</td>
                  <td className="py-4 pr-4 whitespace-nowrap">
                    <button onClick={() => deleteAuditLog(log)} className="rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-700">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedEvaluation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-brandGold">Evaluation Detail</p>
                <h3 className="mt-2 text-2xl font-bold text-brandBlue">{selectedEvaluation.courseCode} - {selectedEvaluation.courseName}</h3>
                <p className="mt-1 text-sm text-slate-500">{selectedEvaluation.semesterName} - {selectedEvaluation.academicYear} | {selectedEvaluation.type}</p>
              </div>
              <button onClick={() => setSelectedEvaluation(null)} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600">Close</button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <h4 className="font-bold text-brandBlue">Student Identity</h4>
                <p className="mt-2 text-sm"><span className="font-semibold">ID:</span> {selectedEvaluation.studentId}</p>
                <p className="mt-1 text-sm"><span className="font-semibold">Name:</span> {selectedEvaluation.studentName}</p>
                <p className="mt-1 text-sm"><span className="font-semibold">Email:</span> {selectedEvaluation.studentEmail}</p>
                <p className="mt-1 text-sm"><span className="font-semibold">Registration:</span> {selectedEvaluation.studentRegistrationNumber || "Not recorded"}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <h4 className="font-bold text-brandBlue">Evaluation Context</h4>
                <p className="mt-2 text-sm"><span className="font-semibold">Department:</span> {selectedEvaluation.departmentName}</p>
                <p className="mt-1 text-sm"><span className="font-semibold">Lecturer:</span> {selectedEvaluation.lecturerName}</p>
                <p className="mt-1 text-sm"><span className="font-semibold">Overall Grade:</span> {Number(selectedEvaluation.overallGrade || 0).toFixed(1)}%</p>
                <p className="mt-1 text-sm"><span className="font-semibold">Submitted:</span> {new Date(selectedEvaluation.submittedAt).toLocaleString()}</p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 p-4">
              <h4 className="font-bold text-brandBlue">Comment</h4>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{selectedEvaluation.commentText || "No comment recorded."}</p>
            </div>

            <div className="mt-5 max-h-80 overflow-y-auto overflow-x-hidden">
              <table className="w-full table-fixed text-left text-sm [&_td]:break-words [&_th]:break-words">
                <thead className="sticky top-0 z-10 bg-white text-slate-500"><tr><th className="py-3 pr-4">Question</th><th className="py-3 pr-4">Score</th></tr></thead>
                <tbody>
                  {(selectedEvaluation.responses || []).map((response) => (
                    <tr key={response.questionId} className="border-t border-slate-100">
                      <td className="py-4 pr-4"><span className="font-semibold">{response.label}</span> {response.questionText}</td>
                      <td className="py-4 pr-4 font-bold text-brandBlue">{response.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminReportsAudit;
