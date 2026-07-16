import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import AdminLayout from "../components/AdminLayout.jsx";
import SearchableSelect from "../components/SearchableSelect.jsx";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// --- ICON COMPONENTS ---
const Icons = {
  Calendar: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
  Document: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  UserGroup: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  GraduationCap: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 14l9-5-9-5-9 5 9 5z" /><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" /></svg>,
  Star: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>,
};

// --- REUSABLE COMPONENTS ---
const KPICard = ({ title, value, desc, Icon }) => (
  <div className="bg-white rounded-[20px] p-6 border border-slate-200 shadow-sm transition-all duration-300 hover:shadow-md flex flex-col justify-between h-full">
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-500">{title}</h3>
        <div className="p-2 bg-blue-50 text-[#4F6EF7] rounded-xl"><Icon /></div>
      </div>
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold text-slate-900">{value}</span>
      </div>
    </div>
    <p className="mt-4 text-xs text-slate-500 leading-snug">{desc}</p>
  </div>
);

const ChartCard = ({ title, subtitle, children, extra }) => (
  <div className="bg-white rounded-[20px] p-6 border border-slate-200 shadow-sm flex flex-col h-full">
    <div className="flex justify-between items-start mb-6">
      <div>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {extra}
    </div>
    <div className="flex-1 w-full relative min-h-[250px]">
      {children}
    </div>
  </div>
);

const AdminDashboard = () => {
  const { user } = useAuth();
  const [activityFilter, setActivityFilter] = useState("This Academic Year");
  const [data, setData] = useState({
    stats: {
      activeEvaluationWindows: 0,
      totalSubmissions: 0,
      participationRate: 0,
      responseRate: 0,
      averageRating: 0,
      expectedEvaluations: 0,
      completedEvaluations: 0,
      pendingEvaluations: 0
    },
    monthlyData: [],
    recentReports: [],
    recentActivity: [],
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await api.get(`/admin/dashboard-stats?activityFilter=${encodeURIComponent(activityFilter)}`);
        setData(response.data);
      } catch (error) {
        console.error("Failed to load dashboard stats", error);
      }
    };
    loadStats();
  }, [activityFilter]);

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { border: { display: false }, grid: { color: "#f1f5f9" } },
      x: { grid: { display: false } }
    }
  };

  const monthLabels = data.monthlyData?.map(d => d.name) || ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthValues = data.monthlyData?.map(d => d.value) || [0,0,0,0,0,0,0,0,0,0,0,0];

  return (
    <AdminLayout title="Dashboard">
      <div className="bg-[#F6F8FC] min-h-screen -mx-4 -my-6 px-4 py-6 sm:-mx-8 sm:px-8 lg:px-8 lg:py-8 font-sans">
        
        {/* Header */}
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#4F6EF7]">Welcome Back</p>
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl mt-1">{user?.full_name || "Administrator"}</h2>
          <p className="mt-2 text-sm text-slate-500">System Administrator • University Lecturer Evaluation System</p>
        </div>

        {/* Row 1: KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
          <KPICard title="Active Evaluation Windows" value={data.stats.activeEvaluationWindows} desc="Evaluation periods currently accepting student submissions." Icon={Icons.Calendar} />
          <KPICard title="Total Evaluations Submitted" value={data.stats.totalSubmissions.toLocaleString()} desc="Total evaluation forms submitted during the active window." Icon={Icons.Document} />
          <KPICard title="Lecturer Participation" value={`${data.stats.participationRate}%`} desc="Percentage of approved lecturers who have received evaluations." Icon={Icons.UserGroup} />
          <KPICard title="Student Response Rate" value={`${data.stats.responseRate}%`} desc="Students who completed evaluations out of all expected evaluations." Icon={Icons.GraduationCap} />
          <KPICard title="Average Lecturer Rating" value={`${data.stats.averageRating} / 5`} desc="Average teaching effectiveness rating across all evaluations." Icon={Icons.Star} />
        </div>

        {/* Row 2: Monthly Activity & Completion Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          <div className="lg:col-span-8">
            <ChartCard 
              title="Evaluation Activity"
              extra={
                <div className="w-56">
                  <SearchableSelect 
                    options={[
                      { value: "This Academic Year", label: "This Academic Year" },
                      { value: "Last Academic Year", label: "Last Academic Year" },
                      { value: "All Time", label: "All Time" }
                    ]}
                    value={activityFilter}
                    onChange={(e) => setActivityFilter(e.target.value)}
                  />
                </div>
              }
            >
              <Bar 
                options={barOptions} 
                data={{
                  labels: monthLabels,
                  datasets: [{
                    label: 'Evaluations',
                    data: monthValues,
                    backgroundColor: '#4F6EF7',
                    borderRadius: 6,
                    barThickness: 'flex',
                    maxBarThickness: 32
                  }]
                }} 
              />
            </ChartCard>
          </div>
          <div className="lg:col-span-4">
            <ChartCard title="Evaluation Completion Progress" subtitle="Tracking expected vs completed evaluations for the current active window.">
              <div className="flex flex-col items-center justify-center h-full pt-4">
                <div className="relative w-48 h-24 overflow-hidden mb-6 flex-shrink-0">
                  <div className="absolute top-0 left-0 w-48 h-48 rounded-full border-[16px] border-slate-100 border-b-transparent border-r-transparent transform -rotate-45"></div>
                  <div className="absolute top-0 left-0 w-48 h-48 rounded-full border-[16px] border-[#4F6EF7] border-b-transparent border-r-transparent transform -rotate-45" style={{ strokeDasharray: "100 100", clipPath: "polygon(0 0, 100% 0, 100% 50%, 0 50%)", transition: "transform 1s ease-out", transform: `rotate(${-45 + (180 * (data.stats.responseRate / 100))}deg)` }}></div>
                  <div className="absolute bottom-0 w-full text-center">
                    <span className="text-3xl font-bold text-slate-900">{data.stats.responseRate}%</span>
                  </div>
                </div>
                <div className="w-full flex justify-between text-center pt-6 border-t border-slate-100">
                  <div><p className="text-xs text-slate-500 mb-1">Expected</p><p className="font-bold text-slate-900">{data.stats.expectedEvaluations.toLocaleString()}</p></div>
                  <div><p className="text-xs text-slate-500 mb-1">Completed</p><p className="font-bold text-emerald-600">{data.stats.completedEvaluations.toLocaleString()}</p></div>
                  <div><p className="text-xs text-slate-500 mb-1">Pending</p><p className="font-bold text-amber-500">{data.stats.pendingEvaluations.toLocaleString()}</p></div>
                </div>
              </div>
            </ChartCard>
          </div>
        </div>


      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
