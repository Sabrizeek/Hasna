import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios.js";
import StudentLayout from "../components/StudentLayout.jsx";

const evaluationTypes = [
  {
    type: "theory",
    icon: "T",
    title: "Theory",
    description: "Evaluate lecture delivery, clarity, organization, communication, and overall teaching quality.",
  },
  {
    type: "practical",
    icon: "P",
    title: "Practical",
    description: "Evaluate lab organization, demonstrations, safety, guidance, feedback, and practical learning outcomes.",
  },
];

const EvaluationTypeSelection = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [checkingType, setCheckingType] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectionParams = useMemo(() => {
    return {
      lecturerId: searchParams.get("lecturerId") || "",
      courseId: searchParams.get("courseId") || "",
      semesterId: searchParams.get("semesterId") || "",
      academicYear: searchParams.get("academicYear") || "",
    };
  }, [searchParams]);

  const hasSelection = Object.values(selectionParams).every(Boolean);

  const handleStart = async (type) => {
    setMessage("");
    setError("");

    if (!hasSelection) {
      setError("Please choose a course and lecturer from the student dashboard first.");
      return;
    }

    setCheckingType(type);

    try {
      const windowResponse = await api.get("/student/evaluation-window", {
        params: {
          semesterId: selectionParams.semesterId,
          academicYear: selectionParams.academicYear,
        },
      });

      if (!windowResponse.data.isOpen) {
        setError(windowResponse.data.message || "Evaluation is currently closed for this semester.");
        return;
      }

      const response = await api.get("/student/submissions/check", {
        params: {
          ...selectionParams,
          type,
        },
      });

      if (response.data.alreadySubmitted) {
        setMessage(`You have already submitted the ${type} evaluation for this lecturer and course.`);
        return;
      }

      const params = new URLSearchParams({
        ...selectionParams,
        type,
      });
      navigate(`/student/questionnaire/${type}?${params.toString()}`);
    } catch (checkError) {
      setError(checkError.response?.data?.message || "Unable to check your previous submission.");
    } finally {
      setCheckingType("");
    }
  };

  return (
    <StudentLayout>
      <section className="rounded-3xl border border-teal-100 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-600">Evaluation Type</p>
        <h2 className="mt-3 text-3xl font-bold text-slate-950">Choose the evaluation form</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
          Select the questionnaire type that matches the teaching activity you want to evaluate.
        </p>

        {message && (
          <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-5">
            <p className="text-sm font-semibold text-amber-800">{message}</p>
            <button
              type="button"
              onClick={() => navigate("/student/dashboard")}
              className="mt-4 rounded-2xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
            >
              Evaluate Another Lecturer
            </button>
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {evaluationTypes.map((item) => (
            <article key={item.type} className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-2xl font-bold text-white">
                {item.icon}
              </div>
              <h3 className="mt-5 text-2xl font-bold text-slate-950">{item.title}</h3>
              <p className="mt-3 min-h-20 text-sm leading-7 text-slate-600">{item.description}</p>
              <button
                type="button"
                onClick={() => handleStart(item.type)}
                disabled={checkingType === item.type}
                className="mt-6 w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-wait disabled:bg-slate-400"
              >
                {checkingType === item.type ? "Checking..." : "Start"}
              </button>
            </article>
          ))}
        </div>
      </section>
    </StudentLayout>
  );
};

export default EvaluationTypeSelection;
