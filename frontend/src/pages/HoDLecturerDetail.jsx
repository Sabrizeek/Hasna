import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import api from "../api/axios.js";
import DeanLayout from "../components/DeanLayout.jsx";
import HoDLayout from "../components/HoDLayout.jsx";

const initialsFromName = (name = "") => {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "LE";
};

const HoDLecturerDetail = () => {
  const { lecturerId } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [details, setDetails] = useState(null);
  const [activeTab, setActiveTab] = useState("evaluations");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const filters = useMemo(() => ({
    semesterId: searchParams.get("semesterId") || "",
    academicYear: searchParams.get("academicYear") || "",
  }), [searchParams]);
  const isDeanView = location.pathname.startsWith("/dean/");
  const Layout = isDeanView ? DeanLayout : HoDLayout;
  const dashboardPath = isDeanView ? "/dean/dashboard" : "/hod/dashboard";
  const dashboardLabel = isDeanView ? "Dean Dashboard" : "HoD Dashboard";

  useEffect(() => {
    const loadDetails = async () => {
      try {
        const response = await api.get(`/${isDeanView ? "dean" : "hod"}/lecturer/${lecturerId}/details`, { params: filters });
        setDetails(response.data);
      } catch (loadError) {
        setError(loadError.response?.data?.message || "Unable to load lecturer details.");
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
  }, [lecturerId, filters, isDeanView]);

  const downloadReport = async (report) => {
    let urlPath = "";
    if (report.isPeer) {
      urlPath = `/${isDeanView ? "dean" : "hod"}/peer-evaluations/${report.id}/download`;
    } else {
      urlPath = `/${isDeanView ? "dean" : "hod"}/supervision-reports/${report.id}/download`;
    }
    const response = await api.get(urlPath, { responseType: "blob" });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = report.file_name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout departmentName={details?.lecturer?.department}>
      <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link to={dashboardPath} className="font-semibold text-amber-700 hover:text-amber-900">{dashboardLabel}</Link>
        <span>/</span>
        <span className="text-slate-800">{details?.lecturer?.name || "Lecturer"}</span>
      </nav>

      <section className="mt-6 rounded-3xl border border-amber-100 bg-white p-6 shadow-sm sm:p-8">
        {loading ? (
          <div className="rounded-2xl bg-slate-50 p-6 text-sm text-slate-600">Loading lecturer details...</div>
        ) : error ? (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <Link to={dashboardPath} className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 mt-1 shrink-0">
                &larr; Back
              </Link>
              <div className="grid gap-6 lg:grid-cols-[180px_1fr] w-full">
                <div className="flex h-40 w-40 items-center justify-center rounded-3xl bg-amber-600 text-4xl font-bold text-white">
                  {details.lecturer.photo_url ? (
                    <img src={details.lecturer.photo_url} alt={details.lecturer.name} className="h-full w-full rounded-3xl object-cover" />
                  ) : initialsFromName(details.lecturer.name)}
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">Lecturer Profile</p>
                  <h2 className="mt-2 text-3xl font-bold text-slate-950">{details.lecturer.name}</h2>
                  <p className="mt-2 text-sm text-slate-600">{details.lecturer.email}</p>
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-500">Department</p>
                    <p className="mt-2 font-bold text-slate-950">{details.lecturer.department}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-500">Designation</p>
                    <p className="mt-2 font-bold text-slate-950">{details.lecturer.designation || "Lecturer"}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-500">Modules</p>
                    <p className="mt-2 font-bold text-slate-950">{details.assignedModules.length}</p>
                  </div>
                </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("evaluations")}
                className={`rounded-2xl px-5 py-3 text-sm font-semibold ${activeTab === "evaluations" ? "bg-amber-600 text-white" : "border border-slate-300 text-slate-700"}`}
              >
                Performance Scores
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("supervision")}
                className={`rounded-2xl px-5 py-3 text-sm font-semibold ${activeTab === "supervision" ? "bg-amber-600 text-white" : "border border-slate-300 text-slate-700"}`}
              >
                Supervision Reports
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("peer")}
                className={`rounded-2xl px-5 py-3 text-sm font-semibold ${activeTab === "peer" ? "bg-amber-600 text-white" : "border border-slate-300 text-slate-700"}`}
              >
                Peer Evaluations
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("mentoring")}
                className={`rounded-2xl px-5 py-3 text-sm font-semibold ${activeTab === "mentoring" ? "bg-amber-600 text-white" : "border border-slate-300 text-slate-700"}`}
              >
                Mentoring Reports
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("other")}
                className={`rounded-2xl px-5 py-3 text-sm font-semibold ${activeTab === "other" ? "bg-amber-600 text-white" : "border border-slate-300 text-slate-700"}`}
              >
                Other Reports
              </button>
            </div>

            {activeTab === "evaluations" ? (
              <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Student Eval</p>
                  <p className="mt-4 text-4xl font-bold text-slate-950">{details.scores?.studentEvaluationScore != null ? `${details.scores.studentEvaluationScore}%` : "-"}</p>
                  <p className="mt-2 text-sm text-slate-600">{details.scores?.totalResponses} total anonymous responses</p>
                </article>
                <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Peer Eval</p>
                  <p className="mt-4 text-4xl font-bold text-slate-950">{details.scores?.peerEvaluationScore != null ? details.scores.peerEvaluationScore : "-"}</p>
                </article>
                <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Mentoring</p>
                  <p className="mt-4 text-4xl font-bold text-slate-950">{details.scores?.mentoringScore != null ? details.scores.mentoringScore : "-"}</p>
                </article>
                <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Supervision</p>
                  <p className="mt-4 text-4xl font-bold text-slate-950">{details.scores?.supervisionScore != null ? details.scores.supervisionScore : "-"}</p>
                </article>
                <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Other</p>
                  <p className="mt-4 text-4xl font-bold text-slate-950">{details.scores?.otherScore != null ? details.scores.otherScore : "-"}</p>
                </article>
                <article className="rounded-3xl border-2 border-amber-400 bg-amber-50 p-5 shadow-sm">
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-amber-700">Overall Score</p>
                  <p className="mt-4 text-4xl font-bold text-amber-900">{details.scores?.overallScore != null ? `${details.scores.overallScore}%` : "-"}</p>
                </article>
                <div className="md:col-span-2 lg:col-span-3 rounded-3xl border border-slate-200 bg-white p-5">
                  <h3 className="text-lg font-bold text-slate-950">Assigned Modules</h3>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {details.assignedModules.map((module) => (
                      <div key={`${module.courseId}-${module.semesterId}`} className="rounded-2xl bg-slate-50 p-4 text-sm">
                        <p className="font-bold text-slate-950">{module.course_code} - {module.course_name}</p>
                        <p className="mt-1 text-slate-600">{module.semester_name} - {module.academic_year}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : activeTab === "peer" ? (
              <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
                <div className="max-h-[30rem] overflow-y-auto overflow-x-hidden">
                <table className="w-full table-fixed text-left text-sm [&_td]:break-words [&_th]:break-words">
                  <thead className="sticky top-0 z-10 bg-slate-900 text-white">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Evaluator</th>
                      <th className="px-5 py-4 font-semibold">File Name</th>
                      <th className="px-5 py-4 font-semibold">Submitted Date</th>
                      <th className="px-5 py-4 font-semibold">Status</th>
                      <th className="px-5 py-4 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!details.peerEvaluations || details.peerEvaluations.length === 0 ? (
                      <tr><td colSpan="5" className="px-5 py-6 text-amber-700">No peer evaluations submitted yet.</td></tr>
                    ) : details.peerEvaluations.map((report) => (
                      <tr key={report.id} className="border-t border-slate-100">
                        <td className="px-5 py-4 font-semibold text-slate-950">{report.evaluator_name}</td>
                        <td className="px-5 py-4 text-slate-600">{report.file_name}</td>
                        <td className="px-5 py-4 text-slate-600">{new Date(report.submitted_at).toLocaleDateString()}</td>
                        <td className="px-5 py-4 capitalize text-slate-600">{report.status.replace("_", " ")}</td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <button onClick={() => downloadReport({...report, isPeer: true})} className="rounded-full border border-amber-200 px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50">
                            View/Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            ) : (
              <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
                <div className="max-h-[30rem] overflow-y-auto overflow-x-hidden">
                <table className="w-full table-fixed text-left text-sm [&_td]:break-words [&_th]:break-words">
                  <thead className="sticky top-0 z-10 bg-slate-900 text-white">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Title</th>
                      <th className="px-5 py-4 font-semibold">Submitted Date</th>
                      <th className="px-5 py-4 font-semibold">Status</th>
                      <th className="px-5 py-4 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.supervisionReports.filter((report) => report.report_type === activeTab).length === 0 ? (
                      <tr><td colSpan="4" className="px-5 py-6 text-amber-700">No {activeTab} reports submitted.</td></tr>
                    ) : details.supervisionReports.filter((report) => report.report_type === activeTab).map((report) => (
                      <tr key={report.id} className="border-t border-slate-100">
                        <td className="px-5 py-4 font-semibold text-slate-950">{report.title}</td>
                        <td className="px-5 py-4 text-slate-600">{new Date(report.submitted_at).toLocaleDateString()}</td>
                        <td className="px-5 py-4 capitalize text-slate-600">{report.status.replace("_", " ")}</td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <button onClick={() => downloadReport(report)} className="rounded-full border border-amber-200 px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50">
                            View/Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </Layout>
  );
};

export default HoDLecturerDetail;
