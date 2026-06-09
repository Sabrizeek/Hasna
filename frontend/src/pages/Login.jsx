import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import PasswordInput from "../components/PasswordInput.jsx";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") === "student" ? "student" : "staff";
  const [mode, setMode] = useState(initialMode);
  const [formData, setFormData] = useState({ identifier: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const setLoginMode = (nextMode) => {
    setMode(nextMode);
    setFormData({ identifier: "", password: "" });
    setError("");
    setSearchParams({ mode: nextMode });
  };

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await login(formData.identifier, formData.password, mode);
      if (user.mustChangePassword) {
        navigate("/change-password", { replace: true });
        return;
      }
      navigate(homeByRole[user.role] || "/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isStudent = mode === "student";

  return (
    <div className="min-h-screen bg-brandBg">
      <Navbar />
      <div className="grid min-h-[calc(100vh-80px)] place-items-center px-4 py-10 sm:px-6 lg:px-10">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brandGold">Welcome Back</p>
          <h1 className="mt-3 text-3xl font-bold text-brandBlue">{isStudent ? "Student Login" : "Staff Login"}</h1>

          <div className="mt-6 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
            <button type="button" onClick={() => setLoginMode("student")} className={`rounded-xl px-4 py-2 text-sm font-semibold ${isStudent ? "bg-white text-brandBlue shadow-sm" : "text-slate-600"}`}>Student</button>
            <button type="button" onClick={() => setLoginMode("staff")} className={`rounded-xl px-4 py-2 text-sm font-semibold ${!isStudent ? "bg-white text-brandBlue shadow-sm" : "text-slate-600"}`}>Staff</button>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {isStudent ? "University ID" : "University ID or Email"}
              </label>
              <input
                name="identifier"
                value={formData.identifier}
                onChange={handleChange}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-brandBlue"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
              <PasswordInput name="password" value={formData.password} onChange={handleChange} required />
            </div>
            <div className="text-right">
              <Link to="/forgot-password" className="text-sm font-semibold text-brandBlue">Forgot Password?</Link>
            </div>
            {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
            <button disabled={loading} className="w-full rounded-2xl bg-brandBlue px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
