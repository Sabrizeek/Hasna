import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../components/AdminLayout.jsx";
import DeanLayout from "../components/DeanLayout.jsx";
import HoDLayout from "../components/HoDLayout.jsx";
import LecturerLayout from "../components/LecturerLayout.jsx";
import StudentLayout from "../components/StudentLayout.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/axios.js";

const layoutByRole = {
  admin: AdminLayout,
  student: StudentLayout,
  lecturer: LecturerLayout,
  hod: HoDLayout,
  dean: DeanLayout,
};

const homeByRole = {
  admin: "/admin/dashboard",
  student: "/student/dashboard",
  lecturer: "/lecturer/dashboard",
  hod: "/hod/dashboard",
  dean: "/dean/dashboard",
};

const typeClasses = {
  info: "bg-sky-50 text-sky-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  error: "bg-red-50 text-red-700",
  system: "bg-slate-100 text-slate-700",
};

const NotificationsPage = () => {
  const { user } = useAuth();
  const Layout = layoutByRole[user?.role] || StudentLayout;
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all");
  const [message, setMessage] = useState("");

  const loadNotifications = async () => {
    const response = await api.get("/notifications");
    setNotifications(response.data.notifications || []);
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const visibleNotifications = useMemo(() => {
    if (filter === "unread") return notifications.filter((notification) => !notification.isRead);
    return notifications;
  }, [notifications, filter]);

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`);
    loadNotifications();
  };

  const markAllRead = async () => {
    await api.patch("/notifications/read-all");
    setMessage("All notifications marked as read.");
    loadNotifications();
  };

  return (
    <Layout title="Notifications">
      <section className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">System Notices</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-950">Notifications</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={homeByRole[user?.role] || "/"} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
              Back to Dashboard
            </Link>
            <button onClick={() => setFilter("all")} className={`rounded-full px-4 py-2 text-sm font-semibold ${filter === "all" ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-700"}`}>All</button>
            <button onClick={() => setFilter("unread")} className={`rounded-full px-4 py-2 text-sm font-semibold ${filter === "unread" ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-700"}`}>Unread</button>
            <button onClick={markAllRead} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Mark All Read</button>
          </div>
        </div>

        {message && <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p>}

        <div className="mt-6 space-y-3">
          {visibleNotifications.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-5 text-sm font-medium text-slate-600">No notifications to show.</div>
          ) : (
            visibleNotifications.map((notification) => (
              <article key={notification.id} className={`rounded-2xl border p-5 ${notification.isRead ? "border-slate-200 bg-white" : "border-amber-200 bg-amber-50/40"}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${typeClasses[notification.type] || typeClasses.info}`}>{notification.type}</span>
                    <h2 className="mt-3 text-lg font-bold text-slate-950">{notification.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{notification.message}</p>
                    <p className="mt-3 text-xs text-slate-400">{new Date(notification.createdAt).toLocaleString()}</p>
                  </div>
                  {!notification.isRead && (
                    <button onClick={() => markRead(notification.id)} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                      Mark Read
                    </button>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </Layout>
  );
};

export default NotificationsPage;
