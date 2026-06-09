import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const homeByRole = {
  admin: "/admin/dashboard",
  student: "/student/dashboard",
  lecturer: "/lecturer/dashboard",
  hod: "/hod/dashboard",
  dean: "/dean/dashboard",
};

const UnauthorizedAccess = () => {
  const { user } = useAuth();

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <section className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-red-600">Access Denied</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-950">403</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          You do not have permission to open this page with your current role.
        </p>
        <Link to={homeByRole[user?.role] || "/login"} className="mt-6 inline-flex rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white">
          Return to Dashboard
        </Link>
      </section>
    </div>
  );
};

export default UnauthorizedAccess;
