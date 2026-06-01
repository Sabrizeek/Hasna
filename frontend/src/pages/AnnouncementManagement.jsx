import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout.jsx";
import api from "../api/axios.js";

const emptyForm = {
  title: "",
  message: "",
  target_role: "all",
  department_id: "",
};

const AnnouncementManagement = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [formData, setFormData] = useState(emptyForm);

  const loadData = async () => {
    const [announcementsRes, departmentsRes] = await Promise.all([
      api.get("/announcements"),
      api.get("/departments"),
    ]);
    setAnnouncements(announcementsRes.data.announcements || []);
    setDepartments(departmentsRes.data.departments || []);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      ...formData,
      department_id: formData.department_id ? Number(formData.department_id) : null,
    };
    await api.post("/announcements", payload);
    setFormData(emptyForm);
    loadData();
  };

  const handleDelete = async (id) => {
    await api.delete(`/announcements/${id}`);
    loadData();
  };

  return (
    <AdminLayout title="Announcements">
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-bold text-brandBlue">Create Announcement</h3>
          <div className="mt-5 space-y-4">
            <input name="title" value={formData.title} onChange={handleChange} placeholder="Title" className="w-full rounded-2xl border border-slate-300 px-4 py-3" required />
            <textarea name="message" value={formData.message} onChange={handleChange} placeholder="Message" rows="5" className="w-full rounded-2xl border border-slate-300 px-4 py-3" required />
            <select name="target_role" value={formData.target_role} onChange={handleChange} className="w-full rounded-2xl border border-slate-300 px-4 py-3">
              <option value="all">All Users</option>
              <option value="student">Students</option>
              <option value="lecturer">Lecturers</option>
              <option value="admin">Admins</option>
              <option value="hod">HoD</option>
              <option value="dean">Dean</option>
            </select>
            <select name="department_id" value={formData.department_id} onChange={handleChange} className="w-full rounded-2xl border border-slate-300 px-4 py-3">
              <option value="">Specific department optional</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>{department.department_name}</option>
              ))}
            </select>
          </div>
          <button className="mt-5 rounded-2xl bg-brandBlue px-5 py-3 font-semibold text-white">Publish</button>
        </form>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            {announcements.map((announcement) => (
              <article key={announcement.id} className="rounded-2xl border border-slate-200 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brandGold">{announcement.target_role}</p>
                <h3 className="mt-3 text-lg font-bold text-brandBlue">{announcement.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{announcement.message}</p>
                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span>{announcement.department_name || "All departments"}</span>
                  <button onClick={() => handleDelete(announcement.id)} className="rounded-full bg-red-600 px-4 py-2 font-semibold text-white">Delete</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AnnouncementManagement;
