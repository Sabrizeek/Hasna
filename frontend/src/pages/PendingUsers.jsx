import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout.jsx";
import api from "../api/axios.js";

const PendingUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPendingUsers = async () => {
    try {
      const response = await api.get("/admin/pending-users");
      setUsers(response.data.users || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingUsers();
  }, []);

  const updateStatus = async (id, action) => {
    await api.put(`/admin/${action}-user/${id}`);
    loadPendingUsers();
  };

  return (
    <AdminLayout title="Pending Accounts">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="max-h-[34rem] overflow-y-auto overflow-x-hidden">
          <table className="w-full table-fixed divide-y divide-slate-200 text-left text-sm [&_td]:break-words [&_th]:break-words">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="text-slate-500">
                <th className="py-3 pr-4 font-semibold">Name</th>
                <th className="py-3 pr-4 font-semibold">Email</th>
                <th className="py-3 pr-4 font-semibold">Role</th>
                <th className="py-3 pr-4 font-semibold">Department</th>
                <th className="py-3 pr-4 font-semibold">Status</th>
                <th className="py-3 pr-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="py-6" colSpan="6">Loading...</td></tr>
              ) : users.length === 0 ? (
                <tr><td className="py-6" colSpan="6">No pending users.</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-t border-slate-100">
                    <td className="py-4 pr-4 font-medium text-slate-900">{user.full_name}</td>
                    <td className="py-4 pr-4 text-slate-600">{user.email}</td>
                    <td className="py-4 pr-4 capitalize text-slate-600">{user.role}</td>
                    <td className="py-4 pr-4 text-slate-600">{user.department_name}</td>
                    <td className="py-4 pr-4 text-amber-600">{user.status}</td>
                    <td className="py-4 pr-4 whitespace-nowrap">
                      <div className="inline-flex flex-nowrap gap-2">
                        <button onClick={() => updateStatus(user.id, "approve")} className="rounded-full bg-green-600 px-4 py-2 text-xs font-semibold text-white">
                          Approve
                        </button>
                        <button onClick={() => updateStatus(user.id, "reject")} className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white">
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default PendingUsers;
