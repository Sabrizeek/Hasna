import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const initialsFromName = (name = "") => {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "LE";
};

const navItems = [
  { label: "Dashboard", to: "/lecturer/dashboard" },
  { label: "My Evaluations", to: "/lecturer/dashboard" },
  { label: "Supervision Reports", to: "/lecturer/supervision-reports" },
];

const LecturerLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-sky-100 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">Lecturer Dashboard</p>
            <h1 className="text-lg font-bold text-slate-950">Lecturer Evaluation System</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-950">{user?.full_name}</p>
              <p className="text-xs text-sky-700">Lecturer</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-700 text-sm font-bold text-white">
              {initialsFromName(user?.full_name)}
            </div>
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

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[240px_1fr] lg:px-8">
        <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
          <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {navItems.map((item) => (
              <NavLink
                key={`${item.label}-${item.to}`}
                to={item.to}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    isActive ? "bg-sky-700 text-white" : "text-slate-600 hover:bg-sky-50 hover:text-sky-800"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
};

export default LecturerLayout;
