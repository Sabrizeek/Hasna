import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios.js";
import LecturerLayout from "../components/LecturerLayout.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const initialsFromName = (name = "") => {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "LE";
};

const LecturerDashboard = () => {
  const { user } = useAuth();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadModules = async () => {
      try {
        const response = await api.get("/lecturer/modules");
        setModules(response.data.modules || []);
      } catch (loadError) {
        setError(loadError.response?.data?.message || "Unable to load assigned modules.");
      } finally {
        setLoading(false);
      }
    };

    loadModules();
  }, []);

  return (
    <LecturerLayout>
      <section className="rounded-3xl border border-sky-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_180px] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">Welcome Back</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950">{user?.full_name}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {user?.department_name || "Faculty of Science"} lecturer workspace for module evaluation results and supervision reports.
            </p>
          </div>
          <div className="flex h-32 w-32 items-center justify-center rounded-3xl bg-sky-700 text-4xl font-bold text-white shadow-sm lg:justify-self-end">
            {initialsFromName(user?.full_name)}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">My Evaluations</p>
            <h3 className="mt-2 text-2xl font-bold text-slate-950">My Modules This Semester</h3>
          </div>
          <Link
            to="/lecturer/supervision-reports"
            className="rounded-2xl border border-sky-200 px-5 py-3 text-sm font-semibold text-sky-700 transition hover:bg-sky-50"
          >
            Supervision Reports
          </Link>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
            Loading modules...
          </div>
        ) : error ? null : modules.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-6 text-sm font-medium text-amber-800">
            No modules are assigned to your lecturer account yet.
          </div>
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {modules.map((module) => {
              const params = new URLSearchParams({
                semesterId: module.semester_id,
                academicYear: module.academic_year,
                type: "theory",
              });

              return (
                <article key={`${module.course_id}-${module.semester_id}`} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                  <p className="text-sm font-bold text-sky-700">{module.course_code}</p>
                  <h4 className="mt-2 min-h-14 text-lg font-bold leading-7 text-slate-950">{module.course_name}</h4>
                  <div className="mt-4 space-y-2 text-sm text-slate-600">
                    <p>{module.semester_name}</p>
                    <p>{module.academic_year}</p>
                  </div>
                  <Link
                    to={`/lecturer/evaluation-results/${module.course_id}?${params.toString()}`}
                    className="mt-5 inline-flex w-full justify-center rounded-2xl bg-sky-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-800"
                  >
                    View Evaluation
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </LecturerLayout>
  );
};

export default LecturerDashboard;
