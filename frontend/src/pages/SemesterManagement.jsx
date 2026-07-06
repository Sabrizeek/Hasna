import { useEffect, useState } from "react";
import AdminLayout from "../components/AdminLayout.jsx";
import api from "../api/axios.js";

const emptyForm = { semester_name: "", academic_year: "", is_active: false };

const SemesterManagement = () => {
  const [semesters, setSemesters] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const loadSemesters = async () => {
    const response = await api.get("/semesters");
    setSemesters(response.data.semesters || []);
  };

  useEffect(() => {
    loadSemesters();
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (editingId) {
      await api.put(`/semesters/${editingId}`, formData);
    } else {
      await api.post("/semesters", formData);
    }
    setFormData(emptyForm);
    setEditingId(null);
    loadSemesters();
  };

  const handleEdit = (semester) => {
    setEditingId(semester.id);
    setFormData({
      semester_name: semester.semester_name,
      academic_year: semester.academic_year,
      is_active: Number(semester.is_active) === 1,
    });
  };

  const handleDelete = async (id) => {
    await api.delete(`/semesters/${id}`);
    loadSemesters();
  };

  const toggleActive = async (semester) => {
    await api.put(`/semesters/${semester.id}`, {
      semester_name: semester.semester_name,
      academic_year: semester.academic_year,
      is_active: !Number(semester.is_active),
    });
    loadSemesters();
  };

  return (
    <AdminLayout title="Semesters">
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-bold text-brandBlue">{editingId ? "Edit Semester" : "Add Semester"}</h3>
          <div className="mt-5 space-y-4">
            <input name="semester_name" value={formData.semester_name} onChange={handleChange} placeholder="Semester name" className="w-full rounded-2xl border border-slate-300 px-4 py-3" required />
            <input name="academic_year" value={formData.academic_year} onChange={handleChange} placeholder="Academic year" className="w-full rounded-2xl border border-slate-300 px-4 py-3" required />
            <label className="flex items-center gap-3 text-sm text-slate-700">
              <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} />
              Active semester
            </label>
          </div>
          <button className="mt-5 rounded-2xl bg-brandBlue px-5 py-3 font-semibold text-white">{editingId ? "Update" : "Save"}</button>
        </form>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="max-h-[34rem] overflow-y-auto overflow-x-auto">
            <table className="w-full table-fixed text-left text-sm [&_td]:break-words [&_th]:break-words min-w-[600px]">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="text-slate-500">
                  <th className="py-3 pr-4 font-semibold">Semester</th>
                  <th className="py-3 pr-4 font-semibold">Year</th>
                  <th className="py-3 pr-4 font-semibold">Active</th>
                  <th className="w-[300px] py-3 pr-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {semesters.map((semester) => (
                  <tr key={semester.id} className="border-t border-slate-100">
                    <td className="py-4 pr-4 font-medium">{semester.semester_name}</td>
                    <td className="py-4 pr-4 text-slate-600">{semester.academic_year}</td>
                    <td className="py-4 pr-4 text-slate-600">{Number(semester.is_active) === 1 ? "Yes" : "No"}</td>
                    <td className="py-4 pr-4 whitespace-nowrap">
                      <div className="inline-flex flex-nowrap gap-2">
                        <button onClick={() => toggleActive(semester)} type="button" className={`rounded-full px-4 py-2 text-xs font-semibold text-white transition ${Number(semester.is_active) === 1 ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700'}`}>
                          {Number(semester.is_active) === 1 ? 'Deactivate' : 'Activate'}
                        </button>
                        <button onClick={() => handleEdit(semester)} type="button" className="rounded-full border border-brandBlue px-4 py-2 text-xs font-semibold text-brandBlue">Edit</button>
                        <button onClick={() => handleDelete(semester.id)} type="button" className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SemesterManagement;
