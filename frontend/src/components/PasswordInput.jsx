import { useState } from "react";

const PasswordInput = ({ className = "", inputClassName = "", ...props }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`w-full rounded-2xl border border-slate-300 px-4 py-3 pr-12 outline-none transition focus:border-brandBlue ${inputClassName}`}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
        aria-label={visible ? "Hide password" : "Show password"}
        title={visible ? "Hide password" : "Show password"}
      >
        {visible ? (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m3 3 18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M10.6 10.6A2 2 0 0 0 13.4 13.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M9.5 5.4A10.6 10.6 0 0 1 12 5c5 0 8.5 4.2 9.5 7-0.4 1.1-1.2 2.4-2.3 3.5M6.7 6.8C4.6 8.1 3.1 10.2 2.5 12c1 2.8 4.5 7 9.5 7 1.6 0 3-.4 4.2-1.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M2.5 12c1-2.8 4.5-7 9.5-7s8.5 4.2 9.5 7c-1 2.8-4.5 7-9.5 7s-8.5-4.2-9.5-7Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </div>
  );
};

export default PasswordInput;
