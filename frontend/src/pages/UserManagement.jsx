import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../components/AdminLayout.jsx";
import api from "../api/axios.js";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const loadUsers = async () => {
    const response = await api.get("/admin/users");
    setUsers(response.data.users || []);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch = `${user.full_name} ${user.email}`.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const deleteUser = async (id) => {
    await api.delete(`/admin/users/${id}`);
    loadUsers();
  };

  return (
    <AdminLayout title="User Management">
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users..." className="rounded-2xl border border-slate-300 px-4 py-3" />
        <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="rounded-2xl border border-slate-300 px-4 py-3">
          <option value="all">All Roles</option>
          <option value="student">Student</option>
          <option value="lecturer">Lecturer</option>
          <option value="admin">Admin</option>
          <option value="hod">HoD</option>
          <option value="dean">Dean</option>
        </select>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead>
              <tr className="text-slate-500">
                <th className="py-3 pr-4 font-semibold">Name</th>
                <th className="py-3 pr-4 font-semibold">Email</th>
                <th className="py-3 pr-4 font-semibold">Role</th>
                <th className="py-3 pr-4 font-semibold">Department</th>
                <th className="py-3 pr-4 font-semibold">Status</th>
                <th className="py-3 pr-4 font-semibold">Created</th>
                <th className="py-3 pr-4 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-t border-slate-100">
                  <td className="py-4 pr-4 font-medium">{user.full_name}</td>
                  <td className="py-4 pr-4 text-slate-600">{user.email}</td>
                  <td className="py-4 pr-4 capitalize text-slate-600">{user.role}</td>
                  <td className="py-4 pr-4 text-slate-600">{user.department_name}</td>
                  <td className="py-4 pr-4 capitalize text-slate-600">{user.status}</td>
                  <td className="py-4 pr-4 text-slate-600">{new Date(user.created_at).toLocaleDateString()}</td>
                  <td className="py-4 pr-4">
                    <button onClick={() => deleteUser(user.id)} className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default UserManagement;
