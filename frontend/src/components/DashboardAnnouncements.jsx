import { useEffect, useState } from "react";
import api from "../api/axios.js";

const accentStyles = {
  teal: {
    border: "border-teal-100",
    label: "text-teal-700",
    empty: "bg-teal-50 text-teal-700",
    badge: "bg-teal-50 text-teal-700",
  },
  sky: {
    border: "border-sky-100",
    label: "text-sky-700",
    empty: "bg-sky-50 text-sky-700",
    badge: "bg-sky-50 text-sky-700",
  },
  amber: {
    border: "border-amber-100",
    label: "text-amber-700",
    empty: "bg-amber-50 text-amber-700",
    badge: "bg-amber-50 text-amber-700",
  },
  orange: {
    border: "border-orange-100",
    label: "text-orange-700",
    empty: "bg-orange-50 text-orange-700",
    badge: "bg-orange-50 text-orange-700",
  },
  blue: {
    border: "border-slate-200",
    label: "text-brandBlue",
    empty: "bg-slate-50 text-slate-600",
    badge: "bg-slate-100 text-brandBlue",
  },
};

const DashboardAnnouncements = ({ accent = "blue" }) => {
  const styles = accentStyles[accent] || accentStyles.blue;
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        const response = await api.get("/announcements/my");
        setAnnouncements(response.data.announcements || []);
      } catch {
        setAnnouncements([]);
      } finally {
        setLoading(false);
      }
    };

    loadAnnouncements();
  }, []);

  return (
    <section className={`rounded-3xl border ${styles.border} bg-white p-6 shadow-sm sm:p-8`}>
      <p className={`text-sm font-semibold uppercase tracking-[0.24em] ${styles.label}`}>Announcements</p>
      <h3 className="mt-2 text-2xl font-bold text-slate-950">Latest Notices</h3>

      <div className="mt-5 space-y-3">
        {loading ? (
          <div className={`rounded-2xl p-4 text-sm font-medium ${styles.empty}`}>Loading announcements...</div>
        ) : announcements.length === 0 ? (
          <div className={`rounded-2xl p-4 text-sm font-medium ${styles.empty}`}>No announcements for your dashboard.</div>
        ) : (
          announcements.map((announcement) => (
            <article key={announcement.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${styles.badge}`}>
                  {announcement.target_role === "all" ? "All users" : announcement.target_role}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  {announcement.department_name || "All departments"}
                </span>
              </div>
              <h4 className="mt-3 font-bold text-slate-950">{announcement.title}</h4>
              <p className="mt-2 text-sm leading-6 text-slate-600">{announcement.message}</p>
              <p className="mt-3 text-xs text-slate-500">{new Date(announcement.created_at).toLocaleString()}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
};

export default DashboardAnnouncements;
