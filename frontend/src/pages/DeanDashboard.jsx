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
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios.js";
import DashboardAnnouncements from "../components/DashboardAnnouncements.jsx";
import DeanLayout from "../components/DeanLayout.jsx";
import { useAuth } from "../context/AuthContext.jsx";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const DeanDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [semesters, setSemesters] = useState([]);
  const [filters, setFilters] = useState({ semesterId: "", academicYear: "" });
  const [isSemestersLoaded, setIsSemestersLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSemesters = async () => {
      try {
        const response = await api.get("/dean/semesters");
        const loaded = response.data.semesters || [];
        setSemesters(loaded);
        
        const savedSemesterId = localStorage.getItem('deanSelectedSemester');
        if (savedSemesterId !== null) {
          if (savedSemesterId === "") {
            setFilters({ semesterId: "", academicYear: "" });
          } else {
            const selected = loaded.find((s) => String(s.id) === savedSemesterId);
            if (selected) {
              setFilters({ semesterId: String(selected.id), academicYear: selected.academic_year });
            } else {
              const activeSemester = loaded.find((semester) => Number(semester.is_active) === 1);
              setFilters(activeSemester ? { semesterId: String(activeSemester.id), academicYear: activeSemester.academic_year } : { semesterId: "", academicYear: "" });
            }
          }
        } else {
          const activeSemester = loaded.find((semester) => Number(semester.is_active) === 1);
          if (activeSemester) {
            setFilters({ semesterId: String(activeSemester.id), academicYear: activeSemester.academic_year });
          } else {
            setFilters({ semesterId: "", academicYear: "" });
          }
        }
      } catch (loadError) {
        setError(loadError.response?.data?.message || "Unable to load semesters.");
        setLoading(false);
      } finally {
        setIsSemestersLoaded(true);
      }
    };

    loadSemesters();
  }, []);

  useEffect(() => {
    if (!isSemestersLoaded) return;
    
    const controller = new AbortController();
    const loadOverview = async () => {
      // Allow loading with empty semesterId to show all semesters
      setLoading(true);
      setError("");
      try {
        const response = await api.get("/dean/faculty-overview", { params: filters, signal: controller.signal });
        if (!controller.signal.aborted) {
          setOverview(response.data);
        }
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError.response?.data?.message || "Unable to load faculty overview.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadOverview();
    return () => controller.abort();
  }, [filters, isSemestersLoaded]);

  const chartData = useMemo(() => ({
    labels: (overview?.departmentAverages || []).map((department) => department.departmentName),
    datasets: [
      {
        label: "Average Score",
        data: (overview?.departmentAverages || []).map((department) => department.averageScore),
        backgroundColor: "#ea580c",
        borderRadius: 8,
      },
    ],
  }), [overview]);

  const handleSemesterChange = (event) => {
    if (event.target.value === "") {
      setFilters({ semesterId: "", academicYear: "" });
      localStorage.setItem('deanSelectedSemester', "");
    } else {
      const selected = semesters.find((semester) => String(semester.id) === event.target.value);
      setFilters({ semesterId: event.target.value, academicYear: selected?.academic_year || "" });
      localStorage.setItem('deanSelectedSemester', event.target.value);
    }
  };

  const downloadFacultyReport = async () => {
    const response = await api.get("/dean/export/faculty-report", {
      params: { ...filters, format: "csv" },
      responseType: "blob",
    });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = "dean-faculty-report.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const kpiCards = [
    ["Total Lecturers", overview?.kpis?.totalLecturers || 0],
    ["Total Evaluations Completed", overview?.kpis?.totalEvaluationsCompleted || 0],
    ["Faculty Average Score", overview?.kpis?.facultyAverageScore != null ? overview.kpis.facultyAverageScore : "0"],
    ["Departments Evaluated", overview?.kpis?.departmentsEvaluated || 0],
  ];

  const PerformerCards = ({ title, items }) => (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-bold text-slate-950">{title}</h3>
      <div className="mt-5 space-y-3">
        {items.length === 0 ? (
          <p className="rounded-2xl bg-orange-50 p-4 text-sm font-medium text-orange-700">No evaluation data yet.</p>
        ) : items.map((item) => (
          <div key={`${title}-${item.lecturerId}`} className="rounded-2xl bg-slate-50 p-4">
            <p className="font-bold text-slate-950">{item.name}</p>
            <p className="mt-1 text-sm text-slate-600">{item.departmentName}</p>
            <p className="mt-2 text-2xl font-bold text-orange-700">{item.averageScore != null ? item.averageScore : "-"}</p>
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <DeanLayout>
      <div className="mb-6 sm:mb-8">
        <p className="text-sm font-semibold uppercase tracking-widest text-orange-700">Welcome Back</p>
        <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">{user?.full_name}</h2>
        <p className="mt-2 text-sm text-slate-600">Dean • Faculty of Science</p>
      </div>

      <section className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm sm:p-8">
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
            <button onClick={downloadFacultyReport} className="w-full sm:w-auto rounded-2xl bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-700 whitespace-nowrap text-center">
              Download Faculty Report
            </button>
          </div>
        </div>

        {error && <div className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {kpiCards.map(([label, value]) => (
            <div key={label} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-500">{label}</p>
              <p className="mt-3 text-3xl font-bold text-orange-700">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-xl font-bold text-slate-950">Average Evaluation Score Per Department</h3>
          <div className="mt-5 h-[350px] sm:h-[400px] w-full">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-600">Loading analytics...</div>
            ) : (overview?.departmentAverages || []).length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm font-medium text-orange-700">No department data available.</div>
            ) : (
              <Bar
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  onClick: (event, elements) => {
                    const index = elements[0]?.index;
                    const department = overview.departmentAverages[index];
                    if (department) {
                      navigate(`/dean/departments/${department.departmentId}?semesterId=${filters.semesterId}&academicYear=${encodeURIComponent(filters.academicYear)}`);
                    }
                  },
                  scales: { 
                    x: {
                      ticks: {
                        callback: function(value) {
                          let label = this.getLabelForValue(value);
                          if (label.startsWith("Department of ")) {
                            label = label.replace("Department of ", "");
                          }
                          return label.length > 15 ? label.substring(0, 15) + "..." : label;
                        }
                      }
                    },
                    y: { min: 0, max: 100 } 
                  },
                }}
              />
            )}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(overview?.departmentAverages || []).map((department) => (
              <Link
                key={department.departmentId}
                to={`/dean/departments/${department.departmentId}?semesterId=${filters.semesterId}&academicYear=${encodeURIComponent(filters.academicYear)}`}
                className="rounded-2xl border border-orange-100 bg-white p-4 transition hover:border-orange-300 hover:bg-orange-50"
              >
                <p className="font-bold text-slate-950">{department.departmentName}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
                  <span>{department.totalEvaluations} evaluations</span>
                  <span>•</span>
                  <span>{department.mentoringCount || 0} mentoring</span>
                  <span>•</span>
                  <span>{department.supervisionCount || 0} supervision</span>
                  <span>•</span>
                  <span>{department.otherCount || 0} other</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <PerformerCards title="Top Performers" items={overview?.topPerformers || []} />
        <PerformerCards title="Needs Attention" items={overview?.needsAttention || []} />
      </div>

      <div className="mt-6">
        <DashboardAnnouncements accent="orange" />
      </div>
    </DeanLayout>
  );
};

export default DeanDashboard;
