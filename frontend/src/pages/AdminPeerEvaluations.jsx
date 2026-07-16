import { useEffect, useState, Fragment, useMemo } from "react";
import api from "../api/axios.js";
import AdminLayout from "../components/AdminLayout.jsx";
import SearchableSelect from "../components/SearchableSelect.jsx";

const AdminPeerEvaluations = () => {
  const [uploads, setUploads] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchAssignments, setSearchAssignments] = useState("");
  const [searchUploads, setSearchUploads] = useState("");
  
  const [editingGroup, setEditingGroup] = useState(null);
  const [peerScores, setPeerScores] = useState({});
  const [editingScore, setEditingScore] = useState({});

  const [formData, setFormData] = useState({
    semesterId: "",
    evaluatedId: "",
    evaluator1Id: "",
    evaluator2Id: "",
  });

  const loadData = async () => {
    try {
      const [uploadsRes, assignmentsRes, semestersRes, usersRes] = await Promise.all([
        api.get("/admin/peer-evaluations"),
        api.get("/admin/peer-evaluations/assignments"),
        api.get("/semesters"),
        api.get("/admin/users"),
      ]);
      setUploads(uploadsRes.data.uploads || []);
      setAssignments(assignmentsRes.data.assignments || []);
      setSemesters(semestersRes.data.semesters || []);
      setLecturers((usersRes.data.users || []).filter(u => u.role === "lecturer" && u.status === "approved"));
    } catch (err) {
      setError("Failed to load peer evaluation data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const downloadReport = async (upload) => {
    try {
      const response = await api.get(`/admin/peer-evaluations/${upload.id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = upload.file_name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to download file.");
    }
  };

  const updateStatus = async (upload, status) => {
    try {
      await api.patch(`/admin/peer-evaluations/${upload.id}/status`, { status });
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update status.");
    }
  };

  const handleScoreChange = (groupKey, value) => {
    setPeerScores(prev => ({ ...prev, [groupKey]: value }));
  };

  const savePeerEvaluationScore = async (group) => {
    try {
      const score = peerScores[group.key] !== undefined ? peerScores[group.key] : group.peer_evaluation_score;
      if (score === null || score === undefined || score === "") {
        alert("Please enter a valid score.");
        return;
      }
      
      const payload = {
        semesterId: group.semester_id,
        academicYear: group.academic_year,
        peerEvaluationScore: score
      };

      await api.patch(`/admin/award-scores/${group.evaluated_id}`, payload);
      alert("Peer evaluation score saved successfully!");
      setEditingScore(prev => ({ ...prev, [group.key]: false }));
      await loadData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save peer evaluation score.");
    }
  };

  const toggleEditScore = (groupKey) => {
    setEditingScore(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  const handleAssign = async (event) => {
    event.preventDefault();
    setError("");

    if (!formData.semesterId || !formData.evaluatedId || !formData.evaluator1Id || !formData.evaluator2Id) {
      setError("All fields are required to assign evaluators.");
      return;
    }

    if (
      String(formData.evaluatedId) === String(formData.evaluator1Id) ||
      String(formData.evaluatedId) === String(formData.evaluator2Id) ||
      String(formData.evaluator1Id) === String(formData.evaluator2Id)
    ) {
      setError("Evaluators must be distinct and cannot evaluate themselves.");
      return;
    }

    try {
      if (editingGroup) {
        await api.put(`/admin/peer-evaluations/assignments/${editingGroup.evaluated_id}/${editingGroup.semester_id}`, formData);
        alert("Peer evaluators updated successfully!");
        setEditingGroup(null);
      } else {
        await api.post("/admin/peer-evaluations/assignments", formData);
        alert("Peer evaluators assigned successfully!");
      }
      
      setFormData({
        semesterId: "",
        evaluatedId: "",
        evaluator1Id: "",
        evaluator2Id: "",
      });
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${editingGroup ? 'update' : 'assign'} peer evaluators.`);
    }
  };

  const handleDeleteAssignment = async (group) => {
    if (group.evaluator1?.status === 'completed' || group.evaluator2?.status === 'completed') {
      alert("Cannot delete this assignment because one or more evaluators have already uploaded their review.");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete the assignment for ${group.evaluated_name}?`)) {
      return;
    }

    try {
      await api.delete(`/admin/peer-evaluations/assignments/${group.evaluated_id}/${group.semester_id}`);
      await loadData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete assignment.");
    }
  };

  const handleEditAssignment = (group) => {
    if (group.evaluator1?.status === 'completed' || group.evaluator2?.status === 'completed') {
      alert("Cannot edit this assignment because one or more evaluators have already uploaded their review.");
      return;
    }

    setEditingGroup(group);
    setFormData({
      semesterId: group.semester_id,
      evaluatedId: group.evaluated_id,
      evaluator1Id: group.evaluator1?.evaluator_id || "",
      evaluator2Id: group.evaluator2?.evaluator_id || "",
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingGroup(null);
    setFormData({
      semesterId: "",
      evaluatedId: "",
      evaluator1Id: "",
      evaluator2Id: "",
    });
    setError("");
  };

  const semesterOptions = semesters.map((s) => ({ value: s.id, label: `${s.semester_name} - ${s.academic_year}` }));
  const lecturerOptions = lecturers.map((l) => ({ value: l.id, label: l.full_name }));

  const groupedAssignments = useMemo(() => Object.values(assignments.reduce((acc, curr) => {
    const key = `${curr.evaluated_name}-${curr.semester_name}-${curr.academic_year}`;
    if (!acc[key]) {
      acc[key] = {
        key: key,
        evaluated_id: curr.evaluated_id, 
        semester_id: curr.semester_id,
        evaluated_name: curr.evaluated_name,
        semester_name: curr.semester_name,
        academic_year: curr.academic_year,
        evaluator1: curr,
        evaluator2: null,
      };
    } else if (!acc[key].evaluator2) {
      acc[key].evaluator2 = curr;
    }
    return acc;
  }, {})), [assignments]);

  const groupedUploads = useMemo(() => Object.values(uploads.reduce((acc, curr) => {
    const key = `${curr.evaluated_name}-${curr.semester_name}-${curr.academic_year}`;
    if (!acc[key]) {
      acc[key] = {
        key,
        evaluated_id: curr.evaluated_id,
        semester_id: curr.semester_id,
        peer_evaluation_score: curr.peer_evaluation_score,
        evaluated_name: curr.evaluated_name,
        semester_name: curr.semester_name,
        academic_year: curr.academic_year,
        submissions: []
      };
    }
    acc[key].submissions.push(curr);
    return acc;
  }, {})), [uploads]);

  const filteredGroupedAssignments = useMemo(() => {
    return groupedAssignments.filter(g => 
      (g.evaluated_name || "").toLowerCase().includes((searchAssignments || "").toLowerCase()) || 
      (g.evaluator1 && (g.evaluator1.evaluator_name || "").toLowerCase().includes((searchAssignments || "").toLowerCase())) ||
      (g.evaluator2 && (g.evaluator2.evaluator_name || "").toLowerCase().includes((searchAssignments || "").toLowerCase())) ||
      (g.semester_name || "").toLowerCase().includes((searchAssignments || "").toLowerCase())
    );
  }, [groupedAssignments, searchAssignments]);

  const filteredGroupedUploads = useMemo(() => {
    return groupedUploads.filter(g => 
      (g.evaluated_name || "").toLowerCase().includes((searchUploads || "").toLowerCase()) ||
      (g.semester_name || "").toLowerCase().includes((searchUploads || "").toLowerCase()) ||
      g.submissions.some(s => (s.evaluator_name || "").toLowerCase().includes((searchUploads || "").toLowerCase()))
    );
  }, [groupedUploads, searchUploads]);

  return (
    <AdminLayout title="Peer Evaluations">
      <div className="flex flex-col gap-6">
        
        {/* Top: Assign Evaluators Form */}
        <form onSubmit={handleAssign} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-bold text-brandBlue">{editingGroup ? 'Edit Evaluators' : 'Assign Evaluators'}</h3>
          <p className="mt-1 text-sm text-slate-500 mb-5">
            {editingGroup 
              ? `Editing the peer evaluation assignment for ${editingGroup.evaluated_name}.` 
              : "Select two distinct lecturers to evaluate a target lecturer."}
          </p>
          
          {error && <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Semester</label>
              <SearchableSelect
                options={semesterOptions}
                value={formData.semesterId}
                onChange={(e) => setFormData((curr) => ({ ...curr, semesterId: e.target.value }))}
                placeholder="Select Semester"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Evaluated Lecturer</label>
              <SearchableSelect
                options={lecturerOptions}
                value={formData.evaluatedId}
                onChange={(e) => setFormData((curr) => ({ ...curr, evaluatedId: e.target.value }))}
                placeholder="Select Evaluated Lecturer"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Evaluator 1</label>
              <SearchableSelect
                options={lecturerOptions}
                value={formData.evaluator1Id}
                onChange={(e) => setFormData((curr) => ({ ...curr, evaluator1Id: e.target.value }))}
                placeholder="Select Evaluator 1"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Evaluator 2</label>
              <SearchableSelect
                options={lecturerOptions}
                value={formData.evaluator2Id}
                onChange={(e) => setFormData((curr) => ({ ...curr, evaluator2Id: e.target.value }))}
                placeholder="Select Evaluator 2"
              />
            </div>

            <div className="flex gap-2 w-full">
              <button
                type="submit"
                className="w-full rounded-2xl bg-brandBlue px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              >
                {editingGroup ? 'Update' : 'Assign'}
              </button>
              {editingGroup && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="w-full rounded-2xl bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-300"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Middle: Assigned Lecturers List */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col min-w-0">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-brandBlue">Assigned Lecturers List</h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{filteredGroupedAssignments.length} records</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">View the list of lecturers assigned for peer evaluation.</p>
            </div>
            <input 
              placeholder="Search assignments..." 
              value={searchAssignments}
              onChange={(e) => setSearchAssignments(e.target.value)}
              className="rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-brandBlue w-full sm:w-64"
            />
          </div>

          <div className="mt-6 max-h-[20rem] overflow-y-auto overflow-x-auto">
            <table className="w-full table-auto divide-y divide-slate-200 text-left text-sm [&_td]:px-2 [&_th]:px-2" style={{minWidth:'600px'}}>
              <thead className="sticky top-0 z-10 bg-white text-slate-500">
                <tr>
                  <th className="py-3 font-semibold whitespace-nowrap">Evaluated Lecturer</th>
                  <th className="py-3 font-semibold whitespace-nowrap">Semester</th>
                  <th className="py-3 font-semibold whitespace-nowrap">Evaluator 1</th>
                  <th className="py-3 font-semibold whitespace-nowrap">Status 1</th>
                  <th className="py-3 font-semibold whitespace-nowrap">Evaluator 2</th>
                  <th className="py-3 font-semibold whitespace-nowrap">Status 2</th>
                  <th className="py-3 font-semibold whitespace-nowrap text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" className="py-6 text-center text-slate-500">Loading assignments...</td></tr>
                ) : filteredGroupedAssignments.length === 0 ? (
                  <tr><td colSpan="7" className="py-6 text-center text-slate-500">No active assignments found.</td></tr>
                ) : (
                  filteredGroupedAssignments.map((group) => (
                    <tr key={group.key} className="border-t border-slate-100">
                      <td className="py-4 font-medium whitespace-nowrap">{group.evaluated_name}</td>
                      <td className="py-4 text-slate-600 whitespace-nowrap">
                        {group.semester_name}
                        <span className="block text-xs text-slate-400">{group.academic_year}</span>
                      </td>
                      <td className="py-4 font-medium whitespace-nowrap">
                        {group.evaluator1 ? group.evaluator1.evaluator_name : <span className="text-slate-400 italic">Not Assigned</span>}
                      </td>
                      <td className="py-4 whitespace-nowrap">
                        {group.evaluator1 && (
                          <span className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${
                            group.evaluator1.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {group.evaluator1.status === 'completed' ? 'Completed' : 'Assigned'}
                          </span>
                        )}
                      </td>
                      <td className="py-4 font-medium whitespace-nowrap">
                        {group.evaluator2 ? group.evaluator2.evaluator_name : <span className="text-slate-400 italic">Not Assigned</span>}
                      </td>
                      <td className="py-4 whitespace-nowrap">
                        {group.evaluator2 && (
                          <span className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${
                            group.evaluator2.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {group.evaluator2.status === 'completed' ? 'Completed' : 'Assigned'}
                          </span>
                        )}
                      </td>
                      <td className="py-4 whitespace-nowrap text-right">
                        <div className="inline-flex flex-nowrap overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                          <button
                            onClick={() => handleEditAssignment(group)}
                            className="px-3 py-2 text-xs font-semibold text-brandBlue hover:bg-blue-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteAssignment(group)}
                            className="border-l border-slate-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom: Uploads Table */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col min-w-0">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-brandBlue">Peer Evaluation Uploads</h3>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{filteredGroupedUploads.length} records</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">Review and manage uploaded paper-based peer evaluations.</p>
            </div>
            <input 
              placeholder="Search uploads..." 
              value={searchUploads}
              onChange={(e) => setSearchUploads(e.target.value)}
              className="rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-brandBlue w-full sm:w-64"
            />
          </div>

          <div className="mt-6 max-h-[20rem] overflow-y-auto overflow-x-auto">
            <table className="w-full table-auto divide-y divide-slate-200 text-left text-sm [&_td]:px-2 [&_th]:px-2" style={{minWidth:'560px'}}>
              <thead className="sticky top-0 z-10 bg-white text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 font-semibold whitespace-nowrap">Evaluated Lecturer</th>
                  <th className="py-3 font-semibold whitespace-nowrap">Semester</th>
                  <th className="py-3 font-semibold whitespace-nowrap">Evaluator</th>
                  <th className="py-3 font-semibold whitespace-nowrap">Submitted Date</th>
                  <th className="py-3 font-semibold whitespace-nowrap">Status</th>
                  <th className="py-3 font-semibold whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="py-6 text-center text-slate-500">Loading uploads...</td></tr>
                ) : filteredGroupedUploads.length === 0 ? (
                  <tr><td colSpan="6" className="py-6 text-center text-slate-500">No peer evaluations have been uploaded yet.</td></tr>
                ) : (
                  filteredGroupedUploads.map((group) => (
                    <Fragment key={group.key}>
                      {group.submissions.map((upload, index) => (
                        <tr key={upload.id} className={`${index === group.submissions.length - 1 ? 'border-b border-slate-200' : 'border-b border-slate-50'} hover:bg-slate-50 transition-colors`}>
                          {index === 0 && (
                            <td rowSpan={group.submissions.length} className="py-4 font-semibold text-slate-900 whitespace-nowrap border-r border-slate-100 align-top">
                              {group.evaluated_name}
                            </td>
                          )}
                          {index === 0 && (
                            <td rowSpan={group.submissions.length} className="py-4 text-slate-600 whitespace-nowrap border-r border-slate-100 align-top">
                              {group.semester_name}
                              <span className="block text-xs text-slate-400">{group.academic_year}</span>
                            </td>
                          )}
                          <td className="py-4 font-medium text-slate-900 whitespace-nowrap pl-4">{upload.evaluator_name}</td>
                          <td className="py-4 text-slate-600 whitespace-nowrap">{new Date(upload.submitted_at).toLocaleString()}</td>
                          <td className="py-4 whitespace-nowrap">
                            <SearchableSelect
                              value={upload.status}
                              onChange={(e) => updateStatus(upload, e.target.value)}
                              className={`w-full ${
                                upload.status === 'accepted' ? 'bg-emerald-50 text-emerald-700' :
                                upload.status === 'rejected' ? 'bg-red-50 text-red-700' :
                                upload.status === 'under_review' ? 'bg-amber-50 text-amber-700' :
                                'bg-sky-50 text-sky-700'
                              }`}
                              options={[
                                { value: "submitted", label: "Submitted" },
                                { value: "under_review", label: "Under Review" },
                                { value: "accepted", label: "Accepted" },
                                { value: "rejected", label: "Rejected" },
                              ]}
                            />
                          </td>
                          <td className="py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              <a
                                href={`${(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace('/api', '')}/${upload.file_path?.replace(/\\/g, '/')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-full border border-emerald-500 px-4 py-1.5 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-500 hover:text-white"
                              >
                                View
                              </a>
                              <button
                                onClick={() => downloadReport(upload)}
                                className="rounded-full border border-brandBlue px-4 py-1.5 text-xs font-semibold text-brandBlue transition hover:bg-brandBlue hover:text-white"
                              >
                                Download
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {group.submissions.length === 2 && group.submissions.every(s => s.status === 'accepted') && (
                        <tr className="border-b-4 border-slate-200 bg-sky-50/50">
                          <td colSpan="6" className="py-4 px-4">
                            <div className="flex items-center justify-end gap-3">
                              <span className="text-sm font-semibold text-slate-700">Peer Evaluation Score:</span>
                              {!editingScore[group.key] && group.peer_evaluation_score !== null ? (
                                <>
                                  <span className="text-lg font-bold text-brandBlue">{group.peer_evaluation_score}</span>
                                  <button
                                    onClick={() => toggleEditScore(group.key)}
                                    className="ml-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                                  >
                                    Edit
                                  </button>
                                </>
                              ) : (
                                <>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    className="w-24 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none transition focus:border-brandBlue"
                                    placeholder="0-100"
                                    value={peerScores[group.key] !== undefined ? peerScores[group.key] : (group.peer_evaluation_score || "")}
                                    onChange={(e) => handleScoreChange(group.key, e.target.value)}
                                  />
                                  <button
                                    onClick={() => savePeerEvaluationScore(group)}
                                    className="rounded-lg bg-brandBlue px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-800"
                                  >
                                    {group.peer_evaluation_score !== null ? "Update Score" : "Save Score"}
                                  </button>
                                  {group.peer_evaluation_score !== null && (
                                    <button
                                      onClick={() => toggleEditScore(group.key)}
                                      className="rounded-lg text-slate-500 px-3 py-1.5 text-sm font-semibold hover:text-slate-700"
                                    >
                                      Cancel
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
};

export default AdminPeerEvaluations;
