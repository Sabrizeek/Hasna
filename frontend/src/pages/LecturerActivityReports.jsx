import { useEffect, useState } from "react";
import api from "../api/axios.js";
import LecturerLayout from "../components/LecturerLayout.jsx";
import SearchableSelect from "../components/SearchableSelect.jsx";
const maxFileSize = 10 * 1024 * 1024;
const allowedTypes = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const statusStyles = {
  submitted: "bg-sky-50 text-sky-700",
  under_review: "bg-amber-50 text-amber-700",
  accepted: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
};

const formatStatus = (status) => status.replace("_", " ");

const LecturerSupervisionReports = () => {
  const [reports, setReports] = useState([]);
  const [title, setTitle] = useState("");
  const [reportType, setReportType] = useState("supervision");
  const [otherCategory, setOtherCategory] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedComment, setSelectedComment] = useState(null);

  const loadReports = async () => {
    try {
      const response = await api.get("/lecturer/supervision-reports");
      setReports(response.data.reports || []);
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Unable to load supervision reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleFileChange = (event) => {
    const nextFile = event.target.files?.[0] || null;
    setMessage("");
    setError("");

    if (!nextFile) {
      setFile(null);
      return;
    }

    if (!allowedTypes.includes(nextFile.type)) {
      setFile(null);
      setError("Only PDF, DOC, and DOCX files are allowed.");
      return;
    }

    if (nextFile.size > maxFileSize) {
      setFile(null);
      setError("Report file must be 10MB or smaller.");
      return;
    }

    setFile(nextFile);
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!title.trim()) {
      setError("Report title is required.");
      return;
    }

    if (reportType === "other" && !otherCategory) {
      setError("Please select a category for the 'Other' report type.");
      return;
    }

    if (!file) {
      setError("Please select a PDF, DOC, or DOCX file.");
      return;
    }

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("reportType", reportType);
    if (reportType === "other") {
      formData.append("otherCategory", otherCategory);
    }
    formData.append("report", file);

    setUploading(true);

    try {
      await api.post("/lecturer/supervision-reports", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setTitle("");
      setReportType("supervision");
      setOtherCategory("");
      setFile(null);
      setMessage("Activity report uploaded successfully.");
      await loadReports();
    } catch (uploadError) {
      const backendMessage = uploadError.response?.data?.message;
      const backendError = uploadError.response?.data?.error;
      const displayError = backendError 
        ? `${backendMessage} (${backendError})` 
        : (backendMessage || "Unable to upload supervision report.");
      setError(displayError);
    } finally {
      setUploading(false);
    }
  };

  const downloadReport = async (report) => {
    try {
      const response = await api.get(`/lecturer/supervision-reports/${report.id}/download`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = report.file_name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError.response?.data?.message || "Unable to download report.");
    }
  };

  return (
    <LecturerLayout>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">Activity Reports</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950">Upload and Track Reports</h2>
          </div>
          <a
            href={`${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"}/supervision-template`}
            className="rounded-2xl bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-800"
          >
            Download Report Template
          </a>
        </div>

        <form onSubmit={handleUpload} className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Report Title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                placeholder="Example: Semester 1 Supervision Report"
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Completed Report</span>
              <input
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm file:mr-4 file:rounded-full file:border-0 file:bg-sky-50 file:px-4 file:py-2 file:font-semibold file:text-sky-700"
              />
              <span className="block text-xs text-slate-500">PDF, DOC, or DOCX. Maximum 10MB.</span>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Report Type</span>
              <SearchableSelect
                value={reportType}
                onChange={(e) => {
                  setReportType(e.target.value);
                  if (e.target.value !== "other") setOtherCategory("");
                }}
                options={[
                  { value: "supervision", label: "Supervision" },
                  { value: "mentoring", label: "Mentoring" },
                  { value: "other", label: "Other" },
                ]}
              />
            </label>
            {reportType === "other" && (
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Category</span>
                <SearchableSelect
                  value={otherCategory}
                  onChange={(e) => setOtherCategory(e.target.value)}
                  options={[
                    { value: "", label: "Select a Category..." },
                    { value: "counselling", label: "Counselling" },
                    { value: "societies", label: "Societies" },
                    { value: "academic_coordinator", label: "Academic Coordinator" },
                  ]}
                />
              </label>
            )}
          </div>

          {message && <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p>}
          {error && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={uploading}
            className="mt-5 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-wait disabled:bg-slate-400"
          >
            {uploading ? "Uploading..." : "Upload Completed Report"}
          </button>
        </form>

        <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200">
          <div className="bg-slate-900 px-5 py-4">
            <h3 className="text-lg font-bold text-white">Submitted Reports</h3>
          </div>
          {loading ? (
            <div className="p-5 text-sm text-slate-600">Loading reports...</div>
          ) : reports.length === 0 ? (
            <div className="p-5 text-sm font-medium text-amber-700">No supervision reports have been submitted yet.</div>
          ) : (
            <div className="max-h-[28rem] overflow-y-auto overflow-x-auto w-full">
              <table className="w-full min-w-[800px] text-left text-sm [&_td]:break-words [&_th]:break-words">
                <thead className="sticky top-0 z-10 bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Report Title</th>
                    <th className="px-5 py-3 font-semibold">Type</th>
                    <th className="px-5 py-3 font-semibold">Submitted Date</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Comment</th>
                    <th className="px-5 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id} className="border-t border-slate-100">
                      <td className="px-5 py-4 font-semibold text-slate-900">{report.title}</td>
                      <td className="px-5 py-4 text-slate-600 capitalize">
                        {report.report_type} {report.other_category ? `(${report.other_category.replace('_', ' ')})` : ''}
                      </td>
                      <td className="px-5 py-4 text-slate-600">{new Date(report.submitted_at).toLocaleDateString()}</td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${statusStyles[report.status] || "bg-slate-100 text-slate-700"}`}>
                          {formatStatus(report.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {report.admin_comment ? (
                          <button
                            type="button"
                            onClick={() => setSelectedComment(report.admin_comment)}
                            className="rounded-full border border-sky-200 px-4 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-50"
                          >
                            View Comment
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">No Comment</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => downloadReport(report)}
                          className="rounded-full border border-sky-200 px-4 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-50"
                        >
                          View/Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {selectedComment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-950">Admin Comment</h2>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 border border-slate-200">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {selectedComment}
              </p>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedComment(null)}
                className="rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </LecturerLayout>
  );
};

export default LecturerSupervisionReports;
