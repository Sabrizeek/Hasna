import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import TopHeader from "./TopHeader.jsx";
import SiteFooter from "./SiteFooter.jsx";

const navItems = [
  { label: "Dashboard", to: "/dean/dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { label: "Notifications", to: "/notifications", icon: "M15 17H9m10-1.5c-.9-.9-1.5-1.8-1.5-4.5a5.5 5.5 0 0 0-11 0c0 2.7-.6 3.6-1.5 4.5-.4.4-.1 1.5.6 1.5h12.8c.7 0 1-1.1.6-1.5Z" },
  { label: "Profile", to: "/dean/profile", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
];

const DeanLayout = ({ children }) => {
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
        title="Dean Portal"
        user={user}
        logout={handleLogout}
        setSidebarOpen={setNavOpen}
        profileTo="/dean/profile"
        avatarFallback="DN"
        avatarColor="bg-orange-600"
        notificationAccent="text-orange-700"
        className="border-orange-100 bg-white/95 backdrop-blur"
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
        <div className="border-b border-orange-100 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-orange-600">Dean</p>
              <p className="mt-1 font-semibold text-slate-900">{user?.full_name}</p>
              <p className="mt-0.5 text-xs text-orange-600">Faculty of Science</p>
            </div>
            <button
              type="button"
              onClick={() => setNavOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
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
                key={item.to}
                to={item.to}
                onClick={() => setNavOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  active ? "bg-orange-600 text-white" : "text-slate-600 hover:bg-orange-50 hover:text-orange-700"
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
        <aside className="mb-6 hidden rounded-3xl border border-orange-100 bg-white p-3 shadow-sm lg:fixed lg:left-8 lg:top-20 lg:mb-0 lg:block lg:w-[250px]">
          <p className="px-3 py-2 text-xs font-bold uppercase tracking-[0.25em] text-orange-700">Dean</p>
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    active ? "bg-orange-600 text-white" : "text-slate-600 hover:bg-orange-50 hover:text-orange-700"
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

export default DeanLayout;
