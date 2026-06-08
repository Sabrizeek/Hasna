import { useEffect, useState } from "react";
import api from "../api/axios.js";
import AdminLayout from "../components/AdminLayout.jsx";

const emptyWindow = { semesterId: "", academicYear: "", openDate: "", closeDate: "" };

const EvaluationWindowManagement = () => {
  const [semesters, setSemesters] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [windows, setWindows] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [windowForm, setWindowForm] = useState(emptyWindow);
  const [tokenForm, setTokenForm] = useState({ departmentId: "", semesterId: "", academicYear: "", expiresAt: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadData = async () => {
    const [semestersRes, departmentsRes, windowsRes, tokensRes] = await Promise.all([
      api.get("/semesters"),
      api.get("/departments"),
      api.get("/admin/evaluation-windows"),
      api.get("/admin/access-tokens"),
    ]);
    const loadedSemesters = semestersRes.data.semesters || [];
    setSemesters(loadedSemesters);
    setDepartments(departmentsRes.data.departments || []);
    setWindows(windowsRes.data.windows || []);
    setTokens(tokensRes.data.tokens || []);
    const first = loadedSemesters[0];
    setWindowForm((current) => ({ ...current, semesterId: current.semesterId || String(first?.id || ""), academicYear: current.academicYear || first?.academic_year || "" }));
    setTokenForm((current) => ({ ...current, semesterId: current.semesterId || String(first?.id || ""), academicYear: current.academicYear || first?.academic_year || "" }));
  };

  useEffect(() => { loadData(); }, []);

  const syncSemester = (setter, value) => {
    const semester = semesters.find((item) => String(item.id) === value);
    setter((current) => ({ ...current, semesterId: value, academicYear: semester?.academic_year || "" }));
  };

  const saveWindow = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!windowForm.openDate || !windowForm.closeDate || new Date(windowForm.openDate) >= new Date(windowForm.closeDate)) {
      setError("Open date must be before close date.");
      return;
    }
    try {
      await api.post("/admin/evaluation-windows", {
        ...windowForm,
        semesterId: Number(windowForm.semesterId),
        openDate: windowForm.openDate.replace("T", " "),
        closeDate: windowForm.closeDate.replace("T", " "),
      });
      setWindowForm(emptyWindow);
      setMessage("Evaluation window saved.");
      loadData();
    } catch (saveError) {
      setError(saveError.response?.data?.message || "Unable to save evaluation window.");
    }
  };

  const closeNow = async (id) => {
    await api.patch(`/admin/evaluation-windows/${id}/close`);
    loadData();
  };

  const generateToken = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await api.post("/admin/access-tokens/generate", {
        ...tokenForm,
        departmentId: tokenForm.departmentId ? Number(tokenForm.departmentId) : null,
        semesterId: Number(tokenForm.semesterId),
        expiresAt: tokenForm.expiresAt.replace("T", " "),
      });
      setMessage("Token generated.");
      loadData();
    } catch (tokenError) {
      setError(tokenError.response?.data?.message || "Unable to generate token.");
    }
  };

  const revokeToken = async (id) => {
    await api.patch(`/admin/access-tokens/${id}/revoke`);
    loadData();
  };

  return (
    <AdminLayout title="Evaluation Windows & Tokens">
      {message && <p className="mb-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p>}
      {error && <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
      <div className="grid gap-6 xl:grid-cols-2">
        <form onSubmit={saveWindow} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-bold text-brandBlue">Add Evaluation Window</h3>
          <select value={windowForm.semesterId} onChange={(event) => syncSemester(setWindowForm, event.target.value)} className="mt-5 w-full rounded-2xl border border-slate-300 px-4 py-3">
            {semesters.map((semester) => <option key={semester.id} value={semester.id}>{semester.semester_name} - {semester.academic_year}</option>)}
          </select>
          <input type="datetime-local" value={windowForm.openDate} onChange={(event) => setWindowForm((current) => ({ ...current, openDate: event.target.value }))} className="mt-4 w-full rounded-2xl border border-slate-300 px-4 py-3" required />
          <input type="datetime-local" value={windowForm.closeDate} onChange={(event) => setWindowForm((current) => ({ ...current, closeDate: event.target.value }))} className="mt-4 w-full rounded-2xl border border-slate-300 px-4 py-3" required />
          <button className="mt-5 rounded-2xl bg-brandBlue px-5 py-3 font-semibold text-white">Save Window</button>
        </form>

        <form onSubmit={generateToken} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-bold text-brandBlue">Token Management</h3>
          <select value={tokenForm.departmentId} onChange={(event) => setTokenForm((current) => ({ ...current, departmentId: event.target.value }))} className="mt-5 w-full rounded-2xl border border-slate-300 px-4 py-3">
            <option value="">All departments</option>
            {departments.map((department) => <option key={department.id} value={department.id}>{department.department_name}</option>)}
          </select>
          <select value={tokenForm.semesterId} onChange={(event) => syncSemester(setTokenForm, event.target.value)} className="mt-4 w-full rounded-2xl border border-slate-300 px-4 py-3">
            {semesters.map((semester) => <option key={semester.id} value={semester.id}>{semester.semester_name} - {semester.academic_year}</option>)}
          </select>
          <input type="datetime-local" value={tokenForm.expiresAt} onChange={(event) => setTokenForm((current) => ({ ...current, expiresAt: event.target.value }))} className="mt-4 w-full rounded-2xl border border-slate-300 px-4 py-3" required />
          <button className="mt-5 rounded-2xl bg-brandGold px-5 py-3 font-semibold text-white">Generate Tokens</button>
        </form>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-bold text-brandBlue">Evaluation Windows</h3>
          <div className="mt-5 overflow-x-auto"><table className="min-w-full text-left text-sm"><tbody>
            {windows.map((window) => <tr key={window.id} className="border-t border-slate-100"><td className="py-4 pr-4">{window.semester_name}<br />{window.academic_year}</td><td className="py-4 pr-4">{new Date(window.open_date).toLocaleString()}</td><td className="py-4 pr-4">{new Date(window.close_date).toLocaleString()}</td><td className="py-4 pr-4">{window.status}</td><td className="py-4 pr-4"><button onClick={() => closeNow(window.id)} className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white">Close Now</button></td></tr>)}
          </tbody></table></div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-bold text-brandBlue">Access Tokens</h3>
          <div className="mt-5 overflow-x-auto"><table className="min-w-full text-left text-sm"><tbody>
            {tokens.map((token) => <tr key={token.id} className="border-t border-slate-100"><td className="py-4 pr-4 font-mono text-xs">{token.token}</td><td className="py-4 pr-4">{token.department_name || "All"}</td><td className="py-4 pr-4">{token.semester_name}</td><td className="py-4 pr-4">{token.status}</td><td className="py-4 pr-4">{new Date(token.expires_at).toLocaleDateString()}</td><td className="py-4 pr-4"><button onClick={() => revokeToken(token.id)} className="rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-700">Revoke</button></td></tr>)}
          </tbody></table></div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default EvaluationWindowManagement;
