import Sidebar from "./Sidebar.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const AdminLayout = ({ title, children }) => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-brandBg lg:flex">
      <Sidebar />
      <main className="flex-1">
        <div className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-brandGold">Lecturer Evaluation System</p>
              <h2 className="text-2xl font-bold text-brandBlue">{title}</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">{user?.full_name}</span>
              <button onClick={logout} className="rounded-full bg-brandBlue px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
                Logout
              </button>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
};

export default AdminLayout;
