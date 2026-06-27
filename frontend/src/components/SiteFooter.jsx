const footerLinks = [
  { label: "Ruhuna Web", href: "https://www.ruh.ac.lk" },
  { label: "Faculty of Science", href: "https://sci.ruh.ac.lk" },
  { label: "Staff Mail", href: "https://mail.google.com" },
  { label: "FOSMIS", href: "https://paravi.ruh.ac.lk/fosmis" },
];

const SiteFooter = ({ compact = false, className = "" }) => {
  return (
    <footer className={`mt-auto bg-slate-950 text-slate-200 ${className}`}>
      <div className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10 ${compact ? "py-8" : "py-10"}`}>
        <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr_1.2fr]">
          <div>
            <div className="inline-flex rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm font-black tracking-wide text-brandBlue shadow-sm">
              LES | FOS | RUH
            </div>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-300">
              Lecturer Evaluation System for the Faculty of Science, University of Ruhuna. Please use your approved
              university account credentials to access the portal.
            </p>
          </div>

          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.25em] text-brandGold">Info</h2>
            <div className="mt-4 space-y-2">
              {footerLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-sm font-medium text-slate-300 underline-offset-4 hover:text-white hover:underline"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.25em] text-brandGold">Contact Us</h2>
            <div className="mt-4 space-y-2 text-sm leading-6 text-slate-300">
              <p>Faculty of Science, University of Ruhuna</p>
              <p>Matara, Sri Lanka</p>
              <p>Phone: 041 2222681 / 2 - 4808</p>
              <a href="mailto:lms@sci.ruh.ac.lk" className="inline-flex text-slate-300 underline-offset-4 hover:text-white hover:underline">
                E-mail: lms@sci.ruh.ac.lk
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-5 text-center text-xs text-slate-400">
          Department of Computer Science | Faculty of Science | University of Ruhuna
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
