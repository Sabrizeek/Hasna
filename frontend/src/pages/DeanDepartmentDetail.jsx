import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import { useEffect, useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import SearchableSelect from "../components/SearchableSelect";
import { Link, useParams, useSearchParams } from "react-router-dom";
import api from "../api/axios.js";
import DeanLayout from "../components/DeanLayout.jsx";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const DeanDepartmentDetail = () => {
  const { departmentId } = useParams();
  const [searchParams] = useSearchParams();
  const [semesters, setSemesters] = useState([]);
  const [filters, setFilters] = useState({
    semesterId: searchParams.get("semesterId") || "",
    academicYear: searchParams.get("academicYear") || "",
  });
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSemesters = async () => {
      const response = await api.get("/dean/semesters");
      setSemesters(response.data.semesters || []);
    };
    loadSemesters();
  }, []);

  useEffect(() => {
    const loadDetails = async () => {
      if (!filters.semesterId || !filters.academicYear) return;
      setLoading(true);
      setError("");
      try {
        const response = await api.get(`/dean/department/${departmentId}`, { params: filters });
        setDetails(response.data);
      } catch (loadError) {
        setError(loadError.response?.data?.message || "Unable to load department details.");
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [departmentId, filters]);

  const sortedLecturers = useMemo(() => {
    return [...(details?.lecturers || [])].sort((a, b) => b.overallScore - a.overallScore || a.name.localeCompare(b.name));
  }, [details]);

  const chartData = {
    labels: sortedLecturers.map((lecturer) => lecturer.name),
    datasets: [
      {
        label: "Overall Score",
        data: sortedLecturers.map((lecturer) => lecturer.overallScore),
        backgroundColor: "#ea580c",
        borderRadius: 8,
      },
    ],
  };

  const handleSemesterChange = (event) => {
    const selected = semesters.find((semester) => String(semester.id) === event.target.value);
    setFilters({ semesterId: event.target.value, academicYear: selected?.academic_year || "" });
  };

  const downloadDepartmentReport = async () => {
    const response = await api.get(`/dean/export/department-report/${departmentId}`, {
      params: { ...filters, format: "csv" },
      responseType: "blob",
    });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = "dean-department-report.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <DeanLayout>
      <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
        <Link to="/dean/dashboard" className="font-semibold text-orange-700 hover:text-orange-900">Dean Dashboard</Link>
        <span>/</span>
        <span className="text-slate-800">{details?.department?.department_name || "Department"}</span>
      </nav>

      <section className="mt-6 rounded-3xl border border-orange-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <Link to="/dean/dashboard" className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 mt-1 shrink-0">
              &larr; Back
            </Link>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-700">Department Drill-Down</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-950">{details?.department?.department_name || "Department"}</h2>
              <p className="mt-2 text-sm text-slate-600">HoD: {details?.hod?.name || "Not assigned"}</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="w-full sm:w-64">
              <SearchableSelect
                options={semesters.map((semester) => ({
                  value: semester.id,
                  label: `${semester.semester_name?.trim()} - ${semester.academic_year?.trim()}`
                }))}
                value={filters.semesterId}
                onChange={handleSemesterChange}
                placeholder="Select Semester"
              />
            </div>
            <button onClick={downloadDepartmentReport} className="w-full sm:w-auto rounded-2xl bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-700 whitespace-nowrap text-center">
              Download Department Report
            </button>
          </div>
        </div>

        {error && <div className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

        <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-xl font-bold text-slate-950">Lecturers by Average Score</h3>
          <div className="mt-5 h-[350px] sm:h-[400px] w-full">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-600">Loading department analytics...</div>
            ) : sortedLecturers.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm font-medium text-orange-700">No lecturer data available.</div>
            ) : (
              <Bar
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: {
                      ticks: {
                        callback: function(value) {
                          const label = this.getLabelForValue(value);
                          return label.length > 12 ? label.substring(0, 12) + "..." : label;
                        }
                      }
                    },
                    y: { min: 0, max: 100 }
                  }
                }}
              />
            )}
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200">
          <div className="max-h-[32rem] overflow-x-auto overflow-y-auto">
            <table className="w-full text-left text-sm" style={{minWidth:'860px'}}>
              <thead className="sticky top-0 z-10 bg-slate-900 text-white">
                <tr>
                  <th className="px-5 py-4 font-semibold">Name</th>
                  <th className="px-5 py-4 font-semibold">Department</th>
                  <th className="px-5 py-4 font-semibold">Student Eval Score</th>
                  <th className="px-5 py-4 font-semibold">Peer Eval Score</th>
                  <th className="px-5 py-4 font-semibold">Mentoring</th>
                  <th className="px-5 py-4 font-semibold">Supervision</th>
                  <th className="px-5 py-4 font-semibold">Other</th>
                  <th className="px-5 py-4 font-semibold">Total Evals</th>
                  <th className="px-5 py-4 font-semibold">Overall Score</th>
                  <th className="w-32 px-5 py-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedLecturers.map((lecturer) => (
                  <tr key={lecturer.lecturerId} className="border-t border-slate-100">
                    <td className="px-5 py-4 font-semibold text-slate-950">{lecturer.name}</td>
                    <td className="px-5 py-4 text-slate-600">{lecturer.department}</td>
                    <td className="px-5 py-4 text-slate-600">{lecturer.studentEvaluationScore ? `${lecturer.studentEvaluationScore}%` : "-"}</td>
                    <td className="px-5 py-4 font-bold text-orange-700">{lecturer.peerEvaluationScore ? `${lecturer.peerEvaluationScore}` : "-"}</td>
                    <td className="px-5 py-4 text-slate-600">{lecturer.mentoringScore ? `${lecturer.mentoringScore}` : "-"}</td>
                    <td className="px-5 py-4 text-slate-600">{lecturer.supervisionScore ? `${lecturer.supervisionScore}` : "-"}</td>
                    <td className="px-5 py-4 text-slate-600">{lecturer.otherScore ? `${lecturer.otherScore}` : "-"}</td>
                    <td className="px-5 py-4 text-slate-600">{lecturer.totalEvaluations}</td>
                    <td className="px-5 py-4 font-bold text-brandBlue">{lecturer.overallScore ? `${lecturer.overallScore}%` : "-"}</td>
                    <td className="w-32 px-5 py-4 whitespace-nowrap">
                      <Link
                        to={`/dean/lecturers/${lecturer.lecturerId}?semesterId=${filters.semesterId}&academicYear=${encodeURIComponent(filters.academicYear)}`}
                        className="inline-flex min-w-[5rem] justify-center whitespace-nowrap rounded-full border border-orange-200 px-4 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-50"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </DeanLayout>
  );
};

export default DeanDepartmentDetail;
