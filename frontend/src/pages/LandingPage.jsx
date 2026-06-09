import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import api from "../api/axios.js";

const LandingPage = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        const response = await api.get("/announcements");
        setAnnouncements(response.data.announcements || []);
      } catch (error) {
        setAnnouncements([]);
      } finally {
        setLoading(false);
      }
    };

    loadAnnouncements();
  }, []);

  return (
    <div className="min-h-screen bg-brandBg">
      <Navbar />

      <section className="relative overflow-hidden bg-gradient-to-br from-brandBlue via-slate-900 to-slate-800 px-4 py-20 text-white sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.25),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_28%)]" />
        <div className="relative grid w-full gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-brandGold">
              Faculty of Science | University of Ruhuna
            </div>
            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
              Lecturer Evaluation System | Faculty of Science | University of Ruhuna
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
              A clean academic platform for lecturer evaluation, account approvals, announcements, and department administration.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/login?mode=student" className="rounded-full bg-brandGold px-6 py-3 font-semibold text-white transition hover:opacity-90">
                Student Login
              </Link>
              <Link to="/login?mode=staff" className="rounded-full border border-white/30 px-6 py-3 font-semibold text-white transition hover:bg-white hover:text-brandBlue">
                Staff Login
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-soft backdrop-blur">
            <div className="rounded-2xl bg-white p-6 text-brandText shadow-xl">
              <div className="text-sm font-semibold uppercase tracking-[0.3em] text-brandGold">System Flow</div>
              <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                <li>1. Admin creates student and staff accounts.</li>
                <li>2. Users receive a University ID and default password.</li>
                <li>3. Students log in with University ID.</li>
                <li>4. Staff log in with University ID or email.</li>
                <li>5. Users change the default password on first login.</li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full px-4 py-16 sm:px-6 lg:px-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brandGold">Announcements</p>
            <h2 className="mt-2 text-3xl font-bold text-brandBlue">Latest updates</h2>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">Loading announcements...</div>
          ) : announcements.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">No announcements available.</div>
          ) : (
            announcements.map((announcement) => (
              <article key={announcement.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brandGold">{announcement.target_role}</p>
                <h3 className="mt-3 text-xl font-bold text-brandBlue">{announcement.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{announcement.message}</p>
                <div className="mt-4 text-xs text-slate-500">{announcement.department_name || "All departments"}</div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
