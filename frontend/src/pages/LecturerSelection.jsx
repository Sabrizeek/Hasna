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

const LecturerSelection = () => {
  const { courseId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [lecturers, setLecturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const selectionParams = useMemo(() => {
    return {
      semesterId: searchParams.get("semesterId") || "",
      academicYear: searchParams.get("academicYear") || "",
      departmentId: searchParams.get("departmentId") || "",
    };
  }, [searchParams]);

  useEffect(() => {
    const loadLecturers = async () => {
      if (!selectionParams.semesterId || !selectionParams.academicYear) {
        setError("Please choose a course from the student dashboard first.");
        setLoading(false);
        return;
      }

      try {
        const response = await api.get(`/student/courses/${courseId}/lecturers`, {
          params: {
            semesterId: selectionParams.semesterId,
            academicYear: selectionParams.academicYear,
          },
        });

        setCourse(response.data.course);
        setLecturers(response.data.lecturers || []);
      } catch (loadError) {
        setError(loadError.response?.data?.message || "Unable to load lecturers for this course.");
      } finally {
        setLoading(false);
      }
    };

    loadLecturers();
  }, [courseId, selectionParams.academicYear, selectionParams.semesterId]);

  const handleSelect = (lecturerId) => {
    const params = new URLSearchParams({
      courseId,
      semesterId: selectionParams.semesterId,
      academicYear: selectionParams.academicYear,
      departmentId: selectionParams.departmentId || String(course?.department_id || ""),
    });

    navigate(`/student/lecturers/${lecturerId}/profile?${params.toString()}`);
  };

  return (
    <StudentLayout>
      <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link to="/student/dashboard" className="font-semibold text-teal-700 hover:text-teal-900">
          Home
        </Link>
        <span>/</span>
        <span>{course?.department_name || "Department"}</span>
        <span>/</span>
        <span className="text-slate-800">{course?.course_code || "Course"}</span>
      </nav>

      <div className="mt-6 rounded-3xl border border-teal-100 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-600">
          {course?.semester_name || "Semester"} {selectionParams.academicYear ? `- ${selectionParams.academicYear}` : ""}
        </p>
        <h2 className="mt-3 text-3xl font-bold text-slate-950">
          Lecturers for {course ? `${course.course_code} - ${course.course_name}` : "Selected Course"}
        </h2>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
            Loading lecturers...
          </div>
        ) : lecturers.length === 0 && !error ? (
          <div className="mt-8 rounded-2xl border border-amber-100 bg-amber-50 p-6 text-sm font-medium text-amber-800">
            No lecturers are assigned to this course unit for the selected semester yet.
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {lecturers.map((lecturer) => (
              <article key={lecturer.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start gap-4">
                  {lecturer.photo_url ? (
                    <img
                      src={lecturer.photo_url}
                      alt={lecturer.full_name}
                      className="h-16 w-16 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-100 text-lg font-bold text-teal-800">
                      {initialsFromName(lecturer.full_name)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-lg font-bold text-slate-950">{lecturer.full_name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{lecturer.designation || "Lecturer"}</p>
                  </div>
                </div>

                <div className="mt-5 inline-flex max-w-full rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                  <span className="truncate">{lecturer.department_name || course?.department_name || "Faculty of Science"}</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleSelect(lecturer.id)}
                  className="mt-5 w-full rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
                >
                  Select
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  );
};

export default LecturerSelection;
