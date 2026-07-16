import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout.jsx";
import api from "../api/axios.js";
import SearchableSelect from "../components/SearchableSelect.jsx";
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
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
    setMessage("");
    setError("");
    const payload = {
      ...formData,
      department_id: formData.department_id ? Number(formData.department_id) : null,
    };
    try {
      const response = await api.post("/announcements", payload);
      setMessage(`${response.data.message} Notified ${response.data.notificationCount || 0} user(s).`);
      setFormData(emptyForm);
      loadData();
    } catch (announcementError) {
      setError(announcementError.response?.data?.message || "Unable to create announcement.");
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Delete this announcement?");
    if (!confirmed) return;
    await api.delete(`/announcements/${id}`);
    loadData();
  };

  return (
    <AdminLayout title="Announcements">
      {message && <p className="mb-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p>}
      {error && <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-bold text-brandBlue">Create Announcement</h3>
          <div className="mt-5 space-y-4">
            <input name="title" value={formData.title} onChange={handleChange} placeholder="Title" className="w-full rounded-2xl border border-slate-300 px-4 py-3" required />
            <textarea name="message" value={formData.message} onChange={handleChange} placeholder="Message" rows="5" className="w-full rounded-2xl border border-slate-300 px-4 py-3" required />
            <SearchableSelect
              name="target_role"
              value={formData.target_role}
              onChange={handleChange}
              options={[
                { value: "all", label: "All Users" },
                { value: "student", label: "Students" },
                { value: "lecturer", label: "Lecturers" },
                { value: "admin", label: "Admins" },
                { value: "hod", label: "HoD" },
                { value: "dean", label: "Dean" },
              ]}
            />
            <SearchableSelect
              name="department_id"
              value={formData.department_id}
              onChange={handleChange}
              options={[
                { value: "", label: "Specific department optional" },
                ...departments.map((department) => ({
                  value: department.id,
                  label: department.department_name,
                }))
              ]}
            />
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
