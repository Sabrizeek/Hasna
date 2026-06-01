import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
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
              <Link to="/login" className="rounded-full border border-brandBlue px-4 py-2 text-sm font-semibold text-brandBlue transition hover:bg-brandBlue hover:text-white">
                Login
              </Link>
              <Link to="/register" className="rounded-full bg-brandGold px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
