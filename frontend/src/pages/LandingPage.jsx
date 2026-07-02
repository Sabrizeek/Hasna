import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
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

      <section className="relative overflow-hidden bg-gradient-to-br from-brandBlue via-slate-900 to-slate-800 px-4 py-24 text-white sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.25),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.1),transparent_40%)]" />
        
        {/* Decorative ambient light */}
        <div className="absolute left-1/2 top-0 -translate-x-1/2 rounded-full bg-brandGold/20 blur-[120px] w-[600px] h-[300px] pointer-events-none" />

        <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center pt-8 pb-12">
          <div className="inline-flex rounded-full border border-white/20 bg-white/5 backdrop-blur-md px-5 py-2.5 text-xs font-bold uppercase tracking-[0.35em] text-brandGold shadow-xl">
            Faculty of Science • University of Ruhuna
          </div>
          
          <h1 className="mt-10 text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl lg:leading-[1.15]">
            <span className="text-white drop-shadow-sm">Lecturer Evaluation</span>
            <br />
            <span className="bg-gradient-to-r from-brandGold via-yellow-200 to-amber-500 bg-clip-text text-transparent drop-shadow-sm">
              System
            </span>
          </h1>
          
          <div className="mt-14 flex flex-wrap justify-center gap-6">
            <Link to="/login?mode=student" className="rounded-full bg-gradient-to-r from-brandGold to-amber-500 px-8 py-4 text-sm font-bold text-slate-900 shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl hover:opacity-95">
              Student Login
            </Link>
            <Link to="/login?mode=staff" className="rounded-full border border-white/20 bg-white/10 backdrop-blur-md px-8 py-4 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-1 hover:bg-white/20 hover:shadow-xl">
              Staff Login
            </Link>
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
      <SiteFooter />
    </div>
  );
};

export default LandingPage;
