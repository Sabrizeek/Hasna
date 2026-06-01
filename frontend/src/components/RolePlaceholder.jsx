const RolePlaceholder = ({ title, description }) => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brandBg px-4">
      <div className="max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-soft">
        <div className="text-xs font-semibold uppercase tracking-[0.35em] text-brandGold">Lecturer Evaluation System</div>
        <h1 className="mt-4 text-3xl font-bold text-brandBlue">{title}</h1>
        <p className="mt-4 text-base leading-7 text-slate-600">{description}</p>
      </div>
    </div>
  );
};

export default RolePlaceholder;
