import { useEffect, useState } from "react";
import api from "../api/axios.js";
import AdminLayout from "../components/AdminLayout.jsx";

const AdminReportsAudit = () => {
  const [departments, setDepartments] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [reports, setReports] = useState([]);
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({ departmentId: "", semesterId: "", academicYear: "", role: "", from: "", to: "" });
  const [auditFilters, setAuditFilters] = useState({ search: "", from: "", to: "" });

  const loadData = async () => {
    const [departmentsRes, semestersRes, reportsRes] = await Promise.all([
      api.get("/departments"),
      api.get("/semesters"),
      api.get("/admin/supervision-reports"),
    ]);
    setDepartments(departmentsRes.data.departments || []);
    setSemesters(semestersRes.data.semesters || []);
    setReports(reportsRes.data.reports || []);
  };

  const loadLogs = async () => {
    const response = await api.get("/admin/audit-logs", { params: { ...auditFilters, page: 1, limit: 50 } });
    setLogs(response.data.logs || []);
  };

  useEffect(() => { loadData(); loadLogs(); }, []);

  const handleSemester = (value) => {
    const semester = semesters.find((item) => String(item.id) === value);
    setFilters((current) => ({ ...current, semesterId: value, academicYear: semester?.academic_year || "" }));
  };

  const exportCsv = async () => {
    const response = await api.get("/admin/export/evaluations", {
      params: {
        departmentId: filters.departmentId,
        semesterId: filters.semesterId,
        academicYear: filters.academicYear,
        from: filters.from,
        to: filters.to,
        format: "csv",
      },
      responseType: "blob",
    });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = "evaluation-export.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
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
          <button onClick={exportCsv} className="rounded-2xl bg-brandBlue px-5 py-3 font-semibold text-white">Export CSV</button>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold text-brandBlue">Supervision Report Inbox</h3>
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500"><tr><th className="py-3 pr-4">Lecturer</th><th className="py-3 pr-4">Department</th><th className="py-3 pr-4">Report Title</th><th className="py-3 pr-4">Submitted</th><th className="py-3 pr-4">Status</th><th className="py-3 pr-4">Action</th></tr></thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="border-t border-slate-100">
                  <td className="py-4 pr-4">{report.lecturer_name}</td><td className="py-4 pr-4">{report.department_name}</td><td className="py-4 pr-4 font-semibold">{report.title}</td><td className="py-4 pr-4">{new Date(report.submitted_at).toLocaleDateString()}</td>
                  <td className="py-4 pr-4"><select value={report.status} onChange={(e) => updateReportStatus(report, e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2"><option value="submitted">submitted</option><option value="under_review">under_review</option><option value="accepted">accepted</option><option value="rejected">rejected</option></select></td>
                  <td className="py-4 pr-4"><button onClick={() => downloadReport(report)} className="rounded-full border border-brandBlue px-4 py-2 text-xs font-semibold text-brandBlue">View/Download</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <h3 className="text-xl font-bold text-brandBlue">Audit Log</h3>
          <div className="grid gap-3 md:grid-cols-4">
            <input placeholder="Search" value={auditFilters.search} onChange={(e) => setAuditFilters((c) => ({ ...c, search: e.target.value }))} className="rounded-2xl border border-slate-300 px-4 py-3" />
            <input type="date" value={auditFilters.from} onChange={(e) => setAuditFilters((c) => ({ ...c, from: e.target.value }))} className="rounded-2xl border border-slate-300 px-4 py-3" />
            <input type="date" value={auditFilters.to} onChange={(e) => setAuditFilters((c) => ({ ...c, to: e.target.value }))} className="rounded-2xl border border-slate-300 px-4 py-3" />
            <button onClick={loadLogs} className="rounded-2xl bg-brandGold px-5 py-3 font-semibold text-white">Search</button>
          </div>
        </div>
        <div className="mt-5 overflow-x-auto"><table className="min-w-full text-left text-sm"><tbody>
          {logs.map((log) => <tr key={log.id} className="border-t border-slate-100"><td className="py-4 pr-4">{new Date(log.created_at).toLocaleString()}</td><td className="py-4 pr-4">{log.user_name || "System"}</td><td className="py-4 pr-4 font-semibold">{log.action}</td><td className="py-4 pr-4 text-slate-600">{log.details || ""}</td></tr>)}
        </tbody></table></div>
      </div>
    </AdminLayout>
  );
};

export default AdminReportsAudit;
