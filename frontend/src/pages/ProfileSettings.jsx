import { useEffect, useState } from "react";
import api from "../api/axios.js";
import AdminLayout from "../components/AdminLayout.jsx";
import DeanLayout from "../components/DeanLayout.jsx";
import HoDLayout from "../components/HoDLayout.jsx";
import LecturerLayout from "../components/LecturerLayout.jsx";
import PasswordInput from "../components/PasswordInput.jsx";
import StudentLayout from "../components/StudentLayout.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const layoutByRole = {
  admin: AdminLayout,
  student: StudentLayout,
  lecturer: LecturerLayout,
  hod: HoDLayout,
  dean: DeanLayout,
};

const ProfileSettings = () => {
  const { user, setUser } = useAuth();
  const Layout = layoutByRole[user?.role] || StudentLayout;
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({ fullName: "", phone: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadProfile = async () => {
    const response = await api.get("/users/me");
    const loaded = response.data.user;
    setProfile(loaded);
    setProfileForm({ fullName: loaded.full_name || loaded.name || "", phone: loaded.phone || "" });
  };

  useEffect(() => { loadProfile(); }, []);

  const saveProfile = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      const response = await api.patch("/users/me/profile", profileForm);
      setProfile(response.data.user);
      setUser(response.data.user);
      setMessage("Profile updated successfully.");
    } catch (saveError) {
      setError(saveError.response?.data?.message || "Unable to update profile.");
    }
  };

  const savePhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setMessage("");
    setError("");
    try {
      const data = new FormData();
      data.append("profilePhoto", file);
      const response = await api.patch("/users/me/photo", data, { headers: { "Content-Type": "multipart/form-data" } });
      setProfile(response.data.user);
      setUser(response.data.user);
      setMessage("Profile photo updated successfully.");
    } catch (photoError) {
      setError(photoError.response?.data?.message || "Unable to update profile photo.");
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      const response = await api.patch("/users/me/password", passwordForm);
      setUser(response.data.user);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setMessage("Password changed successfully.");
    } catch (passwordError) {
      setError(passwordError.response?.data?.message || "Unable to change password.");
    }
  };

  const photoUrl = profile?.profile_photo || profile?.profilePhoto;
  const photoSrc = photoUrl?.startsWith("/uploads")
    ? `${api.defaults.baseURL.replace(/\/api$/, "")}${photoUrl}`
    : photoUrl;

  return (
    <Layout title="Profile Settings">
      {message && <p className="mb-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{message}</p>}
      {error && <p className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-950">Account Details</h2>
          <div className="mt-5 flex items-center gap-4">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl bg-slate-100 text-2xl font-bold text-slate-500">
              {photoSrc ? <img src={photoSrc} alt="" className="h-full w-full object-cover" /> : (profile?.full_name || "U").slice(0, 2).toUpperCase()}
            </div>
            <label className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700">
              Upload Photo
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={savePhoto} className="hidden" />
            </label>
          </div>

          <dl className="mt-6 space-y-3 text-sm">
            <div><dt className="font-semibold text-slate-500">University ID</dt><dd className="mt-1 text-slate-950">{profile?.university_id}</dd></div>
            <div><dt className="font-semibold text-slate-500">Email</dt><dd className="mt-1 text-slate-950">{profile?.email}</dd></div>
            <div><dt className="font-semibold text-slate-500">Role</dt><dd className="mt-1 capitalize text-slate-950">{profile?.role}</dd></div>
            <div><dt className="font-semibold text-slate-500">Department</dt><dd className="mt-1 text-slate-950">{profile?.department_name || "Not assigned"}</dd></div>
          </dl>
        </section>

        <div className="space-y-6">
          <form onSubmit={saveProfile} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-950">Edit Profile</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <input value={profileForm.fullName} onChange={(e) => setProfileForm((c) => ({ ...c, fullName: e.target.value }))} className="rounded-2xl border border-slate-300 px-4 py-3" placeholder="Full name" required />
              <input value={profileForm.phone} onChange={(e) => setProfileForm((c) => ({ ...c, phone: e.target.value }))} className="rounded-2xl border border-slate-300 px-4 py-3" placeholder="Phone number" />
            </div>
            <button className="mt-5 rounded-2xl bg-slate-900 px-5 py-3 font-semibold text-white">Save Profile</button>
          </form>

          <form onSubmit={savePassword} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-950">Change Password</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <PasswordInput value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((c) => ({ ...c, currentPassword: e.target.value }))} placeholder="Current password" required />
              <PasswordInput value={passwordForm.newPassword} onChange={(e) => setPasswordForm((c) => ({ ...c, newPassword: e.target.value }))} placeholder="New password" required />
              <PasswordInput value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((c) => ({ ...c, confirmPassword: e.target.value }))} placeholder="Confirm password" required />
            </div>
            <p className="mt-3 text-xs text-slate-500">Use at least 8 characters with uppercase, lowercase, and a number.</p>
            <button className="mt-5 rounded-2xl bg-slate-900 px-5 py-3 font-semibold text-white">Change Password</button>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default ProfileSettings;
