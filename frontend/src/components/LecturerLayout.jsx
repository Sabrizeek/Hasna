import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import TopHeader from "./TopHeader.jsx";
import SiteFooter from "./SiteFooter.jsx";

const navItems = [
  { key: "dashboard", label: "Dashboard", to: "/lecturer/dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { key: "evaluations", label: "My Evaluations", to: "/lecturer/my-evaluations", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
  { key: "reports", label: "Activity Reports", to: "/lecturer/supervision-reports", icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { key: "peer", label: "Peer Evaluations", to: "/lecturer/peer-evaluations", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
];

const LecturerLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50">
      {/* Header */}
      <TopHeader
        title="Lecturer Workspace"
        user={user}
        logout={handleLogout}
        setSidebarOpen={setNavOpen}
        profileTo="/lecturer/profile"
        avatarFallback="LE"
        avatarColor="bg-sky-700"
        notificationAccent="text-sky-700"
        className="border-sky-100 bg-white/95 backdrop-blur"
      />

      {/* Mobile overlay */}
      {navOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setNavOpen(false)} aria-hidden="true" />
      )}

      {/* Mobile drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          navOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="rounded-b-none border-b border-sky-100 bg-sky-700 px-5 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-sky-100">Lecturer</p>
              <p className="mt-1 font-semibold">{user?.full_name}</p>
              <p className="mt-0.5 text-xs text-sky-200">{user?.department_name || "Faculty of Science"}</p>
            </div>
            <button
              type="button"
              onClick={() => setNavOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-sky-200 hover:bg-sky-600"
              aria-label="Close menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <nav className="space-y-1 p-4">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.key}
                to={item.to}
                onClick={() => setNavOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  active ? "bg-sky-700 text-white" : "text-slate-600 hover:bg-sky-50 hover:text-sky-800"
                }`}
              >
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Page layout */}
      <div className="w-full min-w-0 px-4 pb-8 pt-20 sm:px-6 lg:px-10 lg:pl-[310px]">
        {/* Desktop sidebar */}
        <aside className="mb-6 hidden rounded-3xl border border-sky-100 bg-white p-3 shadow-sm lg:fixed lg:left-8 lg:top-20 lg:mb-0 lg:block lg:w-[250px]">
          <div className="mb-3 rounded-2xl bg-sky-700 p-4 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-sky-100">Lecturer</p>
            <p className="mt-2 text-sm font-semibold">{user?.full_name}</p>
            <p className="mt-1 text-xs text-sky-100">{user?.department_name || "Faculty of Science"}</p>
          </div>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.key}
                  to={item.to}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    active ? "bg-sky-700 text-white shadow-sm" : "text-slate-600 hover:bg-sky-50 hover:text-sky-800"
                  }`}
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0 overflow-x-hidden">{children}</main>
      </div>
      <div className="lg:pl-[310px]">
        <SiteFooter compact />
      </div>
    </div>
  );
};

export default LecturerLayout;
