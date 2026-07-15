import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios.js";
import "../styles/landing.css";

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
    <>
      <nav className="nav">
        <div className="wrap">
          <a className="brand" href="#top">
            <img src="/assets/images/crest.png" alt="University of Ruhuna crest" style={{ height: "44px", width: "auto" }} />
            <div className="brand-text">
              <span className="b1">Faculty of Science</span>
              <span className="b2">University of Ruhuna</span>
            </div>
          </a>
          <div className="nav-actions">
            <Link to="/login?mode=student" className="btn btn-ghost">Student Portal</Link>
            <Link to="/login?mode=staff" className="btn btn-gold">Staff Portal <span aria-hidden="true">&rarr;</span></Link>
          </div>
        </div>
      </nav>

      <section className="hero" id="top">
        <div className="hero-bg"></div>
        <div className="wrap hero-content">
          <div className="eyebrow">Lecturer Evaluation System</div>
          <h1>Empowering Academic Excellence</h1>
          <p>A transparent and efficient platform for evaluating teaching effectiveness and fostering continuous improvement within the Faculty of Science.</p>
          <div className="hero-actions">
            <Link to="/login?mode=student" className="btn btn-gold">Student Login <span aria-hidden="true">&rarr;</span></Link>
            <Link to="/login?mode=staff" className="btn btn-ghost">Staff Login</Link>
          </div>
        </div>
      </section>

      <section className="section" id="announcements">
        <div className="wrap">
          <div className="section-head">
            <h2>Latest Announcements</h2>
            <p>Stay updated with the latest news, deadlines, and important notices from the faculty administration.</p>
          </div>
          
          <div className="announcements-grid">
            {loading ? (
              <div className="announcement-card"><p>Loading announcements...</p></div>
            ) : announcements.length === 0 ? (
              <div className="announcement-card"><p>No announcements available.</p></div>
            ) : (
              announcements.map((announcement) => (
                <article key={announcement.id} className="announcement-card">
                  <div className="ac-meta">{announcement.target_role} &bull; {new Date(announcement.created_at).toLocaleDateString()}</div>
                  <h3 className="ac-title">{announcement.title}</h3>
                  <p className="ac-desc">{announcement.message}</p>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="wrap">
          <div className="footer-top">
            <div className="brand footer-brand">
              <img src="/assets/images/crest.png" alt="University of Ruhuna crest" style={{ height: "44px", width: "auto" }} />
              <div>
                <div className="b2">Faculty of Science</div>
                <p>University of Ruhuna, Wellamadama, Matara, Sri Lanka.</p>
              </div>
            </div>
            <div className="footer-cols">
              <div className="footer-col">
                <h4>System</h4>
                <Link to="/login?mode=student">Student login</Link>
                <Link to="/login?mode=staff">Staff login</Link>
                <Link to="#">Help &amp; support</Link>
              </div>
              <div className="footer-col">
                <h4>Faculty</h4>
                <Link to="#">Departments</Link>
                <Link to="#">Academic calendar</Link>
                <Link to="#">Faculty website</Link>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <span>&copy; 2026 Faculty of Science, University of Ruhuna. All rights reserved.</span>
            <span>Built for the students and staff of Ruhuna.</span>
          </div>
        </div>
      </footer>
    </>
  );
};

export default LandingPage;
