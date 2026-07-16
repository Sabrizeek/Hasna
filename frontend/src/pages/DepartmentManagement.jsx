import { useEffect, useState, useMemo } from "react";
import AdminLayout from "../components/AdminLayout.jsx";
import api from "../api/axios.js";

const emptyForm = { department_name: "", faculty_name: "" };

const DepartmentManagement = () => {
  const [departments, setDepartments] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDepartments = useMemo(() => {
    return departments.filter(d => 
      (d.department_name + " " + d.faculty_name).toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [departments, searchQuery]);

  const loadDepartments = async () => {
    const response = await api.get("/departments");
    setDepartments(response.data.departments || []);
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (editingId) {
      await api.put(`/departments/${editingId}`, formData);
    } else {
      await api.post("/departments", formData);
    }
    setFormData(emptyForm);
    setEditingId(null);
    loadDepartments();
  };

  const handleEdit = (department) => {
    setEditingId(department.id);
    setFormData({ department_name: department.department_name, faculty_name: department.faculty_name });
  };

  const handleDelete = async (id) => {
    await api.delete(`/departments/${id}`);
    loadDepartments();
  };

  return (
    <AdminLayout title="Departments">
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-bold text-brandBlue">{editingId ? "Edit Department" : "Add Department"}</h3>
          <div className="mt-5 space-y-4">
            <input name="department_name" value={formData.department_name} onChange={handleChange} placeholder="Department name" className="w-full rounded-2xl border border-slate-300 px-4 py-3" required />
            <input name="faculty_name" value={formData.faculty_name} onChange={handleChange} placeholder="Faculty name" className="w-full rounded-2xl border border-slate-300 px-4 py-3" required />
          </div>
          <button className="mt-5 rounded-2xl bg-brandBlue px-5 py-3 font-semibold text-white">{editingId ? "Update" : "Save"}</button>
        </form>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col min-w-0">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold text-brandBlue">Departments</h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{filteredDepartments.length} records</span>
            </div>
            <input 
              placeholder="Search departments..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-brandBlue w-full sm:w-64"
            />
          </div>
          <div className="max-h-[34rem] overflow-y-auto overflow-x-auto w-full">
            <table className="w-full min-w-[600px] text-left text-sm [&_td]:break-words [&_th]:break-words">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="text-slate-500">
                  <th className="py-3 pr-4 font-semibold">Department</th>
                  <th className="py-3 pr-4 font-semibold">Faculty</th>
                  <th className="py-3 pr-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDepartments.map((department) => (
                  <tr key={department.id} className="border-t border-slate-100">
                    <td className="py-4 pr-4 font-medium">{department.department_name}</td>
                    <td className="py-4 pr-4 text-slate-600">{department.faculty_name}</td>
                    <td className="py-4 pr-4 whitespace-nowrap">
                      <div className="inline-flex flex-nowrap gap-2">
                        <button onClick={() => handleEdit(department)} type="button" className="rounded-full border border-brandBlue px-4 py-2 text-xs font-semibold text-brandBlue">Edit</button>
                        <button onClick={() => handleDelete(department.id)} type="button" className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white">Delete</button>
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

export default DepartmentManagement;
