import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

const ChangePassword = () => {
  const { user, changePassword } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (formData.newPassword !== formData.confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword,
      });
      const updatedUser = response.user || user;
      navigate(homeByRole[updatedUser.role] || "/", { replace: true });
    } catch (changeError) {
      setError(changeError.response?.data?.message || "Unable to change password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brandBg">
      <Navbar />
      <main className="grid min-h-[calc(100vh-80px)] place-items-center px-4 py-10 sm:px-6 lg:px-10">
        <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brandGold">First Login</p>
          <h1 className="mt-3 text-3xl font-bold text-brandBlue">Change Password</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            For security, please change your default password before continuing.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Current Password</label>
              <PasswordInput name="currentPassword" value={formData.currentPassword} onChange={handleChange} required />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">New Password</label>
              <PasswordInput name="newPassword" minLength="8" value={formData.newPassword} onChange={handleChange} required />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Confirm New Password</label>
              <PasswordInput name="confirmPassword" minLength="8" value={formData.confirmPassword} onChange={handleChange} required />
            </div>
            {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            <button disabled={loading} className="w-full rounded-2xl bg-brandBlue px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
              {loading ? "Saving..." : "Save Password"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
};

export default ChangePassword;
