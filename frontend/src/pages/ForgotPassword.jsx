import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../api/axios.js";
import "../styles/login.css";

const ForgotPassword = () => {
  const [formData, setFormData] = useState({ universityId: "", email: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [requestedId, setRequestedId] = useState("");
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") || "student";

  const handleChange = (event) => {
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event?.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);
    try {
      const response = await api.post("/auth/forgot-password-request", formData);
      setMessage(response.data.message);
      setRequestedId(formData.universityId);
      setSubmitted(true);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to submit password reset request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Link className="back-home" to="/">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Back to home
      </Link>

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
                <span className="b1" style={{ display: "block" }}>University of Ruhuna</span>
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
                <span className="b1" style={{ display: "block" }}>University of Ruhuna</span>
                <span className="b2">Lecturer Evaluation System</span>
              </span>
            </div>

            <span className="eyebrow form-eyebrow">Password Help</span>
            <h2 id="formTitle">Forgot Password</h2>

            {!submitted ? (
              <>
                <p style={{ marginTop: "12px", marginBottom: "24px", color: "var(--slate-600)", fontSize: "15px", lineHeight: "1.5" }}>
                  Submit your University ID and email to receive a temporary password.
                </p>

                <form id="loginForm" onSubmit={handleSubmit} autoComplete="on">
                  <div className="field">
                    <label htmlFor="idField">University ID</label>
                    <input
                      type="text"
                      id="idField"
                      name="universityId"
                      value={formData.universityId}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="emailField">Email</label>
                    <input
                      type="email"
                      id="emailField"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  {message && <div style={{background: "#ECFDF5", color: "#047857", padding: "12px", borderRadius: "8px", marginBottom: "20px", fontSize: "14px", fontWeight: "500"}}>{message}</div>}
                  {error && <div style={{background: "#FEE2E2", color: "#B91C1C", padding: "12px", borderRadius: "8px", marginBottom: "20px", fontSize: "14px", fontWeight: "500"}}>{error}</div>}
                  
                  <button type="submit" disabled={loading} className="btn-submit" style={{opacity: loading ? 0.7 : 1}}>
                    {loading ? "Sending Request..." : "Send Request"}
                  </button>
                </form>

                <div className="row-between" style={{ marginTop: "24px" }}>
                  <Link to={`/login?mode=${mode}`} style={{ fontSize: "14px", color: "var(--violet-500)", fontWeight: "600", textDecoration: "none" }}>Back to Login</Link>
                </div>
              </>
            ) : (
              <div style={{ marginTop: "24px" }}>
                <div style={{background: "#ECFDF5", color: "#065F46", padding: "16px", borderRadius: "12px", marginBottom: "24px", fontSize: "15px", lineHeight: "1.5", border: "1px solid #D1FAE5"}}>
                  {message || "If the details are correct, a temporary password has been sent to your email."}
                </div>
                
                <p style={{ fontSize: "14px", color: "var(--slate-600)", textAlign: "center", marginBottom: "12px" }}>Didn't receive the email?</p>
                <button 
                  onClick={handleSubmit} 
                  disabled={loading} 
                  className="btn-submit"
                  style={{ backgroundColor: "transparent", color: "var(--slate-700)", border: "1px solid var(--slate-300)", opacity: loading ? 0.7 : 1 }}
                >
                  {loading ? "Sending..." : "Send again"}
                </button>
                
                <div style={{ marginTop: "16px", textAlign: "center" }}>
                  <Link 
                    to={`/login?mode=${mode}&id=${encodeURIComponent(requestedId)}`}
                    className="btn-submit"
                    style={{ textDecoration: "none", display: "inline-flex", justifyContent: "center", alignItems: "center" }}
                  >
                    Back to Login Form
                  </Link>
                </div>
              </div>
            )}

            <div className="divider" style={{ marginTop: "32px" }}>Need help</div>
            <p className="helper">Trouble signing in? <Link to="#">Contact the Faculty IT desk</Link></p>
          </div>
        </main>
      </div>
    </>
  );
};

export default ForgotPassword;
