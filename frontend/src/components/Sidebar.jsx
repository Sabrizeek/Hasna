import { NavLink } from "react-router-dom";

const linkClass = ({ isActive }) =>
  `block rounded-xl px-4 py-3 text-sm font-medium transition ${
    isActive ? "bg-brandGold text-white" : "text-slate-200 hover:bg-white/10 hover:text-white"
  }`;

const Sidebar = () => {
  return (
    <aside className="flex min-h-screen w-full flex-col bg-brandBlue text-white lg:w-72">
      <div className="border-b border-white/10 px-6 py-6">
        <div className="text-xs uppercase tracking-[0.3em] text-brandGold">Faculty of Science</div>
        <h1 className="mt-2 text-2xl font-bold leading-tight">Admin Panel</h1>
      </div>

      <nav className="flex-1 space-y-2 px-4 py-6">
        <NavLink to="/admin/dashboard" className={linkClass}>Dashboard</NavLink>
        <NavLink to="/admin/pending-users" className={linkClass}>Pending Accounts</NavLink>
        <NavLink to="/admin/users" className={linkClass}>User Management</NavLink>
        <NavLink to="/admin/departments" className={linkClass}>Departments</NavLink>
        <NavLink to="/admin/courses" className={linkClass}>Courses</NavLink>
        <NavLink to="/admin/semesters" className={linkClass}>Semesters</NavLink>
        <NavLink to="/admin/announcements" className={linkClass}>Announcements</NavLink>
      </nav>
    </aside>
  );
};

export default Sidebar;
