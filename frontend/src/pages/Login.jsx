import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import "../styles/login.css";

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
  const requestedId = searchParams.get("id") || "";
  const [mode, setMode] = useState(initialMode);
  const [formData, setFormData] = useState({ identifier: requestedId, password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isStudent = mode === "student";

  const setLoginMode = (nextMode) => {
    setMode(nextMode);
    setFormData({ identifier: "", password: "" });
    setError("");
    setSearchParams({ mode: nextMode }, { replace: true });
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

  return (
    <>
      <Link className="back-home" to="/">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Back to home
      </Link>

<div className="page">

  {/**/}
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

  {/**/}
  <main className="form-side">
    <div className="form-wrap">

      <div className="mobile-brand">
        <img src="/assets/images/crest.png" alt="University of Ruhuna crest" />
        <span>
          <span className="b1" style={{"display":"block"}}>University of Ruhuna</span>
          <span className="b2">Lecturer Evaluation System</span>
        </span>
      </div>

      <span className="eyebrow form-eyebrow">Welcome back</span>
      <h2 id="formTitle">{isStudent ? "Student Login" : "Staff Login"}</h2>

      <div className="role-toggle" role="tablist" aria-label="Choose login type">
        <button type="button" id="tabStudent" onClick={() => setLoginMode("student")} className={isStudent ? "active" : ""} role="tab" aria-selected={isStudent}>Student</button>
        <button type="button" id="tabStaff" onClick={() => setLoginMode("staff")} className={!isStudent ? "active" : ""} role="tab" aria-selected={!isStudent}>Staff</button>
      </div>

      <form id="loginForm" onSubmit={handleSubmit} autoComplete="on">
        <div className="field">
          <label htmlFor="idField" id="idLabel">University ID</label>
          <input 
            type="text" 
            id="idField" 
            name="identifier" 
            placeholder={isStudent ? 'e.g. SC/2021/00123' : 'e.g. R012345'} 
            required 
            pattern={isStudent ? '^SC/20\\d{2}/\\d{5}$' : '^R\\d{6}$'}
            title={isStudent ? 'Format: SC/20xx/xxxxx' : 'Format: Rxxxxxx'} 
            value={formData.identifier}
            onChange={handleChange}
          />
        </div>

        <div className="field">
          <label htmlFor="passwordField">Password</label>
          <div className="input-wrap">
            <input 
  type={showPassword ? "text" : "password"} 
  id="passwordField" 
  name="password" 
  placeholder="Enter your password" 
  required 
  value={formData.password}
  onChange={handleChange}
/>
            <button type="button" className="toggle-visibility" id="togglePw" onClick={() => setShowPassword(!showPassword)} aria-label="Show password">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        </div>

        <div className="row-between">
          <Link to={`/forgot-password?mode=${mode}`} style={{fontSize: "14px", color: "var(--violet-500)", fontWeight: "600", textDecoration: "none"}}>Forgot password?</Link>
        </div>

        {error && <div style={{background: "#FEE2E2", color: "#B91C1C", padding: "12px", borderRadius: "8px", marginBottom: "20px", fontSize: "14px", fontWeight: "500"}}>{error}</div>}
        <button type="submit" disabled={loading} className="btn-submit" style={{opacity: loading ? 0.7 : 1}}>{loading ? "Logging in..." : "Log In"}</button>
      </form>

      <div className="divider">Need help</div>
      <p className="helper">Trouble signing in? <Link to="#">Contact the Faculty IT desk</Link></p>
    </div>
  </main>

</div>


    </>
  );
};

export default Login;
