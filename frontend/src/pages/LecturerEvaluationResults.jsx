import { ArcElement, Chart as ChartJS, Legend, Tooltip } from "chart.js";
import { useEffect, useMemo, useState } from "react";
import { Pie } from "react-chartjs-2";
import { Link, useParams, useSearchParams } from "react-router-dom";
import api from "../api/axios.js";
import LecturerLayout from "../components/LecturerLayout.jsx";

ChartJS.register(ArcElement, Tooltip, Legend);

const scores = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
const scoreLabels = {
  10: "Exceptional",
  9: "Outstanding",
  8: "Excellent",
  7: "Very Good",
  6: "Good",
  5: "Satisfactory",
  4: "Adequate",
  3: "Needs Improvement",
  2: "Poor",
  1: "Unacceptable",
};
const chartColors = [
  "#064e3b", "#0f766e", "#0369a1", "#0284c7", "#1d4ed8", 
  "#6366f1", "#d97706", "#f59e0b", "#f97316", "#dc2626"
];

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
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [summaryResult, setSummaryResult] = useState(null);

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
    if (!results || !results.overallGradeDistribution) {
      return {};
    }

    const total = results.totalResponses || 0;
    const dist = results.overallGradeDistribution;
    return Object.keys(dist).reduce((acc, bucket) => {
      acc[bucket] = total > 0 ? Number(((dist[bucket] / total) * 100).toFixed(1)) : 0;
      return acc;
    }, {});
  }, [results]);

  const buildOverallChartData = (distribution) => {
    const buckets = ["90-100%", "80-89%", "70-79%", "60-69%", "<60%"];
    const colors = ["#0f766e", "#0284c7", "#f59e0b", "#f97316", "#dc2626"];
    return {
      labels: buckets,
      datasets: [
        {
          data: buckets.map((b) => distribution?.[b] || 0),
          backgroundColor: colors,
          borderColor: "#ffffff",
          borderWidth: 2,
        },
      ],
    };
  };

  const OverallDistributionLegend = ({ distribution, percentages }) => {
    const buckets = ["90-100%", "80-89%", "70-79%", "60-69%", "<60%"];
    const colors = ["#0f766e", "#0284c7", "#f59e0b", "#f97316", "#dc2626"];
    return (
      <div className="space-y-2">
        {buckets.map((bucket, index) => (
          <div key={bucket} className="flex items-center justify-between gap-3 text-xs">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: colors[index] }} />
              <span className="truncate font-semibold text-slate-700">{bucket}</span>
            </div>
            <span className="font-bold text-slate-950">
              {distribution?.[bucket] || 0} ({percentages?.[bucket] || 0}%)
            </span>
          </div>
        ))}
      </div>
    );
  };

  const handleTypeChange = (type) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("type", type);
    setSearchParams(nextParams);
    setSummaryResult(null);
    setSummaryError("");
  };

  const summarizeComments = async () => {
    setSummaryLoading(true);
    setSummaryError("");
    setSummaryResult(null);

    try {
      const response = await api.post("/lecturer/comments/summarize", {
        courseId: Number(courseId),
        semesterId: Number(filters.semesterId),
        academicYear: filters.academicYear,
        type: filters.type,
      });
      setSummaryResult(response.data);
    } catch (summaryRequestError) {
      setSummaryError(summaryRequestError.response?.data?.message || "Unable to summarize comments right now. Please try again later.");
    } finally {
      setSummaryLoading(false);
    }
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
                <div className="mt-8 max-h-[44rem] overflow-y-auto pr-2">
                  <div className="grid gap-5 xl:grid-cols-2">
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
                </div>

                <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-slate-950">Overall Grade Distribution</h3>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-500">Average Overall</p>
                      <p className="text-2xl font-bold text-sky-700">{results.averageOverallGrade}%</p>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-5 md:grid-cols-[220px_1fr] md:items-center">
                    <div className="h-56">
                      <Pie data={buildOverallChartData(results.overallGradeDistribution)} options={chartOptions} />
                    </div>
                    <OverallDistributionLegend distribution={results.overallGradeDistribution} percentages={overallPercentages} />
                  </div>
                </div>

                <div className="mt-8 rounded-3xl border border-violet-100 bg-violet-50 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-violet-700">Student Comments Summary</p>
                      <h3 className="mt-2 text-xl font-bold text-slate-950">AI-Assisted Feedback Summary</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Summarizes anonymous student comments for this module and evaluation type.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={summarizeComments}
                      disabled={summaryLoading}
                      className="rounded-2xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:cursor-wait disabled:bg-violet-300"
                    >
                      {summaryLoading ? "Summarizing comments..." : "Summarize Comments"}
                    </button>
                  </div>

                  {summaryError && (
                    <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
                      {summaryError}
                    </div>
                  )}

                  {summaryResult && (
                    <div className="mt-5 rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-bold text-violet-700">
                          {summaryResult.totalComments || 0} comments summarized
                        </p>
                        {summaryResult.generatedAt && (
                          <p className="text-xs font-semibold text-slate-400">
                            Generated {new Date(summaryResult.generatedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">{summaryResult.summary}</p>
                      <p className="mt-3 rounded-2xl bg-violet-50 px-4 py-3 text-xs font-semibold leading-5 text-violet-700">
                        AI summary is generated from anonymous student comments only. Please review original anonymous comments for full context.
                      </p>

                      <div className="mt-5 grid gap-4 lg:grid-cols-3">
                        <div className="rounded-2xl bg-emerald-50 p-4">
                          <h4 className="font-bold text-emerald-700">Key Strengths</h4>
                          <ul className="mt-3 space-y-2 text-sm text-slate-700">
                            {(summaryResult.keyStrengths || []).map((item, index) => <li key={index}>{item}</li>)}
                            {(summaryResult.keyStrengths || []).length === 0 && <li>No key strengths detected yet.</li>}
                          </ul>
                        </div>
                        <div className="rounded-2xl bg-amber-50 p-4">
                          <h4 className="font-bold text-amber-700">Improvement Areas</h4>
                          <ul className="mt-3 space-y-2 text-sm text-slate-700">
                            {(summaryResult.improvementAreas || []).map((item, index) => <li key={index}>{item}</li>)}
                            {(summaryResult.improvementAreas || []).length === 0 && <li>No recurring improvement area detected yet.</li>}
                          </ul>
                        </div>
                        <div className="rounded-2xl bg-sky-50 p-4">
                          <h4 className="font-bold text-sky-700">Common Themes</h4>
                          <ul className="mt-3 space-y-2 text-sm text-slate-700">
                            {(summaryResult.commonThemes || []).map((item, index) => <li key={index}>{item}</li>)}
                            {(summaryResult.commonThemes || []).length === 0 && <li>No common themes detected yet.</li>}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-slate-950">Anonymous Student Comments</h3>
                      <p className="mt-1 text-sm text-slate-500">Student identities are hidden in lecturer reports.</p>
                    </div>
                    <span className="rounded-full bg-sky-50 px-4 py-2 text-sm font-bold text-sky-700">
                      {results.comments?.length || 0} comments
                    </span>
                  </div>

                  {!results.comments || results.comments.length === 0 ? (
                    <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-5 text-sm font-medium text-amber-800">
                      No written comments have been submitted for this module and evaluation type yet.
                    </div>
                  ) : (
                    <div className="mt-5 max-h-96 space-y-3 overflow-y-auto pr-2">
                      {results.comments.map((comment, index) => (
                        <article key={`${comment.submittedAt}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{comment.commentText}</p>
                          <p className="mt-3 text-xs font-semibold text-slate-400">
                            Submitted {new Date(comment.submittedAt).toLocaleString()}
                          </p>
                        </article>
                      ))}
                    </div>
                  )}
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
