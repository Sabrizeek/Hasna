import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../components/AdminLayout.jsx";
import api from "../api/axios.js";
import { downloadCSV } from "../utils/csvExport.js";

const AdminAwardScores = () => {
  const [departments, setDepartments] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [filters, setFilters] = useState({ departmentId: "", semesterId: "", academicYear: "" });
  const [search, setSearch] = useState("");
  const [lecturers, setLecturers] = useState([]);
  const [draftScores, setDraftScores] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);

  const loadFilters = async () => {
    const [departmentsRes, semestersRes] = await Promise.all([
      api.get("/departments"),
      api.get("/semesters"),
    ]);
    const loadedSemesters = semestersRes.data.semesters || [];
    const activeSemester = loadedSemesters.find((semester) => Number(semester.is_active) === 1) || loadedSemesters[0];

    setDepartments(departmentsRes.data.departments || []);
    setSemesters(loadedSemesters);
    if (activeSemester) {
      setFilters((current) => ({
        ...current,
        semesterId: current.semesterId || String(activeSemester.id),
        academicYear: current.academicYear || activeSemester.academic_year,
      }));
    }
  };

  const loadScores = async () => {
    if (!filters.semesterId || !filters.academicYear) return;
    setError("");
    try {
      const response = await api.get("/admin/award-scores", { params: filters });
      const loadedLecturers = response.data.lecturers || [];
      setLecturers(loadedLecturers);
      setDraftScores(Object.fromEntries(
        loadedLecturers.map((lecturer) => [
          lecturer.lecturerId,
          {
            supervisionScore: String(lecturer.supervisionScore ?? 0),
            adminComment: lecturer.adminComment || "",
          },
        ])
      ));
    } catch (loadError) {
      setLecturers([]);
      setError(loadError.response?.data?.message || "Unable to load lecturer award scores.");
    }
  };

  useEffect(() => { loadFilters(); }, []);
  useEffect(() => { loadScores(); }, [filters]);

  const selectedSemester = useMemo(
    () => semesters.find((semester) => String(semester.id) === filters.semesterId),
    [semesters, filters.semesterId]
  );

  const handleDownloadScoresCSV = () => {
    downloadCSV(filteredLecturers, "award_scores.csv", [
      { header: "Lecturer", key: "full_name" },
      { header: "Department", key: "department_name" },
      { header: "Evaluations", key: "evaluationCount" },
      { header: "Evaluation Score", key: "evaluationScore" },
      { header: "Reports", key: "reportsSubmitted" },
      { header: "Supervision Score", key: "supervisionScore" },
      { header: "Final Score", key: "finalScore" }
    ]);
  };

  const filteredLecturers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return lecturers;
    return lecturers.filter((lecturer) =>
      [lecturer.lecturerName, lecturer.email, lecturer.departmentName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [lecturers, search]);
  const topLecturer = filteredLecturers[0];

  const totals = useMemo(() => ({
    lecturers: filteredLecturers.length,
    evaluations: filteredLecturers.reduce((sum, lecturer) => sum + lecturer.evaluationCount, 0),
    reports: filteredLecturers.reduce((sum, lecturer) => sum + lecturer.reportsSubmitted, 0),
    highestScore: topLecturer?.finalScore || 0,
  }), [filteredLecturers, topLecturer]);

  const handleSemesterChange = (value) => {
    const semester = semesters.find((item) => String(item.id) === value);
    setFilters((current) => ({ ...current, semesterId: value, academicYear: semester?.academic_year || "" }));
  };

  const updateDraft = (lecturerId, field, value) => {
    setDraftScores((current) => ({
      ...current,
      [lecturerId]: {
        ...(current[lecturerId] || {}),
        [field]: value,
      },
    }));
  };

  const saveSupervisionScore = async (lecturer) => {
    const draft = draftScores[lecturer.lecturerId] || {};
    const supervisionScore = Number(draft.supervisionScore);

    setError("");
    setMessage("");
    if (!Number.isFinite(supervisionScore) || supervisionScore < 0 || supervisionScore > 100) {
      setError("Supervision score must be a number from 0 to 100.");
      return;
    }

    setSavingId(lecturer.lecturerId);
    try {
      await api.patch(`/admin/award-scores/${lecturer.lecturerId}`, {
        semesterId: Number(filters.semesterId),
        academicYear: filters.academicYear,
        supervisionScore,
        adminComment: draft.adminComment || "",
      });
      setMessage(`Saved supervision score for ${lecturer.lecturerName}.`);
      await loadScores();
    } catch (saveError) {
      setError(saveError.response?.data?.message || "Unable to save supervision score.");
    } finally {
      setSavingId(null);
    }
  };

  const kpis = [
    ["Lecturers Ranked", totals.lecturers],
    ["Student Evaluations", totals.evaluations],
    ["Reports Submitted", totals.reports],
    ["Highest Final Score", totals.highestScore],
  ];

  return (
    <AdminLayout title="Awards & Scores">
      {message && <p className="mb-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p>}
      {error && <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brandGold">Lecturer Awards</p>
            <h2 className="mt-3 text-3xl font-bold text-brandBlue">Award Scoreboard</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Student evaluation scores are calculated automatically and cannot be edited. Admins can add supervision marks from 0 to 100 based on submitted supervision reports.
            </p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-2 xl:max-w-3xl xl:grid-cols-[1fr_1fr_auto]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search lecturer, email, department"
              className="rounded-2xl border border-slate-300 px-4 py-3 sm:col-span-2 xl:col-span-3"
            />
            <select value={filters.departmentId} onChange={(e) => setFilters((current) => ({ ...current, departmentId: e.target.value }))} className="rounded-2xl border border-slate-300 px-4 py-3">
              <option value="">All departments</option>
              {departments.map((department) => <option key={department.id} value={department.id}>{department.department_name}</option>)}
            </select>
            <select value={filters.semesterId} onChange={(e) => handleSemesterChange(e.target.value)} className="rounded-2xl border border-slate-300 px-4 py-3">
              {semesters.map((semester) => <option key={semester.id} value={semester.id}>{semester.semester_name} - {semester.academic_year}</option>)}
            </select>
            <div className="flex gap-2 sm:col-span-2 xl:col-span-1">
              <button onClick={loadScores} className="w-full rounded-2xl bg-brandBlue px-5 py-3 font-semibold text-white transition hover:opacity-90">Refresh</button>
              <button onClick={handleDownloadScoresCSV} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brandGold px-4 py-3 font-semibold text-white transition hover:opacity-90">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                CSV
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {kpis.map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-500">{label}</p>
              <p className="mt-3 text-3xl font-bold text-brandBlue">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-5 text-sm leading-7 text-amber-900">
          Formula for {selectedSemester ? `${selectedSemester.semester_name} - ${selectedSemester.academic_year}` : "the selected semester"}:
          <span className="font-semibold"> Evaluation Score = average student overall percentage.</span>
          <span className="font-semibold"> Final Score = Evaluation Score + Supervision Score.</span>
          Maximum final score is 200.
        </div>
      </section>

      <section className="mt-6 max-h-[48rem] overflow-y-auto pr-2">
        <div className="grid gap-5 xl:grid-cols-2">
        {filteredLecturers.map((lecturer) => {
          const draft = draftScores[lecturer.lecturerId] || {};
          const liveSupervisionScore = Number(draft.supervisionScore || 0);
          const liveFinalScore = (lecturer.evaluationScore + liveSupervisionScore).toFixed(2);

          return (
            <article key={lecturer.lecturerId} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-brandGold px-3 py-1 text-xs font-bold text-white">Rank #{lecturer.rank}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{lecturer.departmentName || "No department"}</span>
                  </div>
                  <h3 className="mt-3 break-words text-xl font-bold text-brandBlue">{lecturer.lecturerName}</h3>
                  <p className="mt-1 break-all text-xs text-slate-500">{lecturer.email}</p>
                </div>
                <div className="rounded-2xl bg-brandBlue px-5 py-4 text-center text-white">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Final</p>
                  <p className="mt-1 text-3xl font-bold">{liveFinalScore}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-500">Evaluations</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950">{lecturer.evaluationCount}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-500">Eval Avg</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950">{lecturer.evaluationAverage}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-500">Eval Score</p>
                  <p className="mt-2 text-2xl font-bold text-slate-950">{lecturer.evaluationScore}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-500">Reports</p>
                  <p className="mt-2 text-sm font-bold text-slate-950">{lecturer.reportsSubmitted} submitted</p>
                  <p className="mt-1 text-xs text-slate-500">{lecturer.acceptedReports} accepted</p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[180px_1fr_auto] lg:items-end">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Supervision Score</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={draft.supervisionScore ?? ""}
                    onChange={(e) => updateDraft(lecturer.lecturerId, "supervisionScore", e.target.value)}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-700">Admin Comment</span>
                  <textarea
                    value={draft.adminComment ?? ""}
                    onChange={(e) => updateDraft(lecturer.lecturerId, "adminComment", e.target.value)}
                    rows="2"
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3"
                    placeholder="Reason for supervision mark"
                  />
                </label>
                <button
                  onClick={() => saveSupervisionScore(lecturer)}
                  disabled={savingId === lecturer.lecturerId}
                  className="rounded-2xl bg-brandBlue px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {savingId === lecturer.lecturerId ? "Saving..." : "Save"}
                </button>
              </div>
            </article>
          );
        })}
        {filteredLecturers.length === 0 && (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm xl:col-span-2">
            No lecturers match the selected filters or search.
          </div>
        )}
        </div>
      </section>
    </AdminLayout>
  );
};

export default AdminAwardScores;
