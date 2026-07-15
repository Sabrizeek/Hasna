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
      {/**/}
<nav className="nav">
  <div className="wrap">
    <a className="brand" href="#top">
      <img src="/assets/images/crest.png" alt="University of Ruhuna crest" />
      <span className="brand-text">
        <span className="b1">University of Ruhuna</span>
        <span className="b2">Lecturer Evaluation System</span>
      </span>
    </a>
    <div className="nav-actions">
      <Link className="btn btn-ghost" to="/login?mode=student">Student Login</Link>
      <Link className="btn btn-gold" to="/login?mode=staff">Staff Login</Link>
    </div>
  </div>
</nav>

{/**/}
<header className="hero" id="top">
  <div className="hero-bg"></div>
  <div className="hero-scrim"></div>
  <div className="hero-glow"></div>
  <svg className="flame-mark" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g stroke="#F2C46D" strokeWidth="0.6" opacity="0.6">
      <line x1="100" y1="100" x2="100" y2="6" transform="rotate(0 100 100)"/>
      <line x1="100" y1="100" x2="100" y2="6" transform="rotate(30 100 100)"/>
      <line x1="100" y1="100" x2="100" y2="6" transform="rotate(60 100 100)"/>
      <line x1="100" y1="100" x2="100" y2="6" transform="rotate(90 100 100)"/>
      <line x1="100" y1="100" x2="100" y2="6" transform="rotate(120 100 100)"/>
      <line x1="100" y1="100" x2="100" y2="6" transform="rotate(150 100 100)"/>
      <line x1="100" y1="100" x2="100" y2="6" transform="rotate(180 100 100)"/>
      <line x1="100" y1="100" x2="100" y2="6" transform="rotate(210 100 100)"/>
      <line x1="100" y1="100" x2="100" y2="6" transform="rotate(240 100 100)"/>
      <line x1="100" y1="100" x2="100" y2="6" transform="rotate(270 100 100)"/>
      <line x1="100" y1="100" x2="100" y2="6" transform="rotate(300 100 100)"/>
      <line x1="100" y1="100" x2="100" y2="6" transform="rotate(330 100 100)"/>
    </g>
    <circle cx="100" cy="100" r="46" fill="none" stroke="#F2C46D" strokeWidth="1" opacity="0.45"/>
    <path d="M100 66c14 16 18 28 18 38a18 18 0 1 1-36 0c0-10 4-22 18-38z" fill="#F2C46D" opacity="0.5"/>
  </svg>

  <div className="wrap hero-content">
    <span className="hero-pill"><span className="dot"></span>Faculty of Science &middot; University of Ruhuna</span>
    <h1>Honest feedback, <em>better</em> teaching.</h1>
    <p className="hero-sub">A structured way for students to reflect on their learning experience each semester &mdash; and for lecturers to see it clearly, term after term.</p>
    <div className="hero-cta">
      <Link className="btn btn-gold" to="/login?mode=student" id="student-login">Student Login</Link>
      <Link className="btn btn-ghost" to="/login?mode=staff" id="staff-login">Staff Login</Link>
    </div>

    <div className="hero-meta">
      <div>
        <div className="k">Confidential by design</div>
        <div className="v">Responses are never attributed to an individual student.</div>
      </div>
      <div>
        <div className="k">One system, every department</div>
        <div className="v">A single evaluation process across the Faculty of Science.</div>
      </div>
      <div>
        <div className="k">Built for reflection</div>
        <div className="v">Ratings paired with open comments, not just numbers.</div>
      </div>
    </div>
  </div>
</header>

{/**/}
<section className="features">
  <div className="wrap">
    <div className="section-head">
      <span className="eyebrow">Why this system</span>
      <h2>Feedback that's easy to give, and hard to ignore.</h2>
      <p>Evaluations only matter if students trust the process and lecturers can act on it. Every part of this system is built around that.</p>
    </div>

    <div className="feature-grid">
      <div className="feature-card">
        <div className="feature-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="#F2C46D" strokeWidth="1.8"><rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
        </div>
        <h3>Confidential responses</h3>
        <p>Student identities are separated from submitted evaluations, so feedback stays candid without fear of consequence.</p>
      </div>
      <div className="feature-card">
        <div className="feature-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="#F2C46D" strokeWidth="1.8"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        </div>
        <h3>Structured criteria</h3>
        <p>Every course is rated against the same clear criteria &mdash; clarity, engagement, fairness &mdash; so results are consistent and comparable.</p>
      </div>
      <div className="feature-card">
        <div className="feature-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="#F2C46D" strokeWidth="1.8"><path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/></svg>
        </div>
        <h3>Insight for lecturers</h3>
        <p>Staff see their results by course and semester, with trends over time &mdash; not just a single score in isolation.</p>
      </div>
    </div>
  </div>
</section>

{/**/}
<section className="process">
  <div className="wrap">
    <div className="section-head">
      <span className="eyebrow">How it works</span>
      <h2>Three steps, once a semester.</h2>
      <p>The evaluation window opens near the end of each semester and takes most students under five minutes to complete per course.</p>
    </div>

    <div className="steps">
      <div className="step">
        <span className="num">01</span>
        <h3>Sign in with your student ID</h3>
        <p>Log in with your university credentials to see the courses open for evaluation this semester.</p>
      </div>
      <div className="step">
        <span className="num">02</span>
        <h3>Rate each course you're enrolled in</h3>
        <p>Answer a short set of questions per course, and add written comments where you have something to say.</p>
      </div>
      <div className="step">
        <span className="num">03</span>
        <h3>Submit &mdash; anonymously</h3>
        <p>Your submission is recorded without your identity attached before it ever reaches faculty staff.</p>
      </div>
    </div>
  </div>
</section>

{/**/}
<section className="about">
  <div className="wrap about-grid">
    <div className="about-copy">
      <div className="section-head">
        <span className="eyebrow">Faculty of Science</span>
        <h2>Rooted in a faculty built on inquiry.</h2>
        <p>Since its founding, the Faculty of Science at the University of Ruhuna has trained generations of scientists at this Matara faculty. The evaluation system exists to keep that standard of teaching honest and improving.</p>
      </div>
      <ul className="about-list">
        <li>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
          <span>One evaluation record per student, per course, per semester.</span>
        </li>
        <li>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
          <span>Departmental coordinators review aggregated results, never individual responses.</span>
        </li>
        <li>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
          <span>Accessible from any device, on or off the university grounds, during the evaluation window.</span>
        </li>
      </ul>
    </div>

    <div className="about-media">
      <img className="media-tall" src="/assets/images/Ruhuna_Building_Aerial_enhanced.png" alt="Aerial view of the Faculty of Science building surrounded by trees" />
      <div className="media-stack">
        <img src="/assets/images/Ruhuna_Corridor_Sunset_enhanced.png" alt="Corridor of the faculty building at sunset" />
        <img src="/assets/images/Ruhuna_Building_Frontview_enhanced.png" alt="Front view of the Faculty of Science building" />
      </div>
      <div className="media-badge">
        <div className="k">Matara, Sri Lanka</div>
        <div className="v">Faculty of Science, University of Ruhuna</div>
      </div>
    </div>
  </div>
</section>

{/**/}
<section style={{"padding":"0 0 110px"}}>
  <div className="cta-banner">
    <div className="cta-text">
      <span className="eyebrow">Ready when you are</span>
      <h2>Sign in to give or review this semester's feedback.</h2>
      <p>Students submit course evaluations. Staff review results by course, department, and semester.</p>
    </div>
    <div className="cta-actions">
      <Link className="btn btn-gold" to="/login?mode=student">Student Login</Link>
      <Link className="btn btn-ghost" to="/login?mode=staff" style={{"borderColor":"rgba(250,246,239,.4)","color":"#FAF6EF"}}>Staff Login</Link>
    </div>
  </div>
</section>

{/* ANNOUNCEMENTS SECTION PRESERVED */}
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

      
      {/**/}
<footer>
  <div className="wrap">
    <div className="footer-top">
      <div className="footer-brand">
        <img src="/assets/images/crest.png" alt="University of Ruhuna crest" />
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
          <a href="#">Help &amp; support</a>
        </div>
        <div className="footer-col">
          <h4>Faculty</h4>
          <a href="#">Departments</a>
          <a href="#">Academic calendar</a>
          <a href="#">Faculty website</a>
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
