import { useEffect, useMemo, useState } from "react";
import AdminLayout from "../components/AdminLayout.jsx";
import api from "../api/axios.js";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [formData, setFormData] = useState({ universityId: "", fullName: "", email: "", role: "student", departmentId: "", phone: "" });
  const [resetRequests, setResetRequests] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [notificationForm, setNotificationForm] = useState({
    title: "",
    message: "",
    type: "info",
    targetType: "role",
    role: "student",
    userId: "",
  });

  const loadUsers = async () => {
    const [usersRes, departmentsRes, resetRequestsRes] = await Promise.all([
      api.get("/admin/users"),
      api.get("/departments"),
      api.get("/admin/password-reset-requests?status=pending"),
    ]);
    const loadedDepartments = departmentsRes.data.departments || [];
    setUsers(usersRes.data.users || []);
    setDepartments(loadedDepartments);
    setResetRequests(resetRequestsRes.data.requests || []);
    setFormData((current) => ({ ...current, departmentId: current.departmentId || String(loadedDepartments[0]?.id || "") }));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch = `${user.full_name} ${user.email} ${user.university_id || ""}`.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const deleteUser = async (user) => {
    const confirmed = window.confirm(
      `Delete ${user.full_name}?\n\nThis removes the account from active users and releases the email and University ID so they can be reused.`
    );
    if (!confirmed) return;

    setMessage("");
    setError("");
    try {
      const response = await api.delete(`/admin/users/${user.id}`);
      setMessage(response.data.message || "User deleted successfully.");
      loadUsers();
    } catch (deleteError) {
      setError(deleteError.response?.data?.message || "Unable to delete user.");
    }
  };

  const handleChange = (event) => {
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({ universityId: "", fullName: "", email: "", role: "student", departmentId: String(departments[0]?.id || ""), phone: "", status: "approved" });
  };

  const emailStatusText = (emailStatus) => {
    if (emailStatus?.sent) return "Email sent.";
    if (emailStatus?.preview) return "SMTP is not configured, so a safe email preview was logged in the backend console.";
    if (emailStatus?.error) return `User was saved, but email failed: ${emailStatus.error}`;
    return "";
  };

  const createUser = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      const payload = {
        ...formData,
        departmentId: formData.role === "admin" ? null : Number(formData.departmentId),
      };
      const response = editingId
        ? await api.put(`/admin/users/${editingId}`, { ...payload, status: formData.status || "approved" })
        : await api.post("/admin/users", payload);
      setMessage([response.data.message, emailStatusText(response.data.emailStatus)].filter(Boolean).join(" "));
      resetForm();
      loadUsers();
    } catch (createError) {
      setError(createError.response?.data?.message || "Unable to create user.");
    }
  };

  const editUser = (user) => {
    setEditingId(user.id);
    setFormData({
      universityId: user.university_id || "",
      fullName: user.full_name || "",
      email: user.email || "",
      role: user.role || "student",
      departmentId: String(user.department_id || departments[0]?.id || ""),
      phone: user.phone || "",
      status: user.status || "approved",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const activateUser = async (user) => {
    const confirmed = window.confirm(`Activate ${user.full_name}?`);
    if (!confirmed) return;
    setMessage("");
    setError("");
    try {
      const response = await api.patch(`/admin/users/${user.id}/activate`);
      setMessage(response.data.message || "User activated successfully.");
      loadUsers();
    } catch (activateError) {
      setError(activateError.response?.data?.message || "Unable to activate user.");
    }
  };

  const deactivateUser = async (user) => {
    const confirmed = window.confirm(`Deactivate ${user.full_name}?`);
    if (!confirmed) return;
    setMessage("");
    setError("");
    try {
      const response = await api.patch(`/admin/users/${user.id}/deactivate`);
      setMessage(response.data.message || "User deactivated successfully.");
      loadUsers();
    } catch (deactivateError) {
      setError(deactivateError.response?.data?.message || "Unable to deactivate user.");
    }
  };

  const resetPassword = async (id) => {
    const response = await api.patch(`/admin/users/${id}/reset-password`);
    setMessage([response.data.message, emailStatusText(response.data.emailStatus)].filter(Boolean).join(" "));
    loadUsers();
  };

  const handleNotificationChange = (event) => {
    setNotificationForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const sendNotification = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      const payload = {
        title: notificationForm.title,
        message: notificationForm.message,
        type: notificationForm.type,
        targetType: notificationForm.targetType,
      };
      if (notificationForm.targetType === "user") payload.userId = Number(notificationForm.userId);
      if (notificationForm.targetType === "role") payload.role = notificationForm.role;

      const response = await api.post("/admin/notifications", payload);
      setMessage(`${response.data.message} Delivered to ${response.data.deliveredCount || 0} user(s).`);
      setNotificationForm((current) => ({ ...current, title: "", message: "", userId: "" }));
      loadUsers();
    } catch (notificationError) {
      setError(notificationError.response?.data?.message || "Unable to send notification.");
    }
  };

  const approveResetRequest = async (request) => {
    const confirmed = window.confirm(`Approve password reset for ${request.fullName}?`);
    if (!confirmed) return;
    setMessage("");
    setError("");
    try {
      const response = await api.patch(`/admin/password-reset-requests/${request.id}/approve`);
      setMessage([response.data.message, emailStatusText(response.data.emailStatus)].filter(Boolean).join(" "));
      loadUsers();
    } catch (approveError) {
      setError(approveError.response?.data?.message || "Unable to approve password reset request.");
    }
  };

  const rejectResetRequest = async (request) => {
    const adminNote = window.prompt(`Reject password reset for ${request.fullName}? Optional note:`, "");
    if (adminNote === null) return;
    setMessage("");
    setError("");
    try {
      const response = await api.patch(`/admin/password-reset-requests/${request.id}/reject`, { adminNote });
      setMessage([response.data.message, emailStatusText(response.data.emailStatus)].filter(Boolean).join(" "));
      loadUsers();
    } catch (rejectError) {
      setError(rejectError.response?.data?.message || "Unable to reject password reset request.");
    }
  };

  return (
    <AdminLayout title="User Management">
      {message && <p className="mb-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p>}
      {error && <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
      <form onSubmit={createUser} className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold text-brandBlue">{editingId ? "Edit User" : "Create Pre-Approved User"}</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <input name="universityId" value={formData.universityId} onChange={handleChange} placeholder="University ID" className="rounded-2xl border border-slate-300 px-4 py-3" required />
          <input name="fullName" value={formData.fullName} onChange={handleChange} placeholder="Full name" className="rounded-2xl border border-slate-300 px-4 py-3" required />
          <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Email" className="rounded-2xl border border-slate-300 px-4 py-3" required />
          <select name="role" value={formData.role} onChange={handleChange} className="rounded-2xl border border-slate-300 px-4 py-3">
            <option value="student">Student</option>
            <option value="lecturer">Lecturer</option>
            <option value="hod">HoD</option>
            <option value="dean">Dean</option>
            <option value="admin">Admin</option>
          </select>
          <select name="departmentId" value={formData.departmentId} onChange={handleChange} disabled={formData.role === "admin"} className="rounded-2xl border border-slate-300 px-4 py-3 disabled:bg-slate-100">
            {departments.map((department) => <option key={department.id} value={department.id}>{department.department_name}</option>)}
          </select>
          <input name="phone" value={formData.phone} onChange={handleChange} placeholder="Phone optional" className="rounded-2xl border border-slate-300 px-4 py-3" />
          {editingId && (
            <select name="status" value={formData.status || "approved"} onChange={handleChange} className="rounded-2xl border border-slate-300 px-4 py-3">
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Deactivated</option>
            </select>
          )}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button className="rounded-2xl bg-brandBlue px-5 py-3 font-semibold text-white">{editingId ? "Save Changes" : "Create User"}</button>
          {editingId && <button type="button" onClick={resetForm} className="rounded-2xl border border-slate-300 px-5 py-3 font-semibold text-slate-700">Cancel</button>}
        </div>
      </form>

      <section className="mb-6 rounded-3xl border border-amber-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">Admin Review</p>
            <h3 className="mt-2 text-xl font-bold text-brandBlue">Password Reset Requests</h3>
          </div>
          <span className="rounded-full bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700">{resetRequests.length} pending</span>
        </div>
        <div className="mt-5 max-h-72 overflow-y-auto overflow-x-hidden">
          <table className="w-full table-fixed divide-y divide-slate-200 text-left text-sm [&_td]:break-words [&_th]:break-words">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="text-slate-500">
                <th className="py-3 pr-4 font-semibold">Request ID</th>
                <th className="py-3 pr-4 font-semibold">University ID</th>
                <th className="py-3 pr-4 font-semibold">User</th>
                <th className="py-3 pr-4 font-semibold">Email</th>
                <th className="py-3 pr-4 font-semibold">Role</th>
                <th className="py-3 pr-4 font-semibold">Requested</th>
                <th className="py-3 pr-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {resetRequests.length === 0 ? (
                <tr><td colSpan="7" className="py-5 text-slate-600">No pending password reset requests.</td></tr>
              ) : resetRequests.map((request) => (
                <tr key={request.id} className="border-t border-slate-100">
                  <td className="py-4 pr-4 font-semibold text-brandBlue">#{request.id}</td>
                  <td className="py-4 pr-4">{request.universityId}</td>
                  <td className="py-4 pr-4 font-medium">{request.fullName}</td>
                  <td className="py-4 pr-4 text-slate-600">{request.email}</td>
                  <td className="py-4 pr-4 capitalize text-slate-600">{request.role}</td>
                  <td className="py-4 pr-4 text-slate-600">{new Date(request.requestedAt).toLocaleString()}</td>
                  <td className="py-4 pr-4 whitespace-nowrap">
                    <div className="inline-flex flex-nowrap gap-2">
                      <button onClick={() => approveResetRequest(request)} className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white">Approve</button>
                      <button onClick={() => rejectResetRequest(request)} className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white">Reject</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brandGold">Notifications</p>
            <h3 className="mt-2 text-xl font-bold text-brandBlue">Send User Notification</h3>
          </div>
          <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-brandBlue">Admin only</span>
        </div>

        <form onSubmit={sendNotification} className="mt-5 grid gap-4 lg:grid-cols-6">
          <input
            name="title"
            value={notificationForm.title}
            onChange={handleNotificationChange}
            placeholder="Notification title"
            className="rounded-2xl border border-slate-300 px-4 py-3 lg:col-span-2"
            required
          />
          <select
            name="type"
            value={notificationForm.type}
            onChange={handleNotificationChange}
            className="rounded-2xl border border-slate-300 px-4 py-3"
          >
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="system">System</option>
          </select>
          <select
            name="targetType"
            value={notificationForm.targetType}
            onChange={handleNotificationChange}
            className="rounded-2xl border border-slate-300 px-4 py-3"
          >
            <option value="role">Role</option>
            <option value="user">Specific User</option>
            <option value="all">All Users</option>
          </select>
          {notificationForm.targetType === "role" && (
            <select
              name="role"
              value={notificationForm.role}
              onChange={handleNotificationChange}
              className="rounded-2xl border border-slate-300 px-4 py-3"
            >
              <option value="student">Students</option>
              <option value="lecturer">Lecturers</option>
              <option value="hod">HoDs</option>
              <option value="dean">Dean</option>
              <option value="admin">Admins</option>
            </select>
          )}
          {notificationForm.targetType === "user" && (
            <select
              name="userId"
              value={notificationForm.userId}
              onChange={handleNotificationChange}
              className="rounded-2xl border border-slate-300 px-4 py-3"
              required
            >
              <option value="">Select user</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name} ({user.university_id})
                </option>
              ))}
            </select>
          )}
          <textarea
            name="message"
            value={notificationForm.message}
            onChange={handleNotificationChange}
            placeholder="Notification message"
            className="min-h-24 rounded-2xl border border-slate-300 px-4 py-3 lg:col-span-5"
            required
          />
          <button className="rounded-2xl bg-brandBlue px-5 py-3 font-semibold text-white lg:self-end">Send</button>
        </form>
      </section>

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
        <div className="max-h-[36rem] overflow-y-auto overflow-x-hidden">
          <table className="w-full table-fixed divide-y divide-slate-200 text-left text-sm [&_td]:break-words [&_th]:break-words">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="text-slate-500">
                <th className="py-3 pr-4 font-semibold">Name</th>
                <th className="py-3 pr-4 font-semibold">University ID</th>
                <th className="py-3 pr-4 font-semibold">Email</th>
                <th className="py-3 pr-4 font-semibold">Phone</th>
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
                  <td className="py-4 pr-4 font-semibold text-brandBlue">{user.university_id}</td>
                  <td className="py-4 pr-4 text-slate-600">{user.email}</td>
                  <td className="py-4 pr-4 text-slate-600">{user.phone || "-"}</td>
                  <td className="py-4 pr-4 capitalize text-slate-600">{user.role}</td>
                  <td className="py-4 pr-4 text-slate-600">{user.department_name}</td>
                  <td className="py-4 pr-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                      user.status === "approved"
                        ? "bg-emerald-50 text-emerald-700"
                        : user.status === "pending"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-red-50 text-red-700"
                    }`}>
                      {user.status === "rejected" ? "deactivated" : user.status}
                    </span>
                  </td>
                  <td className="py-4 pr-4 text-slate-600">{new Date(user.created_at).toLocaleDateString()}</td>
                  <td className="py-4 pr-4 whitespace-nowrap">
                    <div className="inline-flex flex-nowrap overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <button onClick={() => editUser(user)} className="px-3 py-2 text-xs font-semibold text-brandBlue hover:bg-blue-50">Edit</button>
                      {user.status === "approved" ? (
                        <button onClick={() => deactivateUser(user)} className="border-l border-slate-200 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50">Deactivate</button>
                      ) : (
                        <button onClick={() => activateUser(user)} className="border-l border-slate-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50">Activate</button>
                      )}
                      <button onClick={() => resetPassword(user.id)} className="border-l border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Reset</button>
                      <button onClick={() => deleteUser(user)} className="border-l border-slate-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">Delete</button>
                    </div>
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
