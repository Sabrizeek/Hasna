import { useEffect, useState } from "react";
import api from "../api/axios.js";
import LecturerLayout from "../components/LecturerLayout.jsx";

const maxFileSize = 10 * 1024 * 1024;
const allowedTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
];

const statusStyles = {
  assigned: "bg-amber-50 text-amber-700",
  completed: "bg-emerald-50 text-emerald-700",
  submitted: "bg-sky-50 text-sky-700",
  under_review: "bg-amber-50 text-amber-700",
  accepted: "bg-emerald-50 text-emerald-700",
};

const formatStatus = (status) => (status ? status.replace("_", " ") : "");

const LecturerPeerEvaluations = () => {
  const [assignments, setAssignments] = useState([]);
  const [files, setFiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadAssignments = async () => {
    try {
      const response = await api.get("/lecturer/peer-evaluations");
      setAssignments(response.data.assignments || []);
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Unable to load peer evaluations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, []);

  const handleFileChange = (assignmentId, event) => {
    const nextFile = event.target.files?.[0] || null;
    setMessage("");
    setError("");

    if (!nextFile) {
      setFiles((prev) => {
        const next = { ...prev };
        delete next[assignmentId];
        return next;
      });
      return;
    }

    if (!allowedTypes.includes(nextFile.type)) {
      setError("Only PDF, JPG, and PNG files are allowed.");
      return;
    }

    if (nextFile.size > maxFileSize) {
      setError("File must be 10MB or smaller.");
      return;
    }

    setFiles((prev) => ({ ...prev, [assignmentId]: nextFile }));
  };

  const handleUpload = async (assignmentId) => {
    setMessage("");
    setError("");

    const file = files[assignmentId];
    if (!file) {
      setError("Please select a valid PDF, JPG, or PNG file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploading(assignmentId);

    try {
      await api.post(`/lecturer/peer-evaluations/${assignmentId}/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setFiles((prev) => {
        const next = { ...prev };
        delete next[assignmentId];
        return next;
      });
      setMessage("Peer evaluation uploaded successfully.");
      await loadAssignments();
    } catch (uploadError) {
      setError(uploadError.response?.data?.message || "Unable to upload peer evaluation.");
    } finally {
      setUploading(null);
    }
  };

  const downloadReport = async (upload) => {
    try {
      const response = await api.get(`/lecturer/peer-evaluations/uploads/${upload.upload_id}/download`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = upload.file_name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(downloadError.response?.data?.message || "Unable to download file.");
    }
  };

  return (
    <LecturerLayout>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">Peer Evaluations</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-950">Upload Scanned Peer Evaluations</h2>
          <p className="mt-2 text-sm text-slate-600">Please complete the paper-based evaluation, scan it, and upload it here.</p>
        </div>

        {message && <p className="mt-6 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p>}
        {error && <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

        <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200">
          <div className="bg-slate-900 px-5 py-4">
            <h3 className="text-lg font-bold text-white">My Assignments</h3>
          </div>
          {loading ? (
            <div className="p-5 text-sm text-slate-600">Loading assignments...</div>
          ) : assignments.length === 0 ? (
            <div className="p-5 text-sm font-medium text-amber-700">You have no peer evaluation assignments.</div>
          ) : (
            <div className="max-h-[34rem] overflow-y-auto overflow-x-auto">
              <table className="w-full table-fixed text-left text-sm [&_td]:break-words [&_th]:break-words min-w-[700px]">
                <thead className="sticky top-0 z-10 bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Evaluated Lecturer</th>
                    <th className="px-5 py-3 font-semibold">Semester</th>
                    <th className="px-5 py-3 font-semibold">Assignment Status</th>
                    <th className="px-5 py-3 font-semibold">Upload Status</th>
                    <th className="px-5 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((assignment) => (
                    <tr key={assignment.assignment_id} className="border-t border-slate-100">
                      <td className="px-5 py-4 font-semibold text-slate-900">{assignment.evaluated_name}</td>
                      <td className="px-5 py-4 text-slate-600">
                        {assignment.semester_name} <br />
                        <span className="text-xs text-slate-400">{assignment.academic_year}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold capitalize ${statusStyles[assignment.assignment_status] || "bg-slate-100 text-slate-700"}`}>
                          {formatStatus(assignment.assignment_status)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {assignment.upload_status ? (
                          <span className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold capitalize ${statusStyles[assignment.upload_status] || "bg-slate-100 text-slate-700"}`}>
                            {formatStatus(assignment.upload_status)}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Not Uploaded</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {assignment.assignment_status === "completed" && assignment.upload_status !== "rejected" ? (
                          <div className="flex flex-col gap-2">
                            <a
                              href={`${(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace('/api', '')}/${assignment.file_path?.replace(/\\/g, '/')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="block rounded-full border border-emerald-500 px-4 py-1.5 text-center text-xs font-semibold text-emerald-600 transition hover:bg-emerald-500 hover:text-white"
                            >
                              View File
                            </a>
                            <button
                              onClick={() => downloadReport(assignment)}
                              className="rounded-full border border-sky-200 px-4 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-50"
                            >
                              Download File
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                              onChange={(e) => handleFileChange(assignment.assignment_id, e)}
                              className="w-full text-xs file:mr-2 file:cursor-pointer file:rounded-full file:border-0 file:bg-sky-50 file:px-3 file:py-1 file:font-semibold file:text-sky-700"
                            />
                            {files[assignment.assignment_id] && (
                              <button
                                onClick={() => handleUpload(assignment.assignment_id)}
                                disabled={uploading === assignment.assignment_id}
                                className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-sky-800 disabled:opacity-50"
                              >
                                {uploading === assignment.assignment_id ? "Uploading..." : assignment.upload_status === "rejected" ? "Re-upload File" : "Upload File"}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </LecturerLayout>
  );
};

export default LecturerPeerEvaluations;
