import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import api from "../api/axios.js";

const ForgotPassword = () => {
  const [formData, setFormData] = useState({ universityId: "", email: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);
    try {
      const response = await api.post("/auth/forgot-password-request", formData);
      setMessage(response.data.message);
      setFormData({ universityId: "", email: "" });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to submit password reset request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brandBg">
      <Navbar />
      <main className="grid min-h-[calc(100vh-80px)] place-items-center px-4 py-10">
        <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brandGold">Password Help</p>
          <h1 className="mt-3 text-3xl font-bold text-brandBlue">Forgot Password</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Submit your University ID and email. The Admin will review your request.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">University ID</label>
              <input
                name="universityId"
                value={formData.universityId}
                onChange={handleChange}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-brandBlue"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-brandBlue"
                required
              />
            </div>
            {message && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}
            {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            <button disabled={loading} className="w-full rounded-2xl bg-brandBlue px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-60">
              {loading ? "Sending Request..." : "Send Request"}
            </button>
          </form>

          <Link to="/login" className="mt-5 inline-flex text-sm font-semibold text-brandBlue">Back to Login</Link>
        </section>
      </main>
    </div>
  );
};

export default ForgotPassword;
