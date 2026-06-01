import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout.jsx";
import api from "../api/axios.js";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingAccounts: 0,
    totalDepartments: 0,
    totalCourses: 0,
    activeSemester: "None",
    totalAnnouncements: 0,
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [usersRes, departmentsRes, coursesRes, semestersRes, announcementsRes] = await Promise.all([
          api.get("/admin/users"),
          api.get("/departments"),
          api.get("/courses"),
          api.get("/semesters"),
          api.get("/announcements"),
        ]);

        const semesters = semestersRes.data.semesters || [];
        const activeSemester = semesters.find((semester) => Number(semester.is_active) === 1);

        setStats({
          totalUsers: usersRes.data.users?.length || 0,
          pendingAccounts: usersRes.data.users?.filter((user) => user.status === "pending").length || 0,
          totalDepartments: departmentsRes.data.departments?.length || 0,
          totalCourses: coursesRes.data.courses?.length || 0,
          activeSemester: activeSemester ? `${activeSemester.semester_name} (${activeSemester.academic_year})` : "None",
          totalAnnouncements: announcementsRes.data.announcements?.length || 0,
        });
      } catch (error) {
        setStats((current) => ({ ...current }));
      }
    };

    loadStats();
  }, []);

  const cards = [
    { label: "Total Users", value: stats.totalUsers },
    { label: "Pending Accounts", value: stats.pendingAccounts },
    { label: "Total Departments", value: stats.totalDepartments },
    { label: "Total Courses", value: stats.totalCourses },
    { label: "Active Semester", value: stats.activeSemester },
    { label: "Total Announcements", value: stats.totalAnnouncements },
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
      <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
        <h3 className="text-xl font-bold text-brandBlue">Admin foundation ready</h3>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Use the sidebar to approve new users, manage departments, assign courses, set semesters, and publish announcements.
        </p>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
