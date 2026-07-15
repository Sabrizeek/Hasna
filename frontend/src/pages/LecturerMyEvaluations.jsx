import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios.js";
import LecturerLayout from "../components/LecturerLayout.jsx";

const LecturerMyEvaluations = () => {
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
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">My Evaluations</p>
            <h3 className="mt-2 text-2xl font-bold text-slate-950">My Modules This Semester</h3>
          </div>
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

export default LecturerMyEvaluations;
