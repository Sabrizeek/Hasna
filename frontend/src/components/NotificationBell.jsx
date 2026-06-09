import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios.js";

const NotificationBell = ({ accent = "text-brandBlue" }) => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef(null);

  const loadNotifications = async () => {
    try {
      const response = await api.get("/notifications");
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unreadCount || 0);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const handleClick = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const markAllRead = async () => {
    await api.patch("/notifications/read-all");
    loadNotifications();
  };

  const markOneRead = async (id) => {
    await api.patch(`/notifications/${id}/read`);
    loadNotifications();
  };

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-lg shadow-sm transition hover:bg-slate-50"
        aria-label="Notifications"
      >
        <svg className={`h-5 w-5 ${accent}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M15 17H9m10-1.5c-.9-.9-1.5-1.8-1.5-4.5a5.5 5.5 0 0 0-11 0c0 2.7-.6 3.6-1.5 4.5-.4.4-.1 1.5.6 1.5h12.8c.7 0 1-1.1.6-1.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10 20a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-3 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
            <h3 className="font-bold text-slate-950">Notifications</h3>
            <button type="button" onClick={markAllRead} className="text-xs font-semibold text-slate-600 hover:text-slate-950">
              Mark all read
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto py-2">
            {notifications.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">No notifications yet.</p>
            ) : (
              notifications.slice(0, 6).map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => markOneRead(notification.id)}
                  className={`mb-2 block w-full rounded-xl p-3 text-left transition hover:bg-slate-50 ${
                    notification.isRead ? "bg-white" : "bg-amber-50"
                  }`}
                >
                  <p className="text-sm font-bold text-slate-950">{notification.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">{notification.message}</p>
                  <p className="mt-2 text-[11px] text-slate-400">{new Date(notification.createdAt).toLocaleString()}</p>
                </button>
              ))
            )}
          </div>
          <Link to="/notifications" onClick={() => setOpen(false)} className="block rounded-xl bg-slate-900 px-4 py-2 text-center text-sm font-semibold text-white">
            View All
          </Link>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
