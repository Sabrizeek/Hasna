import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import Login from "./pages/Login.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ChangePassword from "./pages/ChangePassword.jsx";
import ProfileSettings from "./pages/ProfileSettings.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import PendingUsers from "./pages/PendingUsers.jsx";
import UserManagement from "./pages/UserManagement.jsx";
import DepartmentManagement from "./pages/DepartmentManagement.jsx";
import ModuleManagement from "./pages/ModuleManagement.jsx";
import AdminAwardScores from "./pages/AdminAwardScores.jsx";
import SemesterManagement from "./pages/SemesterManagement.jsx";
import EvaluationWindowManagement from "./pages/EvaluationWindowManagement.jsx";
import AnnouncementManagement from "./pages/AnnouncementManagement.jsx";
import AdminReportsAudit from "./pages/AdminReportsAudit.jsx";
import StudentDashboard from "./pages/StudentDashboard.jsx";
import LecturerSelection from "./pages/LecturerSelection.jsx";
import LecturerProfile from "./pages/LecturerProfile.jsx";
import EvaluationHub from "./pages/EvaluationHub.jsx";
import StudentModuleRegistration from "./pages/StudentModuleRegistration.jsx";

import EvaluationThankYou from "./pages/EvaluationThankYou.jsx";
import LecturerDashboard from "./pages/LecturerDashboard.jsx";
import LecturerEvaluationResults from "./pages/LecturerEvaluationResults.jsx";
import LecturerActivityReports from "./pages/LecturerActivityReports.jsx";
import LecturerPeerEvaluations from "./pages/LecturerPeerEvaluations.jsx";
import AdminPeerEvaluations from "./pages/AdminPeerEvaluations.jsx";
import AdminActivityReports from "./pages/AdminActivityReports.jsx";
import HoDDashboard from "./pages/HoDDashboard.jsx";
import HoDLecturerDetail from "./pages/HoDLecturerDetail.jsx";
import DeanDashboard from "./pages/DeanDashboard.jsx";
import DeanDepartmentDetail from "./pages/DeanDepartmentDetail.jsx";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/register" element={<Navigate to="/login" replace />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/notifications" element={<NotificationsPage />} />
      </Route>

      <Route element={<ProtectedRoute roles={["admin"]} />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/pending-users" element={<PendingUsers />} />
        <Route path="/admin/users" element={<UserManagement />} />
        <Route path="/admin/departments" element={<DepartmentManagement />} />
        <Route path="/admin/modules" element={<ModuleManagement />} />
        <Route path="/admin/award-scores" element={<AdminAwardScores />} />
        <Route path="/admin/semesters" element={<SemesterManagement />} />
        <Route path="/admin/evaluation-windows" element={<EvaluationWindowManagement />} />
        <Route path="/admin/announcements" element={<AnnouncementManagement />} />
        <Route path="/admin/reports-audit" element={<AdminReportsAudit />} />
        <Route path="/admin/peer-evaluations" element={<AdminPeerEvaluations />} />
        <Route path="/admin/activity-reports" element={<AdminActivityReports />} />
        <Route path="/admin/profile" element={<ProfileSettings />} />
      </Route>

      <Route element={<ProtectedRoute roles={["student"]} />}>
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/evaluation-hub" element={<EvaluationHub />} />
        <Route path="/student/modules" element={<StudentModuleRegistration />} />

        <Route path="/student/evaluation/thank-you" element={<EvaluationThankYou />} />
        <Route path="/student/profile" element={<ProfileSettings />} />
      </Route>

      <Route element={<ProtectedRoute roles={["lecturer"]} />}>
        <Route path="/lecturer/dashboard" element={<LecturerDashboard />} />
        <Route path="/lecturer/evaluation-results/:courseId" element={<LecturerEvaluationResults />} />
        <Route path="/lecturer/supervision-reports" element={<LecturerActivityReports />} />
        <Route path="/lecturer/peer-evaluations" element={<LecturerPeerEvaluations />} />
        <Route path="/lecturer/profile" element={<ProfileSettings />} />
      </Route>

      <Route element={<ProtectedRoute roles={["hod"]} />}>
        <Route path="/hod/dashboard" element={<HoDDashboard />} />
        <Route path="/hod/lecturers/:lecturerId" element={<HoDLecturerDetail />} />
        <Route path="/hod/profile" element={<ProfileSettings />} />
      </Route>

      <Route element={<ProtectedRoute roles={["dean"]} />}>
        <Route path="/dean/dashboard" element={<DeanDashboard />} />
        <Route path="/dean/departments/:departmentId" element={<DeanDepartmentDetail />} />
        <Route path="/dean/lecturers/:lecturerId" element={<HoDLecturerDetail />} />
        <Route path="/dean/profile" element={<ProfileSettings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
