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
import { Link } from "react-router-dom";
import api from "../api/axios.js";
import DashboardAnnouncements from "../components/DashboardAnnouncements.jsx";
import HoDLayout from "../components/HoDLayout.jsx";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const sortValue = (row, key) => {
  if (key === "modules") {
    return row.modules.join(", ");
  }
  return row[key];
};

const HoDDashboard = () => {
  const [overview, setOverview] = useState(null);
  const [semesters, setSemesters] = useState([]);
  const [filters, setFilters] = useState({ semesterId: "", academicYear: "" });
  const [sortConfig, setSortConfig] = useState({ key: "overallScore", direction: "desc" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSemesters = async () => {
      try {
        const response = await api.get("/hod/semesters");
        const loadedSemesters = response.data.semesters || [];
        const activeSemester = loadedSemesters.find((semester) => Number(semester.is_active) === 1);
        const selected = activeSemester || loadedSemesters[0];
        setSemesters(loadedSemesters);
        if (selected) {
          setFilters({
            semesterId: String(selected.id),
            academicYear: selected.academic_year,
          });
        }
      } catch (loadError) {
        setError(loadError.response?.data?.message || "Unable to load semesters.");
        setLoading(false);
      }
    };

    loadSemesters();
  }, []);

  useEffect(() => {
    const loadOverview = async () => {
      if (!filters.semesterId || !filters.academicYear) {
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await api.get("/hod/department-overview", { params: filters });
        setOverview(response.data);
      } catch (loadError) {
        setError(loadError.response?.data?.message || "Unable to load department overview.");
      } finally {
        setLoading(false);
      }
    };

    loadOverview();
  }, [filters]);

  const sortedLecturers = useMemo(() => {
    const lecturers = [...(overview?.lecturers || [])];
    lecturers.sort((a, b) => {
      const aValue = sortValue(a, sortConfig.key);
      const bValue = sortValue(b, sortConfig.key);
      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
    return lecturers;
  }, [overview, sortConfig]);

  const chartData = {
    labels: (overview?.chartData || []).map((item) => item.name),
    datasets: [
      {
        label: "Average Score",
        data: (overview?.chartData || []).map((item) => item.averageScore),
        backgroundColor: "#d97706",
        borderRadius: 8,
      },
    ],
  };

  const handleSemesterChange = (event) => {
    const selected = semesters.find((semester) => String(semester.id) === event.target.value);
    setFilters({
      semesterId: event.target.value,
      academicYear: selected?.academic_year || "",
    });
  };

  const handleSort = (key) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleExport = async () => {
    const response = await api.get("/hod/export/department-report", {
      params: { ...filters, format: "csv" },
      responseType: "blob",
    });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = "hod-department-report.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const kpiCards = [
    { label: "Total Lecturers", value: overview?.kpis?.totalLecturers ?? 0 },
    { label: "Total Evaluations", value: overview?.kpis?.totalEvaluations ?? 0 },
    { label: "Average Score", value: overview?.kpis?.averageScore ?? 0 },
    { label: "Pending Reports", value: overview?.kpis?.pendingReports ?? 0 },
  ];

  return (
    <HoDLayout departmentName={overview?.department?.department_name}>
      <section className="rounded-3xl border border-amber-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">Department Analytics</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950">{overview?.department?.department_name || "HoD Dashboard"}</h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={filters.semesterId}
              onChange={handleSemesterChange}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
            >
              {semesters.map((semester) => (
                <option key={semester.id} value={semester.id}>
                  {semester.semester_name} - {semester.academic_year}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleExport}
              className="rounded-2xl bg-amber-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-700"
            >
              Export Report
            </button>
          </div>
        </div>

        {error && <div className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {kpiCards.map((card) => (
            <div key={card.label} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-500">{card.label}</p>
              <p className="mt-3 text-3xl font-bold text-amber-700">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-xl font-bold text-slate-950">Average Evaluation Score Per Lecturer</h3>
          <div className="mt-5 h-80">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-600">Loading analytics...</div>
            ) : (overview?.chartData || []).length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm font-medium text-amber-700">No lecturer evaluation data available.</div>
            ) : (
              <Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 5 } } }} />
            )}
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200">
          <div className="max-h-[32rem] overflow-y-auto overflow-x-hidden">
            <table className="w-full table-fixed text-left text-sm [&_td]:break-words [&_th]:break-words">
              <thead className="sticky top-0 z-10 bg-slate-900 text-white">
                <tr>
                  {[
                    ["name", "Name"],
                    ["modules", "Module(s)"],
                    ["theoryScore", "Theory Score"],
                    ["practicalScore", "Practical Score"],
                    ["overallScore", "Overall Score"],
                    ["reportsSubmitted", "Reports Submitted"],
                  ].map(([key, label]) => (
                    <th key={key} className="px-5 py-4 font-semibold">
                      <button type="button" onClick={() => handleSort(key)}>{label}</button>
                    </th>
                  ))}
                  <th className="w-40 px-5 py-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedLecturers.map((lecturer) => (
                  <tr key={lecturer.lecturerId} className="border-t border-slate-100">
                    <td className="px-5 py-4 font-semibold text-slate-950">{lecturer.name}</td>
                    <td className="px-5 py-4 text-slate-600">{lecturer.modules.join(", ") || "No modules"}</td>
                    <td className="px-5 py-4 text-slate-600">{lecturer.theoryScore}</td>
                    <td className="px-5 py-4 text-slate-600">{lecturer.practicalScore}</td>
                    <td className="px-5 py-4 font-bold text-amber-700">{lecturer.overallScore}</td>
                    <td className="px-5 py-4 text-slate-600">{lecturer.reportsSubmitted}</td>
                    <td className="w-40 px-5 py-4 whitespace-nowrap">
                      <Link
                        to={`/hod/lecturers/${lecturer.lecturerId}?semesterId=${filters.semesterId}&academicYear=${encodeURIComponent(filters.academicYear)}`}
                        className="inline-flex min-w-[7rem] justify-center whitespace-nowrap rounded-full border border-amber-200 px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <div className="mt-6">
        <DashboardAnnouncements accent="amber" />
      </div>
    </HoDLayout>
  );
};

export default HoDDashboard;
