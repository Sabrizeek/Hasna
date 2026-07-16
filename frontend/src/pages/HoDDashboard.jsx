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
import { Link } from "react-router-dom";
import api from "../api/axios.js";
import DashboardAnnouncements from "../components/DashboardAnnouncements.jsx";
import HoDLayout from "../components/HoDLayout.jsx";
import { useAuth } from "../context/AuthContext.jsx";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const sortValue = (row, key) => {
  if (key === "modules") {
    return row.modules.join(", ");
  }
  return row[key];
};

const HoDDashboard = () => {
  const { user } = useAuth();
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
        setSemesters(loadedSemesters);
        
        const savedSemesterId = localStorage.getItem('hodSelectedSemester');
        if (savedSemesterId !== null) {
          if (savedSemesterId === "") {
            setFilters({ semesterId: "", academicYear: "" });
          } else {
            const selected = loadedSemesters.find((s) => String(s.id) === savedSemesterId);
            if (selected) {
              setFilters({ semesterId: String(selected.id), academicYear: selected.academic_year });
            } else {
              const activeSemester = loadedSemesters.find((semester) => Number(semester.is_active) === 1);
              setFilters(activeSemester ? { semesterId: String(activeSemester.id), academicYear: activeSemester.academic_year } : { semesterId: "", academicYear: "" });
            }
          }
        } else {
          const activeSemester = loadedSemesters.find((semester) => Number(semester.is_active) === 1);
          if (activeSemester) {
            setFilters({ semesterId: String(activeSemester.id), academicYear: activeSemester.academic_year });
          } else {
            setFilters({ semesterId: "", academicYear: "" });
          }
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
      // Allow loading with empty semesterId to show all semesters
      setLoading(true);
      setError("");

      try {
        const params = {};
        if (filters.semesterId) params.semesterId = filters.semesterId;
        if (filters.academicYear) params.academicYear = filters.academicYear;
        const response = await api.get("/hod/department-overview", { params });
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
    if (event.target.value === "") {
      setFilters({ semesterId: "", academicYear: "" });
      localStorage.setItem('hodSelectedSemester', "");
    } else {
      const selected = semesters.find((semester) => String(semester.id) === event.target.value);
      setFilters({
        semesterId: event.target.value,
        academicYear: selected?.academic_year || "",
      });
      localStorage.setItem('hodSelectedSemester', event.target.value);
    }
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
    { label: "Average Score", value: overview?.kpis?.averageScore != null ? `${overview.kpis.averageScore}%` : "0%" },
    { label: "Pending Reports", value: overview?.kpis?.pendingReports ?? 0 },
  ];

  return (
    <HoDLayout departmentName={overview?.department?.department_name}>
      <div className="mb-6 sm:mb-8">
        <p className="text-sm font-semibold uppercase tracking-widest text-amber-700">Welcome Back</p>
        <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">{user?.full_name}</h2>
        <p className="mt-2 text-sm text-slate-600">Head of Department • {overview?.department?.department_name || user?.department_name || "Department"}</p>
      </div>

      <section className="rounded-3xl border border-amber-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="w-full sm:w-64">
              <SearchableSelect
                options={[
                  { value: "", label: "All Semesters" },
                  ...semesters.map((semester) => ({
                    value: semester.id,
                    label: `${semester.semester_name?.trim()} - ${semester.academic_year?.trim()}`
                  }))
                ]}
                value={filters.semesterId}
                onChange={handleSemesterChange}
                placeholder="Select Semester"
              />
            </div>
            <button
              type="button"
              onClick={handleExport}
              className="w-full sm:w-auto rounded-2xl bg-amber-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-700 whitespace-nowrap text-center"
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
          <div className="mt-5 h-[350px] sm:h-[400px] w-full">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-600">Loading analytics...</div>
            ) : (overview?.chartData || []).length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm font-medium text-amber-700">No lecturer evaluation data available.</div>
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
            <table className="w-full text-left text-sm" style={{minWidth:'900px'}}>
              <thead className="sticky top-0 z-10 bg-slate-900 text-white">
                <tr>
                  {[
                    ["name", "Name"],
                    ["modules", "Module(s)"],
                    ["studentEvaluationScore", "Student Eval Score"],
                    ["peerEvaluationScore", "Peer Eval Score"],
                    ["mentoringScore", "Mentoring"],
                    ["supervisionScore", "Supervision"],
                    ["otherScore", "Other"],
                    ["reportsSubmitted", "Reports Submitted"],
                    ["overallScore", "Overall Score"],
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
                    <td className="px-5 py-4 text-slate-600">{lecturer.studentEvaluationScore ? `${lecturer.studentEvaluationScore}%` : "-"}</td>
                    <td className="px-5 py-4 font-bold text-brandBlue">{lecturer.peerEvaluationScore ? `${lecturer.peerEvaluationScore}` : "-"}</td>
                    <td className="px-5 py-4 text-slate-600">{lecturer.mentoringScore ? `${lecturer.mentoringScore}` : "-"}</td>
                    <td className="px-5 py-4 text-slate-600">{lecturer.supervisionScore ? `${lecturer.supervisionScore}` : "-"}</td>
                    <td className="px-5 py-4 text-slate-600">{lecturer.otherScore ? `${lecturer.otherScore}` : "-"}</td>
                    <td className="px-5 py-4 text-slate-600">{lecturer.reportsSubmitted}</td>
                    <td className="px-5 py-4 font-bold text-amber-700">{lecturer.overallScore ? `${lecturer.overallScore}%` : "-"}</td>
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
