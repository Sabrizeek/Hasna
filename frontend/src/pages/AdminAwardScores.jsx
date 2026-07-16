import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../components/AdminLayout.jsx";
import api from "../api/axios.js";
import { downloadCSV } from "../utils/csvExport.js";
import SearchableSelect from "../components/SearchableSelect.jsx";

const AdminAwardScores = () => {
  const [departments, setDepartments] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [filters, setFilters] = useState({ departmentId: "", semesterId: "", academicYear: "" });
  const [search, setSearch] = useState("");
  const [lecturers, setLecturers] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
    setError("");
    try {
      const params = {};
      if (filters.semesterId) params.semesterId = filters.semesterId;
      if (filters.academicYear) params.academicYear = filters.academicYear;
      if (filters.departmentId) params.departmentId = filters.departmentId;
      const response = await api.get("/admin/award-scores", { params });
      setLecturers(response.data.lecturers || []);
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
      { header: "Rank", key: "rank" },
      { header: "Lecturer", key: "lecturerName" },
      { header: "Department", key: "departmentName" },
      { header: "Evaluations", key: "evaluationCount" },
      { header: "Student Eval Score (50%)", key: "evaluationScore" },
      { header: "Peer Eval Score (20%)", key: "peerEvaluationScore" },
      { header: "Mentoring Score (15%)", key: "mentoringScore" },
      { header: "Supervision Score (10%)", key: "supervisionScore" },
      { header: "Other Score (5%)", key: "otherScore" },
      { header: "Final Score", key: "finalScore" },
      { header: "Reports Submitted", key: "reportsSubmitted" }
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
    if (value === "") {
      setFilters((current) => ({ ...current, semesterId: "", academicYear: "" }));
    } else {
      const semester = semesters.find((item) => String(item.id) === value);
      setFilters((current) => ({ ...current, semesterId: value, academicYear: semester?.academic_year || "" }));
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
              Student evaluation scores are calculated automatically.
            </p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-2 xl:max-w-3xl xl:grid-cols-[1fr_1fr_auto]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search lecturer, email, department"
              className="rounded-2xl border border-slate-300 px-4 py-3 sm:col-span-2 xl:col-span-3"
            />
            <SearchableSelect
              value={filters.departmentId}
              onChange={(e) => setFilters((current) => ({ ...current, departmentId: e.target.value }))}
              options={[
                { value: "", label: "All departments" },
                ...departments.map((department) => ({
                  value: department.id,
                  label: department.department_name,
                }))
              ]}
            />
            <SearchableSelect
              value={filters.semesterId}
              onChange={(e) => handleSemesterChange(e.target.value)}
              options={[
                { value: "", label: "All Semesters" },
                ...semesters.map((semester) => ({
                  value: semester.id,
                  label: `${semester.semester_name} - ${semester.academic_year}`
                }))
              ]}
            />
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
          <strong>Scoring Formula</strong> for {selectedSemester ? `${selectedSemester.semester_name} - ${selectedSemester.academic_year}` : "the selected semester"}:
          <span className="font-semibold"> Final Score = Student Eval (50%) + Peer Eval (20%) + Mentoring (15%) + Supervision (10%) + Other (5%)</span>
        </div>
      </section>

      <section className="mt-6 max-h-[48rem] overflow-y-auto pr-2">
        <div className="grid gap-5 xl:grid-cols-2">
        {filteredLecturers.map((lecturer) => {
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
                  <p className="mt-1 text-3xl font-bold">{lecturer.finalScore}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-500">Student Eval <span className="text-slate-400">(50%)</span></p>
                  <p className="mt-2 text-2xl font-bold text-slate-950">{lecturer.evaluationScore}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-500">Peer Eval <span className="text-slate-400">(20%)</span></p>
                  <p className="mt-2 text-2xl font-bold text-slate-950">{lecturer.peerEvaluationScore ?? "—"}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-500">Mentoring <span className="text-slate-400">(15%)</span></p>
                  <p className="mt-2 text-2xl font-bold text-slate-950">{lecturer.mentoringScore}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-500">Supervision <span className="text-slate-400">(10%)</span></p>
                  <p className="mt-2 text-2xl font-bold text-slate-950">{lecturer.supervisionScore}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-500">Other <span className="text-slate-400">(5%)</span></p>
                  <p className="mt-2 text-2xl font-bold text-slate-950">{lecturer.otherScore}</p>
                </div>
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
