import { Link } from "react-router-dom";
import StudentLayout from "../components/StudentLayout.jsx";

const EvaluationThankYou = () => {
  return (
    <StudentLayout>
      <section className="mx-auto max-w-3xl rounded-3xl border border-teal-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-teal-600 text-2xl font-bold text-white">
          OK
        </div>
        <h2 className="mt-6 text-4xl font-bold text-slate-950">Thank You!</h2>
        <p className="mt-4 text-base leading-7 text-slate-600">
          Your evaluation has been submitted successfully.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/student/dashboard"
            className="rounded-2xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            Evaluate Another Lecturer
          </Link>
          <Link
            to="/student/dashboard"
            className="rounded-2xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            Return to Home
          </Link>
        </div>
      </section>
    </StudentLayout>
  );
};

export default EvaluationThankYou;
