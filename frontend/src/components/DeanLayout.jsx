import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import NotificationBell from "./NotificationBell.jsx";
import ProfileAvatarButton from "./ProfileAvatarButton.jsx";

const DeanLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navItems = [
    { label: "Dashboard", to: "/dean/dashboard" },
    { label: "Notifications", to: "/notifications" },
    { label: "Profile", to: "/dean/profile" },
  ];

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-orange-100 bg-white/95 shadow-sm backdrop-blur">
        <div className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-10">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-700">Dean's Dashboard</p>
            <h1 className="break-words text-lg font-bold text-slate-950">Faculty of Science</h1>
          </div>
          <div className="flex min-w-0 items-center gap-3">
            <NotificationBell accent="text-orange-700" />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-950">{user?.full_name}</p>
              <p className="text-xs text-orange-700">Dean</p>
            </div>
            <ProfileAvatarButton user={user} to="/dean/profile" fallback="DN" className="bg-orange-600" />
            <button onClick={handleLogout} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-700">
              Logout
            </button>
          </div>
        </div>
      </header>
      <div className="w-full min-w-0 px-4 pb-8 pt-28 sm:px-6 lg:px-10 lg:pl-[310px]">
        <aside className="mb-6 rounded-3xl border border-orange-100 bg-white p-3 shadow-sm lg:fixed lg:left-8 lg:top-28 lg:mb-0 lg:w-[250px]">
          <p className="px-3 py-2 text-xs font-bold uppercase tracking-[0.25em] text-orange-700">Dean</p>
          <nav className="flex flex-wrap gap-2 lg:flex-col">
            {navItems.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link key={item.to} to={item.to} className={`whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-semibold transition ${active ? "bg-orange-600 text-white" : "text-slate-600 hover:bg-orange-50 hover:text-orange-700"}`}>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
};

export default DeanLayout;
