import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios.js";
import StudentLayout from "../components/StudentLayout.jsx";

const EvaluationHub = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  const [allLecturers, setAllLecturers] = useState([]);
  const [theoryQuestions, setTheoryQuestions] = useState([]);
  const [practicalQuestions, setPracticalQuestions] = useState([]);
  
  // State: { "lecturerId-courseId-type": { responses: { qId: score }, comment: "" } }
  const [formState, setFormState] = useState(() => {
    const saved = sessionStorage.getItem("eval_formState");
    return saved ? JSON.parse(saved) : {};
  });

  // Stepper State
  const [activeTab, setActiveTab] = useState(() => sessionStorage.getItem("eval_activeTab") || "theory");
  const [currentStepIndex, setCurrentStepIndex] = useState(() => {
    const saved = sessionStorage.getItem("eval_currentStepIndex");
    return saved ? parseInt(saved, 10) : 0;
  });

  const selection = useMemo(() => {
    return {
      courseIds: searchParams.get("courseIds") || "",
      semesterId: searchParams.get("semesterId") || "",
      academicYear: searchParams.get("academicYear") || "",
    };
  }, [searchParams]);

  useEffect(() => {
    const fetchData = async () => {
      if (!selection.courseIds || !selection.semesterId || !selection.academicYear) {
        setServerError("Missing required selection parameters.");
        setLoading(false);
        return;
      }

      try {
        const [lecturersRes, theoryRes, practicalRes] = await Promise.all([
          api.get("/student/evaluation-lecturers", { params: selection }),
          api.get("/questions", { params: { type: "theory" } }),
          api.get("/questions", { params: { type: "practical" } }),
        ]);

        const fetchedLecturers = lecturersRes.data.lecturers || [];
        setTheoryQuestions(theoryRes.data.questions || []);
        setPracticalQuestions(practicalRes.data.questions || []);
        
        // Flatten lecturers with 'both' type into two separate evaluation rows
        const flatLecturers = [];
        const initialState = {};
        
        let hasTheory = false;
        
        fetchedLecturers.forEach((l) => {
          if (l.type === 'theory' || l.type === 'both') {
            const lTheory = { ...l, evalType: 'theory' };
            flatLecturers.push(lTheory);
            initialState[`${l.lecturer_id}-${l.course_id}-theory`] = { responses: {}, comment: "" };
            hasTheory = true;
          }
          if (l.type === 'practical' || l.type === 'both') {
            const lPractical = { ...l, evalType: 'practical' };
            flatLecturers.push(lPractical);
            initialState[`${l.lecturer_id}-${l.course_id}-practical`] = { responses: {}, comment: "" };
          }
        });
        
        setAllLecturers(flatLecturers);
        
        const savedFormState = sessionStorage.getItem("eval_formState");
        if (savedFormState) {
          try {
            const parsed = JSON.parse(savedFormState);
            Object.keys(initialState).forEach(key => {
              if (parsed[key]) initialState[key] = parsed[key];
            });
          } catch(e) {}
        }
        setFormState(initialState);
        
        if (!sessionStorage.getItem("eval_activeTab") && !hasTheory) {
          setActiveTab("practical");
        }
      } catch (error) {
        setServerError(error.response?.data?.message || "Failed to load evaluation data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selection]);

  const handleResponseChange = (rowKey, questionId, scoreStr) => {
    const score = parseInt(scoreStr, 10);
    setFormState(prev => ({
      ...prev,
      [rowKey]: {
        ...prev[rowKey],
        responses: {
          ...prev[rowKey].responses,
          [questionId]: isNaN(score) ? null : score
        }
      }
    }));
  };

  const handleCommentChange = (rowKey, comment) => {
    setFormState(prev => ({
      ...prev,
      [rowKey]: {
        ...prev[rowKey],
        comment
      }
    }));
  };

  const isFormComplete = () => {
    if (allLecturers.length === 0) return true;
    for (const l of allLecturers) {
      const rowKey = `${l.lecturer_id}-${l.course_id}-${l.evalType}`;
      const row = formState[rowKey];
      if (!row || !row.comment.trim()) return false;
      
      const questions = l.evalType === "theory" ? theoryQuestions : practicalQuestions;
      for (const q of questions) {
        if (!row.responses[q.id]) return false;
      }
    }
    return true;
  };

  const isTabComplete = (tabName) => {
    const lecturers = tabName === "theory" ? theoryLecturers : practicalLecturers;
    const questions = tabName === "theory" ? theoryQuestions : practicalQuestions;
    
    if (lecturers.length === 0) return true;
    for (const l of lecturers) {
      const rowKey = `${l.lecturer_id}-${l.course_id}-${l.evalType}`;
      const row = formState[rowKey];
      if (!row || !row.comment.trim()) return false;
      
      for (const q of questions) {
        if (!row.responses[q.id]) return false;
      }
    }
    return true;
  };

  useEffect(() => {
    if (Object.keys(formState).length > 0) {
      sessionStorage.setItem("eval_formState", JSON.stringify(formState));
    }
  }, [formState]);

  useEffect(() => {
    sessionStorage.setItem("eval_activeTab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    sessionStorage.setItem("eval_currentStepIndex", currentStepIndex.toString());
  }, [currentStepIndex]);

  const handleSubmit = async () => {
    if (!isFormComplete()) {
      setServerError("Please complete all ratings and comments before submitting.");
      return;
    }
    
    setSubmitting(true);
    setServerError("");
    
    const submissions = [];
    
    allLecturers.forEach(l => {
      const rowKey = `${l.lecturer_id}-${l.course_id}-${l.evalType}`;
      const row = formState[rowKey];
      const questions = l.evalType === "theory" ? theoryQuestions : practicalQuestions;
      
      const formattedResponses = questions.map(q => {
        const score = row.responses[q.id];
        return { questionId: q.id, score };
      });
      
      let totalScore = 0;
      let totalMax = 0;
      
      questions.forEach(q => { 
        totalScore += (row.responses[q.id] || 0); 
        totalMax += 5; 
      });
      
      const overallPercentage = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;

      submissions.push({
        lecturerId: l.lecturer_id,
        courseId: l.course_id,
        type: l.evalType,
        responses: formattedResponses,
        overallGrade: overallPercentage,
        comment: row.comment
      });
    });

    try {
      await api.post("/student/submissions/bulk", {
        semesterId: selection.semesterId,
        academicYear: selection.academicYear,
        submissions
      });
      sessionStorage.removeItem("eval_formState");
      sessionStorage.removeItem("eval_activeTab");
      sessionStorage.removeItem("eval_currentStepIndex");
      navigate("/student/evaluation/thank-you", { replace: true });
    } catch (error) {
      setServerError(error.response?.data?.message || "Unable to submit evaluations.");
    } finally {
      setSubmitting(false);
    }
  };

  const theoryLecturers = allLecturers.filter(l => l.evalType === 'theory');
  const practicalLecturers = allLecturers.filter(l => l.evalType === 'practical');

  const currentLecturers = activeTab === 'theory' ? theoryLecturers : practicalLecturers;
  const currentQuestions = activeTab === 'theory' ? theoryQuestions : practicalQuestions;
  const isCommentsStep = currentStepIndex >= currentQuestions.length;

  return (
    <StudentLayout>
      <section className="rounded-3xl border border-teal-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-teal-900">Module Evaluation</h2>
            <p className="mt-2 text-sm text-slate-600">Please indicate your response by checking the appropriate box according to the following scale.<br /> <span className="font-semibold text-brandBlue">5. Strongly Agree &nbsp; 4. Agree &nbsp; 3. Average &nbsp; 2. Disagree &nbsp; 1. Strongly Disagree</span></p>
          </div>
          <Link
            to="/student/dashboard"
            className="inline-flex rounded-2xl border border-teal-200 px-5 py-3 text-sm font-semibold text-teal-700 transition hover:bg-teal-50"
          >
            Change Modules
          </Link>
        </div>

        {serverError && (
          <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {serverError}
          </div>
        )}

        {loading ? (
          <p className="mt-6 text-slate-600">Loading evaluation data...</p>
        ) : allLecturers.length === 0 ? (
          <div className="mt-8 text-center p-12 bg-slate-50 rounded-2xl border border-slate-200">
            <p className="text-slate-500 font-medium">No assigned lecturers to evaluate.</p>
          </div>
        ) : (
          <div className="mt-8">
            {/* TABS */}
            <div className="flex flex-wrap gap-4 mb-8">
              {theoryLecturers.length > 0 && (
                <button 
                  onClick={() => { setActiveTab("theory"); setCurrentStepIndex(0); }}
                  className={`px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2 ${
                    activeTab === 'theory' 
                      ? 'bg-teal-600 text-white shadow-md' 
                      : 'bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-100'
                  }`}
                >
                  Theory Module Evaluation 
                  {activeTab === 'theory' && (
                    <svg className="w-5 h-5 text-white/80" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  )}
                </button>
              )}
              {practicalLecturers.length > 0 && (
                <button 
                  onClick={() => { setActiveTab("practical"); setCurrentStepIndex(0); }}
                  className={`px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2 ${
                    activeTab === 'practical' 
                      ? 'bg-teal-600 text-white shadow-md' 
                      : 'bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-100'
                  }`}
                >
                  Practical Module Evaluation
                  {activeTab === 'practical' && (
                    <svg className="w-5 h-5 text-white/80" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  )}
                </button>
              )}
            </div>

            {/* STEPPER CONTENT */}
            <div className="bg-white">
              {!isCommentsStep ? (
                // --- QUESTION STEP ---
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-6">
                    {currentStepIndex + 1} of {currentQuestions.length}. {currentQuestions[currentStepIndex]?.question_text}
                  </h3>
                  
                  {/* DESKTOP TABLE VIEW */}
                  <div className="hidden md:block overflow-x-auto border rounded-xl border-slate-200 shadow-sm">
                    <table className="w-full text-left text-sm border-collapse min-w-[700px]">
                      <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                        <tr>
                          <th className="p-4 font-semibold min-w-[200px] border-r border-slate-200">Lecturer Name</th>
                          <th className="p-4 font-semibold min-w-[120px] border-r border-slate-200">Course Code</th>
                          {[5, 4, 3, 2, 1].map(num => (
                            <th key={num} className="p-4 font-bold text-center border-r border-slate-200 text-teal-800 w-16 sm:w-20">{num}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {currentLecturers.map((l) => {
                          const rowKey = `${l.lecturer_id}-${l.course_id}-${l.evalType}`;
                          const row = formState[rowKey];
                          const qId = currentQuestions[currentStepIndex].id;
                          
                          return (
                            <tr key={rowKey} className="hover:bg-slate-50 transition border-b border-slate-100 last:border-b-0">
                              <td className="p-4 font-medium text-slate-900 border-r border-slate-200 bg-white sticky left-0 z-10">{l.lecturer_name}</td>
                              <td className="p-4 text-slate-600 border-r border-slate-200">{l.course_code}</td>
                              {[5, 4, 3, 2, 1].map(num => {
                                const isSelected = row.responses[qId] === num;
                                return (
                                  <td 
                                    key={num} 
                                    className="p-3 border-r border-slate-200 text-center cursor-pointer hover:bg-teal-50 transition-colors" 
                                    onClick={() => handleResponseChange(rowKey, qId, num)}
                                  >
                                    {isSelected ? (
                                        <div className="mx-auto w-10 h-10 flex items-center justify-center bg-teal-600 text-white rounded shadow-sm scale-110 transition-transform">
                                          <svg className="w-5 h-5 font-bold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                      ) : (
                                        <div className="mx-auto w-10 h-10 rounded border-2 border-slate-300 hover:border-teal-400 bg-white shadow-sm transition-all"></div>
                                      )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* MOBILE CARD VIEW */}
                  <div className="md:hidden flex flex-col gap-5 mt-2">
                    {currentLecturers.map((l) => {
                      const rowKey = `${l.lecturer_id}-${l.course_id}-${l.evalType}`;
                      const row = formState[rowKey];
                      const qId = currentQuestions[currentStepIndex].id;
                      
                      return (
                        <div key={rowKey} className="border border-slate-200 rounded-2xl p-5 shadow-sm bg-white">
                          <h4 className="font-bold text-slate-900 text-base">{l.lecturer_name}</h4>
                          <p className="text-sm font-medium text-slate-500 mb-5">{l.course_code}</p>
                          
                          <div className="flex justify-between items-center gap-2">
                            {[5, 4, 3, 2, 1].map(num => {
                              const isSelected = row.responses[qId] === num;
                              return (
                                <div 
                                  key={num}
                                  onClick={() => handleResponseChange(rowKey, qId, num)}
                                  className={`flex-1 flex flex-col items-center justify-center py-3 rounded-xl border-2 cursor-pointer transition-all ${
                                    isSelected 
                                      ? "bg-teal-600 border-teal-600 text-white shadow-md scale-105" 
                                      : "bg-slate-50 border-slate-200 text-slate-600 hover:border-teal-400 hover:bg-teal-50"
                                  }`}
                                >
                                  <span className={`font-bold text-lg ${isSelected ? "text-white" : ""}`}>{num}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                // --- COMMENTS STEP ---
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-6">
                    Final Step: Overall Comments for {activeTab === 'theory' ? 'Theory' : 'Practical'} Modules
                  </h3>
                  
                  {/* DESKTOP TABLE VIEW */}
                  <div className="hidden md:block overflow-x-auto border rounded-xl border-slate-200 shadow-sm">
                    <table className="w-full text-left text-sm border-collapse min-w-[700px]">
                      <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                        <tr>
                          <th className="p-4 font-semibold w-1/4 border-r border-slate-200">Lecturer Name</th>
                          <th className="p-4 font-semibold w-32 border-r border-slate-200">Course Code</th>
                          <th className="p-4 font-semibold">Comment</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {currentLecturers.map((l) => {
                          const rowKey = `${l.lecturer_id}-${l.course_id}-${l.evalType}`;
                          const row = formState[rowKey];
                          
                          return (
                            <tr key={rowKey} className="hover:bg-slate-50 transition border-b border-slate-100 last:border-b-0">
                              <td className="p-4 font-medium text-slate-900 border-r border-slate-200 bg-white sticky left-0 z-10">{l.lecturer_name}</td>
                              <td className="p-4 text-slate-600 border-r border-slate-200">{l.course_code}</td>
                              <td className="p-4">
                                <textarea
                                  value={row.comment}
                                  onChange={(e) => handleCommentChange(rowKey, e.target.value)}
                                  placeholder="Write a constructive comment..."
                                  rows="2"
                                  className="w-full rounded-lg border border-slate-300 p-3 focus:ring-teal-500 focus:border-teal-500 text-sm"
                                  required
                                ></textarea>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* MOBILE CARD VIEW */}
                  <div className="md:hidden flex flex-col gap-4 mt-2">
                    {currentLecturers.map((l) => {
                      const rowKey = `${l.lecturer_id}-${l.course_id}-${l.evalType}`;
                      const row = formState[rowKey];
                      
                      return (
                        <div key={rowKey} className="border border-slate-200 rounded-2xl p-5 shadow-sm bg-white">
                          <h4 className="font-bold text-slate-900 text-base">{l.lecturer_name}</h4>
                          <p className="text-sm font-medium text-slate-500 mb-4">{l.course_code}</p>
                          <textarea
                            value={row.comment}
                            onChange={(e) => handleCommentChange(rowKey, e.target.value)}
                            placeholder="Write a constructive comment..."
                            rows="3"
                            className="w-full rounded-xl border border-slate-300 p-4 focus:ring-teal-500 focus:border-teal-500 text-sm bg-slate-50 focus:bg-white transition-colors"
                            required
                          ></textarea>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* NAVIGATION FOOTER */}
            <div className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center mt-8 pt-6 border-t border-slate-200 gap-3 sm:gap-0">
              <button 
                onClick={() => setCurrentStepIndex(prev => prev - 1)}
                disabled={currentStepIndex === 0}
                className="w-full sm:w-auto px-6 py-3 border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-30 transition-colors text-center"
              >
                Previous
              </button>

              {!isCommentsStep ? (
                <button 
                  onClick={() => setCurrentStepIndex(prev => prev + 1)}
                  disabled={!currentLecturers.every(l => formState[`${l.lecturer_id}-${l.course_id}-${l.evalType}`]?.responses?.[currentQuestions[currentStepIndex]?.id] !== undefined)}
                  className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-teal-600 text-center"
                >
                  Next Question
                </button>
              ) : (
                <button 
                  onClick={() => {
                    if (activeTab === 'theory' && practicalLecturers.length > 0) {
                      setActiveTab('practical');
                      setCurrentStepIndex(0);
                    } else {
                      handleSubmit();
                    }
                  }}
                  disabled={submitting || (activeTab === 'theory' && practicalLecturers.length > 0 ? !isTabComplete('theory') : !isFormComplete())}
                  className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-center"
                >
                  {submitting ? "Submitting..." : (activeTab === 'theory' && practicalLecturers.length > 0 ? "Next: Practical Evaluation" : "Submit All Evaluations")}
                </button>
              )}
            </div>
            
            {/* Warning if trying to submit but form is incomplete */}
            {isCommentsStep && (activeTab === 'practical' || practicalLecturers.length === 0) && !isFormComplete() && (
              <p className="text-center sm:text-right text-red-500 text-xs font-semibold mt-4">
                *Please ensure you have answered all 10 questions and added comments for all lecturers across all tabs.
              </p>
            )}

          </div>
        )}
      </section>
    </StudentLayout>
  );
};

export default EvaluationHub;
