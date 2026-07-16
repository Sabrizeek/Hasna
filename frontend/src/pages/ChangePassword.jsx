import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import "../styles/login.css";

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
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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
    <>
      <div className="page">
        <aside className="visual">
          <div className="visual-bg"></div>
          <div className="visual-scrim"></div>
          <svg className="flame-mark" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <g stroke="#F2C46D" strokeWidth="0.6" opacity="0.55">
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
            <circle cx="100" cy="100" r="46" fill="none" stroke="#F2C46D" strokeWidth="1" opacity="0.4"/>
            <path d="M100 66c14 16 18 28 18 38a18 18 0 1 1-36 0c0-10 4-22 18-38z" fill="#F2C46D" opacity="0.45"/>
          </svg>

          <div className="visual-top">
            <Link className="visual-brand" to="/">
              <img src="/assets/images/crest.png" alt="University of Ruhuna crest" />
              <span>
                <span className="b1" style={{"display":"block"}}>University of Ruhuna</span>
                <span className="b2">Lecturer Evaluation System</span>
              </span>
            </Link>
          </div>

          <div className="visual-bottom">
            <h1>Where feedback shapes <em>better</em> teaching.</h1>
            <p>Sign in to submit or review course evaluations for the Faculty of Science, one semester at a time.</p>
            <div className="visual-meta">
              <div>
                <div className="k">Confidential</div>
                <div className="v">Every response is kept separate from student identity.</div>
              </div>
              <div>
                <div className="k">Faculty-wide</div>
                <div className="v">One system across every department in the faculty.</div>
              </div>
            </div>
          </div>
        </aside>

        <main className="form-side">
          <div className="form-wrap">
            <div className="mobile-brand">
              <img src="/assets/images/crest.png" alt="University of Ruhuna crest" />
              <span>
                <span className="b1" style={{"display":"block"}}>University of Ruhuna</span>
                <span className="b2">Lecturer Evaluation System</span>
              </span>
            </div>

            <span className="eyebrow form-eyebrow">First Login</span>
            <h2 id="formTitle">Change Password</h2>
            <p style={{marginTop: "8px", color: "var(--slate-500)", fontSize: "14px", lineHeight: 1.5}}>
              For security, please change your temporary password before continuing.
            </p>

            <form onSubmit={handleSubmit} autoComplete="off" style={{marginTop: "32px"}}>
              <div className="field">
                <label>Current Password</label>
                <div className="input-wrap">
                  <input type={showCurrent ? "text" : "password"} name="currentPassword" placeholder="Enter current password" required value={formData.currentPassword} onChange={handleChange} />
                  <button type="button" className="toggle-visibility" onClick={() => setShowCurrent(!showCurrent)} aria-label="Show password">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </div>
              </div>

              <div className="field">
                <label>New Password</label>
                <div className="input-wrap">
                  <input type={showNew ? "text" : "password"} name="newPassword" minLength="8" placeholder="Enter new password" required value={formData.newPassword} onChange={handleChange} />
                  <button type="button" className="toggle-visibility" onClick={() => setShowNew(!showNew)} aria-label="Show password">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </div>
              </div>

              <div className="field">
                <label>Confirm New Password</label>
                <div className="input-wrap">
                  <input type={showConfirm ? "text" : "password"} name="confirmPassword" minLength="8" placeholder="Confirm new password" required value={formData.confirmPassword} onChange={handleChange} />
                  <button type="button" className="toggle-visibility" onClick={() => setShowConfirm(!showConfirm)} aria-label="Show password">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                </div>
              </div>

              {error && <div style={{background: "#FEE2E2", color: "#B91C1C", padding: "12px", borderRadius: "8px", marginBottom: "20px", fontSize: "14px", fontWeight: "500"}}>{error}</div>}
              <button type="submit" disabled={loading} className="btn-submit" style={{opacity: loading ? 0.7 : 1, marginTop: "10px"}}>{loading ? "Saving..." : "Save Password"}</button>
            </form>
          </div>
        </main>
      </div>
    </>
  );
};

export default ChangePassword;
