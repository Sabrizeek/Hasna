import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import NotificationBell from "./NotificationBell.jsx";
import ProfileAvatarButton from "./ProfileAvatarButton.jsx";

const navItems = [
  { key: "dashboard", label: "Dashboard", to: "/lecturer/dashboard" },
  { key: "evaluations", label: "My Evaluations", to: "/lecturer/dashboard#evaluations" },
  { key: "reports", label: "Supervision Reports", to: "/lecturer/supervision-reports" },
];

const LecturerLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActiveItem = (item) => {
    if (item.key === "dashboard") {
      return location.pathname === "/lecturer/dashboard" && location.hash !== "#evaluations";
    }
    if (item.key === "evaluations") {
      return location.pathname === "/lecturer/dashboard" && location.hash === "#evaluations";
    }
    return location.pathname === item.to;
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-sky-100 bg-white/95 shadow-sm backdrop-blur">
        <div className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-10">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">Lecturer Dashboard</p>
            <h1 className="break-words text-lg font-bold text-slate-950">Lecturer Evaluation System</h1>
          </div>
          <div className="flex min-w-0 items-center gap-3">
            <NotificationBell accent="text-sky-700" />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-950">{user?.full_name}</p>
              <p className="text-xs text-sky-700">Lecturer</p>
            </div>
            <ProfileAvatarButton user={user} to="/lecturer/profile" fallback="LE" className="bg-sky-700" />
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="w-full min-w-0 px-4 pb-8 pt-28 sm:px-6 lg:px-10 lg:pl-[350px]">
        <aside className="mb-6 h-fit rounded-3xl border border-sky-100 bg-white p-4 shadow-sm lg:fixed lg:left-8 lg:top-28 lg:z-20 lg:mb-0 lg:w-[290px]">
          <div className="mb-4 rounded-2xl bg-sky-700 p-4 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-sky-100">Lecturer</p>
            <p className="mt-2 text-sm font-semibold">{user?.full_name}</p>
            <p className="mt-1 text-xs text-sky-100">{user?.department_name || "Faculty of Science"}</p>
          </div>
          <nav className="flex flex-wrap gap-2 lg:flex-col">
            {navItems.map((item) => {
              const isActive = isActiveItem(item);
              return (
              <Link
                key={item.key}
                to={item.to}
                className={`whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  isActive ? "bg-sky-700 text-white shadow-sm" : "text-slate-600 hover:bg-sky-50 hover:text-sky-800"
                }`}
              >
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

export default LecturerLayout;
