import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import NotificationBell from "./NotificationBell.jsx";
import ProfileAvatarButton from "./ProfileAvatarButton.jsx";

const TopHeader = ({
  title,
  user,
  logout,
  setSidebarOpen,
  profileTo,
  avatarFallback,
  avatarColor,
  notificationAccent = "text-brandBlue",
  className = "lg:left-72",
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileUnreadCount, setMobileUnreadCount] = useState(0);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`fixed inset-x-0 top-0 z-30 border-b border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        {/* Left: hamburger (mobile) + title */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 lg:hidden"
            aria-label="Open menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <p className="hidden text-xs uppercase tracking-[0.3em] text-brandGold sm:block">Lecturer Evaluation System</p>
            <h2 className="truncate text-lg font-bold text-brandBlue sm:text-2xl">{title}</h2>
          </div>
        </div>

        {/* Right Desktop: actions */}
        <div className="hidden shrink-0 items-center gap-3 sm:flex">
          <NotificationBell accent={notificationAccent} onUnreadCountChange={setMobileUnreadCount} />
          <span className="text-sm text-slate-600">{user?.full_name}</span>
          <ProfileAvatarButton user={user} to={profileTo} fallback={avatarFallback} className={avatarColor} />
          <button
            onClick={logout}
            className="rounded-full bg-brandBlue px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Logout
          </button>
        </div>

        {/* Right Mobile: 3 dots menu */}
        <div className="relative sm:hidden" ref={menuRef}>
          <div className="hidden">
            <NotificationBell accent={notificationAccent} onUnreadCountChange={setMobileUnreadCount} />
          </div>
          
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v.01M12 12v.01M12 18v.01" />
            </svg>
            {mobileUnreadCount > 0 && (
              <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-red-600 px-1 py-0.5 text-[10px] font-bold text-white text-center flex items-center justify-center h-4">
                {mobileUnreadCount > 99 ? "99+" : mobileUnreadCount}
              </span>
            )}
          </button>

          {/* Mobile Dropdown */}
          {isMobileMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-100 bg-white p-3 shadow-xl z-50">
              <div className="flex flex-col gap-3">
                <Link to="/notifications" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 hover:bg-slate-50 p-1 -m-1 rounded-lg transition">
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-lg shadow-sm">
                    <svg className={`h-5 w-5 ${notificationAccent}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M15 17H9m10-1.5c-.9-.9-1.5-1.8-1.5-4.5a5.5 5.5 0 0 0-11 0c0 2.7-.6 3.6-1.5 4.5-.4.4-.1 1.5.6 1.5h12.8c.7 0 1-1.1.6-1.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M10 20a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    {mobileUnreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white text-center">
                        {mobileUnreadCount > 99 ? "99+" : mobileUnreadCount}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-slate-700">Notifications</span>
                </Link>
                <div className="h-px w-full bg-slate-100"></div>
                <div className="flex items-center gap-3">
                  <ProfileAvatarButton user={user} to={profileTo} fallback={avatarFallback} className={avatarColor} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-700">{user?.full_name}</p>
                    <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-400">Profile</p>
                  </div>
                </div>
                <div className="h-px w-full bg-slate-100"></div>
                <button
                  onClick={logout}
                  className="w-full rounded-xl bg-red-50 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 transition"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopHeader;
