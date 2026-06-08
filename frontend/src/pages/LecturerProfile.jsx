import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "../api/axios.js";
import StudentLayout from "../components/StudentLayout.jsx";

const initialsFromName = (name = "") => {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "LE";
};

const LecturerProfile = () => {
  const { lecturerId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [lecturer, setLecturer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const selectionParams = useMemo(() => {
    return {
      courseId: searchParams.get("courseId") || "",
      semesterId: searchParams.get("semesterId") || "",
      academicYear: searchParams.get("academicYear") || "",
      departmentId: searchParams.get("departmentId") || "",
    };
  }, [searchParams]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await api.get(`/student/lecturers/${lecturerId}/profile`);
        setLecturer(response.data.lecturer);
      } catch (loadError) {
        setError(loadError.response?.data?.message || "Unable to load lecturer profile.");
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [lecturerId]);

  const handleStartEvaluation = () => {
    const params = new URLSearchParams({
      lecturerId,
      courseId: selectionParams.courseId,
      semesterId: selectionParams.semesterId,
      academicYear: selectionParams.academicYear,
    });

    navigate(`/student/evaluation-type?${params.toString()}`);
  };

  return (
    <StudentLayout>
      <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link to="/student/dashboard" className="font-semibold text-teal-700 hover:text-teal-900">
          Home
        </Link>
        <span>/</span>
        <button type="button" onClick={() => navigate(-1)} className="font-semibold text-teal-700 hover:text-teal-900">
          Lecturers
        </button>
        <span>/</span>
        <span className="text-slate-800">Profile</span>
      </nav>

      <section className="mt-6 rounded-3xl border border-teal-100 bg-white p-6 shadow-sm sm:p-8">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
            Loading lecturer profile...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
            <div className="flex flex-col items-center rounded-3xl bg-teal-50 p-6 text-center">
              {lecturer.photo_url ? (
                <img
                  src={lecturer.photo_url}
                  alt={lecturer.name}
                  className="h-40 w-40 rounded-3xl object-cover shadow-sm"
                />
              ) : (
                <div className="flex h-40 w-40 items-center justify-center rounded-3xl bg-teal-600 text-4xl font-bold text-white shadow-sm">
                  {initialsFromName(lecturer.name)}
                </div>
              )}
              <span className="mt-5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-teal-700 shadow-sm">
                {lecturer.department || "Faculty of Science"}
              </span>
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-600">Lecturer Profile</p>
              <h2 className="mt-3 text-3xl font-bold text-slate-950">{lecturer.name}</h2>
              <p className="mt-2 text-sm text-slate-500">{lecturer.email}</p>

              <div className="mt-8 grid gap-5 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-500">Department</p>
                  <p className="mt-2 font-bold text-slate-900">{lecturer.department || "Not specified"}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-sm font-semibold text-slate-500">Designation</p>
                  <p className="mt-2 font-bold text-slate-900">{lecturer.designation || "Lecturer"}</p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-500">Qualifications</p>
                <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-700">
                  {lecturer.qualifications || "Qualifications have not been added yet."}
                </p>
              </div>

              <button
                type="button"
                onClick={handleStartEvaluation}
                disabled={!selectionParams.courseId || !selectionParams.semesterId || !selectionParams.academicYear}
                className="mt-8 rounded-2xl bg-teal-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Start Evaluation
              </button>
            </div>
          </div>
        )}
      </section>
    </StudentLayout>
  );
};

export default LecturerProfile;
