import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios.js";
import DashboardAnnouncements from "../components/DashboardAnnouncements.jsx";
import LecturerLayout from "../components/LecturerLayout.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const initialsFromName = (name = "") => {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "LE";
};

const LecturerDashboard = () => {
  const { user } = useAuth();

  return (
    <LecturerLayout>
      <div className="mb-6 sm:mb-8">
        <p className="text-sm font-semibold uppercase tracking-widest text-sky-700">Welcome Back</p>
        <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">{user?.full_name}</h2>
        <p className="mt-2 text-sm text-slate-600">
          Lecturer • {user?.department_name || "Faculty of Science"}
        </p>
      </div>

      <div className="mt-6">
        <DashboardAnnouncements accent="sky" />
      </div>


    </LecturerLayout>
  );
};

export default LecturerDashboard;
