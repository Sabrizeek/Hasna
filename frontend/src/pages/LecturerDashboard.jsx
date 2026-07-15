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
      <section className="rounded-3xl border border-sky-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_180px] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">Welcome Back</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-950">{user?.full_name}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {user?.department_name || "Faculty of Science"} lecturer workspace for module evaluation results and supervision reports.
            </p>
          </div>
          <div className="flex h-32 w-32 items-center justify-center rounded-3xl bg-sky-700 text-4xl font-bold text-white shadow-sm lg:justify-self-end">
            {initialsFromName(user?.full_name)}
          </div>
        </div>
      </section>

      <div className="mt-6">
        <DashboardAnnouncements accent="sky" />
      </div>


    </LecturerLayout>
  );
};

export default LecturerDashboard;
