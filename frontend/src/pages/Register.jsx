import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";

const fallbackDepartments = [
  { id: 1, department_name: "Department of Computer Science" },
  { id: 2, department_name: "Department of Mathematics" },
  { id: 3, department_name: "Department of Chemistry" },
  { id: 4, department_name: "Department of Zoology" },
  { id: 5, department_name: "Department of Botany" },
  { id: 6, department_name: "Department of Physics" },
];

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "student",
    department_id: "1",
  });

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const response = await api.get("/departments");
        const loadedDepartments = response.data.departments || [];
        const departmentsToUse = loadedDepartments.length > 0 ? loadedDepartments : fallbackDepartments;

        setDepartments(departmentsToUse);
        setFormData((current) => ({
          ...current,
          department_id: String(departmentsToUse[0].id),
        }));
      } catch (err) {
        setDepartments(fallbackDepartments);
        setFormData((current) => ({
          ...current,
          department_id: String(fallbackDepartments[0].id),
        }));
      }
    };

    loadDepartments();
  }, []);

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await register({ ...formData, department_id: Number(formData.department_id) });
      setMessage(response.message || "Registration successful. Please wait for admin approval.");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brandBg">
      <Navbar />
      <div className="mx-auto grid min-h-[calc(100vh-80px)] max-w-7xl place-items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brandGold">Create Account</p>
          <h1 className="mt-3 text-3xl font-bold text-brandBlue">Register</h1>
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Full Name</label>
              <input name="full_name" value={formData.full_name} onChange={handleChange} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-brandBlue" required />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
              <input name="email" type="email" value={formData.email} onChange={handleChange} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-brandBlue" required />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
              <input name="password" type="password" value={formData.password} onChange={handleChange} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-brandBlue" required />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Role</label>
                <select name="role" value={formData.role} onChange={handleChange} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-brandBlue">
                  <option value="student">Student</option>
                  <option value="lecturer">Lecturer</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Department</label>
                <select name="department_id" value={formData.department_id} onChange={handleChange} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-brandBlue" required>
                  <option value="" disabled>
                    Select department
                  </option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.department_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {message ? <p className="rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700">{message}</p> : null}
            {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
            <button disabled={loading} className="w-full rounded-2xl bg-brandGold px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
              {loading ? "Registering..." : "Submit"}
            </button>
            <p className="text-xs text-slate-500">
              If the department list is still loading, the form will use the built-in Science departments automatically.
            </p>
          </form>
          <p className="mt-6 text-sm text-slate-600">
            Already have an account? <Link to="/login" className="font-semibold text-brandBlue">Login here</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
