import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import PendingUsers from "./pages/PendingUsers.jsx";
import UserManagement from "./pages/UserManagement.jsx";
import DepartmentManagement from "./pages/DepartmentManagement.jsx";
import CourseManagement from "./pages/CourseManagement.jsx";
import SemesterManagement from "./pages/SemesterManagement.jsx";
import AnnouncementManagement from "./pages/AnnouncementManagement.jsx";
import StudentDashboard from "./pages/StudentDashboard.jsx";
import LecturerDashboard from "./pages/LecturerDashboard.jsx";
import HoDDashboard from "./pages/HoDDashboard.jsx";
import DeanDashboard from "./pages/DeanDashboard.jsx";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute roles={["admin"]} />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/pending-users" element={<PendingUsers />} />
        <Route path="/admin/users" element={<UserManagement />} />
        <Route path="/admin/departments" element={<DepartmentManagement />} />
        <Route path="/admin/courses" element={<CourseManagement />} />
        <Route path="/admin/semesters" element={<SemesterManagement />} />
        <Route path="/admin/announcements" element={<AnnouncementManagement />} />
      </Route>

      <Route element={<ProtectedRoute roles={["student"]} />}>
        <Route path="/student/dashboard" element={<StudentDashboard />} />
      </Route>

      <Route element={<ProtectedRoute roles={["lecturer"]} />}>
        <Route path="/lecturer/dashboard" element={<LecturerDashboard />} />
      </Route>

      <Route element={<ProtectedRoute roles={["hod"]} />}>
        <Route path="/hod/dashboard" element={<HoDDashboard />} />
      </Route>

      <Route element={<ProtectedRoute roles={["dean"]} />}>
        <Route path="/dean/dashboard" element={<DeanDashboard />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
