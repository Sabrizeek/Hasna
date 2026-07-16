import { useState } from "react";
import Sidebar from "./Sidebar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import TopHeader from "./TopHeader.jsx";
import ProfileAvatarButton from "./ProfileAvatarButton.jsx";
import SiteFooter from "./SiteFooter.jsx";

const AdminLayout = ({ title, children }) => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-brandBg">
      {/* Sidebar (handles its own mobile overlay/drawer) */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content – offset on desktop */}
      <main className="min-w-0 flex-1 overflow-x-hidden lg:ml-72">
        <TopHeader
          title="Admin Portal"
          user={user}
          logout={logout}
          setSidebarOpen={setSidebarOpen}
          profileTo="/admin/profile"
          avatarFallback="AD"
          avatarColor="bg-brandBlue"
          notificationAccent="text-brandGold"
        />

        {/* Page content */}
        <div className="min-w-0 overflow-x-hidden p-4 pt-20 sm:p-6 sm:pt-20 lg:p-8 lg:pt-20">
          {children}
        </div>
        <SiteFooter compact />
      </main>
    </div>
  );
};

export default AdminLayout;
