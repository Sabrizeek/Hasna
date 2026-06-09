import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout.jsx";
import DashboardAnnouncements from "../components/DashboardAnnouncements.jsx";
import api from "../api/axios.js";

const AdminDashboard = () => {
  const [data, setData] = useState({
    stats: {},
    recentReports: [],
    recentActivity: [],
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await api.get("/admin/dashboard-stats");
        setData(response.data);
      } catch (error) {
        setData((current) => current);
      }
    };

    loadStats();
  }, []);

  const cards = [
    { label: "Total Students", value: data.stats.totalStudents || 0 },
    { label: "Total Lecturers", value: data.stats.totalLecturers || 0 },
    { label: "Total HoDs", value: data.stats.totalHoDs || 0 },
    { label: "Total Submissions", value: data.stats.totalSubmissions || 0 },
    { label: "Active Evaluation Windows", value: data.stats.activeEvaluationWindows || 0 },
    { label: "Pending Supervision Reports", value: data.stats.pendingSupervisionReports || 0 },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{card.label}</p>
            <h3 className="mt-4 text-3xl font-bold text-brandBlue">{card.value}</h3>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <DashboardAnnouncements accent="blue" />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-bold text-brandBlue">Recent Reports</h3>
          <div className="mt-4 space-y-3">
            {data.recentReports.length === 0 ? <p className="text-sm text-slate-500">No reports yet.</p> : data.recentReports.map((report) => (
              <div key={report.id} className="rounded-2xl bg-slate-50 p-4 text-sm">
                <p className="font-semibold text-slate-900">{report.title}</p>
                <p className="mt-1 text-slate-600">{report.lecturer_name} - {report.status}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-bold text-brandBlue">Recent Activity</h3>
          <div className="mt-4 space-y-3">
            {data.recentActivity.length === 0 ? <p className="text-sm text-slate-500">No activity yet.</p> : data.recentActivity.map((activity) => (
              <div key={activity.id} className="rounded-2xl bg-slate-50 p-4 text-sm">
                <p className="font-semibold text-slate-900">{activity.action}</p>
                <p className="mt-1 text-slate-600">{activity.user_name || "System"} - {new Date(activity.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
