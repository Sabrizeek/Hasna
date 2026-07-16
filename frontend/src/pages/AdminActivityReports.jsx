import { useEffect, useState, useMemo } from "react";
import api from "../api/axios.js";
import AdminLayout from "../components/AdminLayout.jsx";
import { downloadCSV } from "../utils/csvExport.js";
import SearchableSelect from "../components/SearchableSelect.jsx";

const AdminActivityReports = () => {
  const [departments, setDepartments] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [reports, setReports] = useState([]);
  const [filters, setFilters] = useState({ departmentId: "", semesterId: "", academicYear: "", role: "", from: "", to: "" });
  const [reportSearch, setReportSearch] = useState("");
  const [reportStatusFilter, setReportStatusFilter] = useState("all");
  const [activeInboxTab, setActiveInboxTab] = useState("supervision");

  const [selectedReport, setSelectedReport] = useState(null);
  const [reviewDraft, setReviewDraft] = useState({ score: "", comment: "", status: "submitted" });
  const [savingReview, setSavingReview] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const matchesSearch = `${report.lecturer_name} ${report.department_name} ${report.title}`.toLowerCase().includes(reportSearch.toLowerCase());
      const matchesStatus = (reportStatusFilter === "all" || report.status === reportStatusFilter);
      const matchesTab = (report.report_type === activeInboxTab || (report.report_type == null && activeInboxTab === "supervision"));
      return matchesSearch && matchesStatus && matchesTab;
    });
  }, [reports, reportSearch, reportStatusFilter, activeInboxTab]);



  const loadData = async () => {
    try {
      const [departmentsRes, semestersRes, reportsRes, usersRes] = await Promise.all([
        api.get("/departments"),
        api.get("/semesters"),
        api.get("/admin/supervision-reports"),
        api.get("/admin/users"),
      ]);
      setDepartments(departmentsRes.data.departments || []);
      setSemesters(semestersRes.data.semesters || []);
      setReports(reportsRes.data.reports || []);
      setLecturers((usersRes.data.users || []).filter((user) => user.role === "lecturer"));
    } catch {
      setReports([]);
    }
  };



  useEffect(() => { loadData(); }, []);

  const handleSemester = (value) => {
    const semester = semesters.find((item) => String(item.id) === value);
    setFilters((current) => ({ ...current, semesterId: value, academicYear: semester?.academic_year || "" }));
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

  const openReviewModal = (report) => {
    setSelectedReport(report);
    setReviewDraft({
      score: "",
      comment: report.admin_comment || "",
      status: report.status || "submitted"
    });
    setReviewError("");
    setReviewMessage("");
  };

  const closeReviewModal = () => {
    setSelectedReport(null);
  };

  const saveReportReview = async () => {
    if (reviewDraft.status === "rejected" && !reviewDraft.comment.trim()) {
      setReviewError("A reason must be provided in the Admin Comment when rejecting a report.");
      return;
    }
    
    if (reviewDraft.status !== "accepted" && reviewDraft.score !== "") {
      setReviewError("Marks can only be allocated when the report is Accepted.");
      return;
    }

    setSavingReview(true);
    setReviewError("");
    setReviewMessage("");
    try {
      await api.patch(`/admin/supervision-reports/${selectedReport.id}/status`, {
        status: reviewDraft.status,
        adminComment: reviewDraft.comment
      });

      if (reviewDraft.score !== "") {
        const activeSemester = semesters.find(s => s.is_active === 1) || semesters[0];
        if (activeSemester) {
          const payload = {
            semesterId: activeSemester.id,
            academicYear: activeSemester.academic_year,
            adminComment: reviewDraft.comment
          };
          if (selectedReport.report_type === "mentoring") {
            payload.mentoringScore = Number(reviewDraft.score);
          } else if (selectedReport.report_type === "other") {
            payload.otherScore = Number(reviewDraft.score);
          } else {
            payload.supervisionScore = Number(reviewDraft.score);
          }
          await api.patch(`/admin/award-scores/${selectedReport.lecturer_id}`, payload);
        }
      }

      setReviewMessage("Review saved successfully.");
      loadData();
      setTimeout(closeReviewModal, 1500);
    } catch (err) {
      setReviewError(err.response?.data?.message || "Failed to save review.");
    } finally {
      setSavingReview(false);
    }
  };



  return (
    <AdminLayout title="Activity Reports">

      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col min-w-0">
        <div className="mb-6 flex flex-col gap-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-bold text-brandBlue">Activity Reports Inbox</h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{filteredReports.length} reports</span>
            </div>
            <div className="flex bg-slate-100 rounded-full p-1 overflow-x-auto whitespace-nowrap self-start md:self-auto">
              <button 
                onClick={() => setActiveInboxTab("supervision")} 
                className={`px-4 py-2 text-sm font-semibold rounded-full transition ${activeInboxTab === "supervision" ? "bg-white shadow-sm text-brandBlue" : "text-slate-600 hover:bg-slate-200"}`}>
                Supervision
              </button>
              <button 
                onClick={() => setActiveInboxTab("mentoring")} 
                className={`px-4 py-2 text-sm font-semibold rounded-full transition ${activeInboxTab === "mentoring" ? "bg-white shadow-sm text-brandBlue" : "text-slate-600 hover:bg-slate-200"}`}>
                Mentoring
              </button>
              <button 
                onClick={() => setActiveInboxTab("other")} 
                className={`px-4 py-2 text-sm font-semibold rounded-full transition ${activeInboxTab === "other" ? "bg-white shadow-sm text-brandBlue" : "text-slate-600 hover:bg-slate-200"}`}>
                Other
              </button>
            </div>
          </div>
          
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <input 
              placeholder="Search reports..." 
              value={reportSearch}
              onChange={(e) => setReportSearch(e.target.value)}
              className="flex-1 w-full sm:w-auto rounded-2xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-brandBlue"
            />
            <div className="sm:w-48 shrink-0">
              <SearchableSelect
                value={reportStatusFilter}
                onChange={(e) => setReportStatusFilter(e.target.value)}
                options={[
                  { value: "all", label: "All Statuses" },
                  { value: "submitted", label: "Submitted" },
                  { value: "under_review", label: "Under Review" },
                  { value: "accepted", label: "Accepted" },
                  { value: "rejected", label: "Rejected" },
                ]}
              />
            </div>
            <button onClick={handleDownloadReportsCSV} className="w-full sm:w-auto shrink-0 rounded-2xl bg-brandGold px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90">Export CSV</button>
          </div>
        </div>
        <div className="max-h-[28rem] overflow-y-auto overflow-x-auto">
          <table className="w-full text-left text-sm" style={{minWidth:'700px'}}>
            <thead className="sticky top-0 z-10 bg-white text-slate-500"><tr><th className="py-3 pr-4">Lecturer</th><th className="py-3 pr-4">Department</th><th className="py-3 pr-4">Report Title</th><th className="py-3 pr-4">Type</th><th className="py-3 pr-4">Submitted</th><th className="py-3 pr-4">Status</th><th className="py-3 pr-4">Action</th></tr></thead>
            <tbody>
              {filteredReports.map((report) => (
                <tr key={report.id} className="border-t border-slate-100">
                  <td className="py-4 pr-4">{report.lecturer_name}</td><td className="py-4 pr-4">{report.department_name}</td><td className="py-4 pr-4 font-semibold">{report.title}</td>
                  <td className="py-4 pr-4 capitalize text-slate-600">{report.report_type || "supervision"} {report.other_category ? `(${report.other_category.replace('_', ' ')})` : ''}</td>
                  <td className="py-4 pr-4">{new Date(report.submitted_at).toLocaleDateString()}</td>
                  <td className="py-4 pr-4">
                    <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize text-slate-700">
                      {report.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-4 pr-4 whitespace-nowrap"><button onClick={() => openReviewModal(report)} className="rounded-full border border-brandBlue px-4 py-2 text-xs font-semibold text-brandBlue hover:bg-brandBlue hover:text-white transition">Review Report</button></td>
                </tr>
              ))}
              {filteredReports.length === 0 && (
                <tr><td colSpan="6" className="py-6 text-center text-slate-500">No reports match the current filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>


      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <h2 className="text-2xl font-bold text-brandBlue">Review Supervision Report</h2>
            <p className="mt-2 text-sm text-slate-500">
              {selectedReport.lecturer_name} • {selectedReport.title}
            </p>
            
            {reviewMessage && <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{reviewMessage}</p>}
            {reviewError && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{reviewError}</p>}

            <div className="mt-6 space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href={`${(import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:5000/api`).replace('/api', '')}/${selectedReport.file_path?.replace(/\\/g, '/')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 rounded-2xl border-2 border-brandBlue px-4 py-3 text-center text-sm font-bold text-brandBlue transition hover:bg-brandBlue hover:text-white"
                >
                  View PDF
                </a>
                <button 
                  onClick={() => downloadReport(selectedReport)}
                  className="flex-1 rounded-2xl bg-brandBlue px-4 py-3 text-sm font-bold text-white transition hover:bg-brandBlue-dark shadow-sm"
                >
                  Download PDF
                </button>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Status</span>
                  <SearchableSelect 
                    value={reviewDraft.status}
                    onChange={(e) => setReviewDraft(c => ({ ...c, status: e.target.value, score: e.target.value !== "accepted" ? "" : c.score }))}
                    options={[
                      { value: "submitted", label: "Submitted" },
                      { value: "under_review", label: "Under Review" },
                      { value: "accepted", label: "Accepted" },
                      { value: "rejected", label: "Rejected" },
                    ]}
                  />
                </label>
                
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Marks (0-100)</span>
                  <input 
                    type="number"
                    min="0" max="100" step="0.01"
                    placeholder="Enter marks"
                    value={reviewDraft.score}
                    onChange={(e) => setReviewDraft(c => ({ ...c, score: e.target.value }))}
                    disabled={reviewDraft.status !== "accepted"}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </label>
              </div>

              <label className="space-y-2 block">
                <span className="text-sm font-semibold text-slate-700">Admin Comment</span>
                <textarea
                  rows="3"
                  placeholder="Leave a comment for the lecturer..."
                  value={reviewDraft.comment}
                  onChange={(e) => setReviewDraft(c => ({ ...c, comment: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
                />
              </label>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button onClick={closeReviewModal} className="rounded-2xl px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100">Cancel</button>
              <button 
                onClick={saveReportReview} 
                disabled={savingReview}
                className="rounded-2xl bg-brandBlue px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brandBlue-dark disabled:opacity-50"
              >
                {savingReview ? "Saving..." : "Save Review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminActivityReports;
