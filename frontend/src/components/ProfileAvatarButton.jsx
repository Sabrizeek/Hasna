import { Link } from "react-router-dom";

const apiBase = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:5000/api`;
const serverBase = apiBase.replace(/\/api\/?$/, "");

const initialsFromName = (name = "", fallback = "U") => {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || fallback;
};

const resolvePhotoUrl = (photoUrl) => {
  if (!photoUrl) return null;
  if (/^https?:\/\//i.test(photoUrl)) return photoUrl;
  return `${serverBase}/${String(photoUrl).replace(/^\/+/, "")}`;
};

const ProfileAvatarButton = ({ user, to, fallback = "U", className = "bg-slate-900" }) => {
  const photoUrl = resolvePhotoUrl(user?.profile_photo || user?.profilePhoto);

  return (
    <Link
      to={to}
      className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-white shadow-sm ${className}`}
      aria-label="Profile"
      title="Profile"
    >
      {photoUrl ? (
        <img src={photoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initialsFromName(user?.full_name || user?.name, fallback)
      )}
    </Link>
  );
};

export default ProfileAvatarButton;
