import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios.js";
import StudentLayout from "./StudentLayout.jsx";

const scaleOptions = [5, 4, 3, 2, 1];

const scaleLegend = [
  "5 = Strongly Agree",
  "4 = Agree",
  "3 = Average",
  "2 = Disagree",
  "1 = Strongly Disagree",
];

const typeLabel = {
  theory: "Theory",
  practical: "Practical",
};

const QuestionnaireForm = ({ type }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [course, setCourse] = useState(null);
  const [lecturer, setLecturer] = useState(null);
  const [responses, setResponses] = useState({});
  const [overallGrade, setOverallGrade] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [evaluationWindow, setEvaluationWindow] = useState(null);

  const selection = useMemo(() => {
    return {
      lecturerId: searchParams.get("lecturerId") || "",
      courseId: searchParams.get("courseId") || "",
      semesterId: searchParams.get("semesterId") || "",
      academicYear: searchParams.get("academicYear") || "",
    };
  }, [searchParams]);

  const hasSelection = Object.values(selection).every(Boolean);

  useEffect(() => {
    const loadQuestionnaire = async () => {
      if (!hasSelection) {
        setServerError("Please choose a course and lecturer before opening the questionnaire.");
        setLoading(false);
        return;
      }

      try {
        const [questionsRes, profileRes, courseRes, windowRes] = await Promise.all([
          api.get("/questions", { params: { type } }),
          api.get(`/student/lecturers/${selection.lecturerId}/profile`),
          api.get(`/student/courses/${selection.courseId}/lecturers`, {
            params: {
              semesterId: selection.semesterId,
              academicYear: selection.academicYear,
            },
          }),
          api.get("/student/evaluation-window", {
            params: {
              semesterId: selection.semesterId,
              academicYear: selection.academicYear,
            },
          }),
        ]);

        setQuestions(questionsRes.data.questions || []);
        setLecturer(profileRes.data.lecturer);
        setCourse(courseRes.data.course);
        setEvaluationWindow(windowRes.data);
      } catch (loadError) {
        setServerError(loadError.response?.data?.message || "Unable to load questionnaire.");
      } finally {
        setLoading(false);
      }
    };

    loadQuestionnaire();
  }, [hasSelection, selection.academicYear, selection.courseId, selection.lecturerId, selection.semesterId, type]);

  const handleResponseChange = (questionId, score) => {
    setResponses((current) => ({ ...current, [questionId]: score }));
    setErrors((current) => ({ ...current, questions: "", [`question_${questionId}`]: "" }));
  };

  const validate = () => {
    const nextErrors = {};

    if (questions.length !== 10) {
      nextErrors.questions = "The questionnaire must contain 10 active questions.";
    }

    for (const question of questions) {
      if (!responses[question.id]) {
        nextErrors[`question_${question.id}`] = "Please select a score.";
      }
    }

    if (!overallGrade) {
      nextErrors.overallGrade = "Please select an overall grade.";
    }

    if (!comment.trim()) {
      nextErrors.comment = "Please enter your comments.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError("");

    if (!validate()) {
      return;
    }

    if (!evaluationWindow?.isOpen) {
      setServerError(evaluationWindow?.message || "Evaluation is currently closed for this semester.");
      return;
    }

    setSubmitting(true);

    try {
      await api.post("/student/submissions", {
        lecturerId: Number(selection.lecturerId),
        courseId: Number(selection.courseId),
        semesterId: Number(selection.semesterId),
        academicYear: selection.academicYear,
        type,
        responses: questions.map((question) => ({
          questionId: question.id,
          score: Number(responses[question.id]),
        })),
        overallGrade: Number(overallGrade),
        comment: comment.trim(),
      });

      navigate("/student/evaluation/thank-you", { replace: true });
    } catch (submitError) {
      setServerError(submitError.response?.data?.message || "Unable to submit evaluation.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StudentLayout>
      <section className="rounded-3xl border border-teal-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-600">
              {typeLabel[type]} Questionnaire
            </p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950">Lecturer Evaluation</h2>
          </div>
          <Link
            to="/student/dashboard"
            className="inline-flex rounded-2xl border border-teal-200 px-5 py-3 text-sm font-semibold text-teal-700 transition hover:bg-teal-50"
          >
            Evaluate Another Lecturer
          </Link>
        </div>

        {loading ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
            Loading questionnaire...
          </div>
        ) : serverError && questions.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {serverError}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-8">
            <div className="grid gap-4 rounded-3xl bg-teal-50 p-5 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">Department</p>
                <p className="mt-2 font-bold text-slate-950">{course?.department_name || lecturer?.department || "Not available"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">Course Unit</p>
                <p className="mt-2 font-bold text-slate-950">
                  {course ? `${course.course_code} - ${course.course_name}` : "Not available"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">Lecturer Name</p>
                <p className="mt-2 font-bold text-slate-950">{lecturer?.name || "Not available"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">Evaluation Type</p>
                <p className="mt-2 font-bold text-slate-950">{typeLabel[type]}</p>
              </div>
            </div>

            <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
              evaluationWindow?.isOpen
                ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                : "border-amber-100 bg-amber-50 text-amber-800"
            }`}>
              {evaluationWindow?.isOpen
                ? `Evaluation is open from ${new Date(evaluationWindow.window.open_date).toLocaleString()} to ${new Date(evaluationWindow.window.close_date).toLocaleString()}.`
                : evaluationWindow?.message || "Evaluation is not open for this semester."}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-bold text-slate-950">Scale Legend</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {scaleLegend.map((item) => (
                  <span key={item} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {errors.questions && <p className="text-sm font-semibold text-red-600">{errors.questions}</p>}

            <div className="overflow-hidden rounded-3xl border border-slate-200">
              <div className="grid grid-cols-[1fr_260px] gap-4 bg-slate-900 px-5 py-4 text-sm font-semibold text-white max-lg:hidden">
                <span>Question</span>
                <span className="text-center">Score</span>
              </div>
              <div className="divide-y divide-slate-200">
                {questions.map((question, index) => (
                  <div key={question.id} className="grid gap-4 px-5 py-5 lg:grid-cols-[1fr_260px] lg:items-center">
                    <div>
                      <p className="text-sm font-semibold text-teal-700">{question.label || `Q${index + 1}`}</p>
                      <p className="mt-1 text-sm leading-7 text-slate-800">{question.question_text}</p>
                      {errors[`question_${question.id}`] && (
                        <p className="mt-2 text-xs font-semibold text-red-600">{errors[`question_${question.id}`]}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {scaleOptions.map((score) => (
                        <label
                          key={score}
                          className="flex h-11 cursor-pointer items-center justify-center rounded-2xl border border-slate-300 bg-white text-sm font-bold text-slate-700 transition has-[:checked]:border-teal-600 has-[:checked]:bg-teal-600 has-[:checked]:text-white"
                        >
                          <input
                            type="radio"
                            name={`question_${question.id}`}
                            value={score}
                            checked={responses[question.id] === String(score)}
                            onChange={(event) => handleResponseChange(question.id, event.target.value)}
                            className="sr-only"
                          />
                          {score}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-bold text-slate-950">Overall Grade</p>
                <div className="mt-4 grid grid-cols-5 gap-2">
                  {scaleOptions.map((score) => (
                    <label
                      key={score}
                      className="flex h-11 cursor-pointer items-center justify-center rounded-2xl border border-slate-300 bg-white text-sm font-bold text-slate-700 transition has-[:checked]:border-teal-600 has-[:checked]:bg-teal-600 has-[:checked]:text-white"
                    >
                      <input
                        type="radio"
                        name="overallGrade"
                        value={score}
                        checked={overallGrade === String(score)}
                        onChange={(event) => {
                          setOverallGrade(event.target.value);
                          setErrors((current) => ({ ...current, overallGrade: "" }));
                        }}
                        className="sr-only"
                      />
                      {score}
                    </label>
                  ))}
                </div>
                {errors.overallGrade && <p className="mt-2 text-xs font-semibold text-red-600">{errors.overallGrade}</p>}
              </div>

              <label className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <span className="text-sm font-bold text-slate-950">Comments</span>
                <textarea
                  value={comment}
                  onChange={(event) => {
                    setComment(event.target.value);
                    setErrors((current) => ({ ...current, comment: "" }));
                  }}
                  rows={5}
                  className="mt-4 w-full resize-none rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                  placeholder="Enter your comments..."
                />
                {errors.comment && <span className="mt-2 block text-xs font-semibold text-red-600">{errors.comment}</span>}
              </label>
            </div>

            {serverError && (
              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !evaluationWindow?.isOpen}
              className="rounded-2xl bg-teal-600 px-7 py-3 font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-wait disabled:bg-slate-400"
            >
              {submitting ? "Submitting..." : "Submit Evaluation"}
            </button>
          </form>
        )}
      </section>
    </StudentLayout>
  );
};

export default QuestionnaireForm;
