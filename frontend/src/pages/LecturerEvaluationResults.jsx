import { ArcElement, Chart as ChartJS, Legend, Tooltip } from "chart.js";
import { useEffect, useMemo, useState } from "react";
import { Pie } from "react-chartjs-2";
import { Link, useParams, useSearchParams } from "react-router-dom";
import api from "../api/axios.js";
import LecturerLayout from "../components/LecturerLayout.jsx";

ChartJS.register(ArcElement, Tooltip, Legend);

const scores = [5, 4, 3, 2, 1];
const scoreLabels = {
  5: "Strongly Agree",
  4: "Agree",
  3: "Average",
  2: "Disagree",
  1: "Strongly Disagree",
};
const chartColors = ["#0f766e", "#0284c7", "#f59e0b", "#f97316", "#dc2626"];

const buildChartData = (distribution) => ({
  labels: scores.map((score) => `${score} ${scoreLabels[score]}`),
  datasets: [
    {
      data: scores.map((score) => distribution?.[score] || 0),
      backgroundColor: chartColors,
      borderColor: "#ffffff",
      borderWidth: 2,
    },
  ],
});

const chartOptions = {
  plugins: {
    legend: {
      display: false,
    },
  },
  responsive: true,
  maintainAspectRatio: false,
};

const DistributionLegend = ({ distribution, percentages }) => (
  <div className="space-y-2">
    {scores.map((score, index) => (
      <div key={score} className="flex items-center justify-between gap-3 text-xs">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: chartColors[index] }} />
          <span className="truncate font-semibold text-slate-700">
            {score} {scoreLabels[score]}
          </span>
        </div>
        <span className="font-bold text-slate-950">
          {distribution?.[score] || 0} ({percentages?.[score] || 0}%)
        </span>
      </div>
    ))}
  </div>
);

const LecturerEvaluationResults = () => {
  const { courseId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const filters = useMemo(() => {
    return {
      semesterId: searchParams.get("semesterId") || "",
      academicYear: searchParams.get("academicYear") || "",
      type: searchParams.get("type") || "theory",
    };
  }, [searchParams]);

  useEffect(() => {
    const loadResults = async () => {
      if (!filters.semesterId || !filters.academicYear || !["theory", "practical"].includes(filters.type)) {
        setError("Module, semester, academic year and result type are required.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await api.get(`/lecturer/evaluation-results/${courseId}`, {
          params: filters,
        });
        setResults(response.data);
      } catch (loadError) {
        setError(loadError.response?.data?.message || "Unable to load evaluation results.");
      } finally {
        setLoading(false);
      }
    };

    loadResults();
  }, [courseId, filters.academicYear, filters.semesterId, filters.type]);

  const overallPercentages = useMemo(() => {
    if (!results) {
      return {};
    }

    const total = results.totalResponses || 0;
    return scores.reduce((acc, score) => {
      acc[score] = total > 0 ? Number((((results.overallGradeDistribution?.[score] || 0) / total) * 100).toFixed(1)) : 0;
      return acc;
    }, {});
  }, [results]);

  const handleTypeChange = (type) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("type", type);
    setSearchParams(nextParams);
  };

  return (
    <LecturerLayout>
      <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link to="/lecturer/dashboard" className="font-semibold text-sky-700 hover:text-sky-900">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-slate-800">{results?.course?.course_name || "Module"}</span>
      </nav>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
            Loading evaluation results...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : (
          <>
            <div className="grid gap-5 rounded-3xl bg-sky-50 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">Evaluation Results</p>
                <h2 className="mt-3 text-3xl font-bold text-slate-950">
                  {results.course.course_code} - {results.course.course_name}
                </h2>
                <p className="mt-2 text-sm font-semibold text-slate-600">
                  {results.semester.semester_name} - {results.academicYear}
                </p>
              </div>
              <div className="rounded-3xl bg-white p-5 text-center shadow-sm">
                <p className="text-sm font-semibold text-slate-500">Total Responses</p>
                <p className="mt-2 text-4xl font-bold text-sky-700">{results.totalResponses}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {["theory", "practical"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleTypeChange(type)}
                  className={`rounded-2xl px-5 py-3 text-sm font-semibold capitalize transition ${
                    filters.type === type ? "bg-sky-700 text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {results.totalResponses === 0 ? (
              <div className="mt-8 rounded-2xl border border-amber-100 bg-amber-50 p-6 text-sm font-medium text-amber-800">
                No anonymous student responses have been submitted for this module and evaluation type yet.
              </div>
            ) : (
              <>
                <div className="mt-8 grid gap-5 xl:grid-cols-2">
                  {results.questions.map((question) => (
                    <article key={question.questionId} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <p className="text-sm font-bold text-sky-700">{question.label}</p>
                      <h3 className="mt-2 min-h-16 text-sm font-semibold leading-7 text-slate-900">{question.questionText}</h3>
                      <div className="mt-5 grid gap-5 sm:grid-cols-[180px_1fr] sm:items-center">
                        <div className="h-44">
                          <Pie data={buildChartData(question.distribution)} options={chartOptions} />
                        </div>
                        <DistributionLegend distribution={question.distribution} percentages={question.percentages} />
                      </div>
                    </article>
                  ))}
                </div>

                <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-xl font-bold text-slate-950">Overall Grade Distribution</h3>
                  <div className="mt-5 grid gap-5 md:grid-cols-[220px_1fr] md:items-center">
                    <div className="h-56">
                      <Pie data={buildChartData(results.overallGradeDistribution)} options={chartOptions} />
                    </div>
                    <DistributionLegend distribution={results.overallGradeDistribution} percentages={overallPercentages} />
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </section>
    </LecturerLayout>
  );
};

export default LecturerEvaluationResults;
