import { useEffect, useState } from "react";
import api from "../api/axios.js";
import AdminLayout from "../components/AdminLayout.jsx";

const emptyWindow = { semesterId: "", academicYear: "", openDate: "", closeDate: "" };

const toDatetimeLocal = (value) => {
  if (!value) return "";
  const date = new Date(value);
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const EvaluationWindowManagement = () => {
  const [semesters, setSemesters] = useState([]);
  const [windows, setWindows] = useState([]);
  const [windowForm, setWindowForm] = useState(emptyWindow);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [closingId, setClosingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const loadData = async () => {
    const [semestersRes, windowsRes] = await Promise.all([
      api.get("/semesters"),
      api.get("/admin/evaluation-windows"),
    ]);
    const loadedSemesters = semestersRes.data.semesters || [];
    const first = loadedSemesters[0];
    setSemesters(loadedSemesters);
    setWindows(windowsRes.data.windows || []);
    setWindowForm((current) => ({
      ...current,
      semesterId: current.semesterId || String(first?.id || ""),
      academicYear: current.academicYear || first?.academic_year || "",
    }));
  };

  useEffect(() => { loadData(); }, []);

  const syncSemester = (value) => {
    const semester = semesters.find((item) => String(item.id) === value);
    setWindowForm((current) => ({ ...current, semesterId: value, academicYear: semester?.academic_year || "" }));
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
      const payload = {
        ...windowForm,
        semesterId: Number(windowForm.semesterId),
        openDate: windowForm.openDate.replace("T", " "),
        closeDate: windowForm.closeDate.replace("T", " "),
      };
      if (editingId) {
        await api.put(`/admin/evaluation-windows/${editingId}`, payload);
      } else {
        await api.post("/admin/evaluation-windows", payload);
      }
      setWindowForm(emptyWindow);
      setEditingId(null);
      setMessage(editingId ? "Evaluation window updated." : "Evaluation window saved.");
      await loadData();
    } catch (saveError) {
      setError(saveError.response?.data?.message || "Unable to save evaluation window.");
    }
  };

  const editWindow = (evaluationWindow) => {
    setEditingId(evaluationWindow.id);
    setWindowForm({
      semesterId: String(evaluationWindow.semester_id),
      academicYear: evaluationWindow.academic_year,
      openDate: toDatetimeLocal(evaluationWindow.open_date),
      closeDate: toDatetimeLocal(evaluationWindow.close_date),
    });
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setWindowForm(emptyWindow);
  };

  const reopenWindow = async (evaluationWindow) => {
    const defaultClose = toDatetimeLocal(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    const promptedCloseDate = window.prompt?.("Set a new future close date/time:", defaultClose);
    if (promptedCloseDate === null) return;
    const closeDate = promptedCloseDate || defaultClose;
    if (!closeDate) return;
    setError("");
    setMessage("");
    setBusyId(evaluationWindow.id);
    try {
      const response = await api.patch(`/admin/evaluation-windows/${evaluationWindow.id}/reopen`, {
        openDate: new Date() > new Date(evaluationWindow.open_date) ? toDatetimeLocal(new Date()).replace("T", " ") : toDatetimeLocal(evaluationWindow.open_date).replace("T", " "),
        closeDate: closeDate.replace("T", " "),
      });
      setMessage(response.data.message || "Evaluation window reopened.");
      await loadData();
    } catch (reopenError) {
      setError(reopenError.response?.data?.message || "Unable to reopen evaluation window.");
    } finally {
      setBusyId(null);
    }
  };

  const deleteWindow = async (evaluationWindow) => {
    const confirmed = window.confirm(`Delete evaluation window for ${evaluationWindow.semester_name} - ${evaluationWindow.academic_year}?`);
    if (!confirmed) return;
    setError("");
    setMessage("");
    setBusyId(evaluationWindow.id);
    try {
      const response = await api.delete(`/admin/evaluation-windows/${evaluationWindow.id}`);
      setMessage(response.data.message || "Evaluation window deleted.");
      await loadData();
    } catch (deleteError) {
      setError(deleteError.response?.data?.message || "Unable to delete evaluation window.");
    } finally {
      setBusyId(null);
    }
  };

  const closeNow = async (id) => {
    setError("");
    setMessage("");
    setClosingId(id);
    try {
      const response = await api.patch(`/admin/evaluation-windows/${id}/close`);
      setMessage(response.data.message || "Evaluation window closed.");
      await loadData();
    } catch (closeError) {
      setError(closeError.response?.data?.message || "Unable to close evaluation window.");
    } finally {
      setClosingId(null);
    }
  };

  return (
    <AdminLayout title="Evaluation Windows">
      {message && <p className="mb-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p>}
      {error && <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <form onSubmit={saveWindow} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-bold text-brandBlue">{editingId ? "Edit Evaluation Window" : "Add Evaluation Window"}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">Control when students can submit lecturer evaluations for a semester.</p>
          <select value={windowForm.semesterId} onChange={(event) => syncSemester(event.target.value)} className="mt-5 w-full rounded-2xl border border-slate-300 px-4 py-3">
            {semesters.map((semester) => <option key={semester.id} value={semester.id}>{semester.semester_name} - {semester.academic_year}</option>)}
          </select>
          <label className="mt-4 block space-y-2">
            <span className="text-sm font-semibold text-slate-700">Open Date</span>
            <input type="datetime-local" value={windowForm.openDate} onChange={(event) => setWindowForm((current) => ({ ...current, openDate: event.target.value }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3" required />
          </label>
          <label className="mt-4 block space-y-2">
            <span className="text-sm font-semibold text-slate-700">Close Date</span>
            <input type="datetime-local" value={windowForm.closeDate} onChange={(event) => setWindowForm((current) => ({ ...current, closeDate: event.target.value }))} className="w-full rounded-2xl border border-slate-300 px-4 py-3" required />
          </label>
          <div className="mt-5 flex flex-wrap gap-3">
            <button className="rounded-2xl bg-brandBlue px-5 py-3 font-semibold text-white">{editingId ? "Update Window" : "Save Window"}</button>
            {editingId && <button type="button" onClick={cancelEdit} className="rounded-2xl border border-slate-300 px-5 py-3 font-semibold text-slate-700">Cancel</button>}
          </div>
        </form>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-bold text-brandBlue">Evaluation Windows</h3>
          <div className="mt-5 space-y-3">
            {windows.map((window) => {
              const isClosed = window.status === "closed";
              return (
                <article key={window.id} className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-950">{window.semester_name} - {window.academic_year}</p>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold capitalize text-slate-600">{window.status}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {new Date(window.open_date).toLocaleString()} to {new Date(window.close_date).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => editWindow(window)} className="rounded-full border border-brandBlue px-4 py-2 text-xs font-semibold text-brandBlue">Edit</button>
                    {isClosed ? (
                      <button onClick={() => reopenWindow(window)} disabled={busyId === window.id} className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white disabled:bg-slate-300">Reopen</button>
                    ) : (
                      <button
                        onClick={() => closeNow(window.id)}
                        disabled={closingId === window.id}
                        className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        {closingId === window.id ? "Closing..." : "Close Now"}
                      </button>
                    )}
                    <button onClick={() => deleteWindow(window)} disabled={busyId === window.id} className="rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-700 disabled:opacity-60">Delete</button>
                  </div>
                </article>
              );
            })}
            {windows.length === 0 && (
              <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">No evaluation windows have been created yet.</div>
            )}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
};

export default EvaluationWindowManagement;
