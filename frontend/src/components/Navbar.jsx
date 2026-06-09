import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-10">
        <Link to="/" className="space-y-1">
          <div className="text-sm font-semibold uppercase tracking-[0.3em] text-brandGold">University of Ruhuna</div>
          <div className="text-lg font-bold text-brandBlue">Lecturer Evaluation System</div>
        </Link>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden text-sm text-slate-600 sm:inline">{user.full_name}</span>
              <button onClick={logout} className="rounded-full bg-brandBlue px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login?mode=student" className="rounded-full border border-brandBlue px-4 py-2 text-sm font-semibold text-brandBlue transition hover:bg-brandBlue hover:text-white">
                Student Login
              </Link>
              <Link to="/login?mode=staff" className="rounded-full bg-brandGold px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
                Staff Login
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
