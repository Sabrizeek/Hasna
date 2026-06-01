import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const homeByRole = {
  admin: "/admin/dashboard",
  student: "/student/dashboard",
  lecturer: "/lecturer/dashboard",
  hod: "/hod/dashboard",
  dean: "/dean/dashboard",
};

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await login(formData.email, formData.password);
      navigate(homeByRole[user.role] || "/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brandBg">
      <Navbar />
      <div className="mx-auto grid min-h-[calc(100vh-80px)] max-w-7xl place-items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brandGold">Welcome Back</p>
          <h1 className="mt-3 text-3xl font-bold text-brandBlue">Login</h1>
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
              <input name="email" type="email" value={formData.email} onChange={handleChange} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-brandBlue" required />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
              <input name="password" type="password" value={formData.password} onChange={handleChange} className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-brandBlue" required />
            </div>
            {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
            <button disabled={loading} className="w-full rounded-2xl bg-brandBlue px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
          <p className="mt-6 text-sm text-slate-600">
            New user? <Link to="/register" className="font-semibold text-brandBlue">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
