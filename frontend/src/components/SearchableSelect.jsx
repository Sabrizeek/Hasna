import { useEffect, useRef, useState } from "react";

const SearchableSelect = ({ options, value, onChange, placeholder = "Select an option..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef(null);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      <div
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setSearchQuery("");
        }}
        className="flex w-full cursor-pointer items-center justify-between rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm transition focus-within:border-brandBlue focus-within:ring-2 focus-within:ring-brandBlue/20"
      >
        {isOpen ? (
          <input
            type="text"
            className="w-full bg-transparent outline-none placeholder:text-slate-400"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        ) : (
          <span className={`truncate ${selectedOption ? "text-slate-900" : "text-slate-500"}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        )}
        <svg style={{ width: "16px", height: "16px", flexShrink: 0 }} className="ml-2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-2xl border border-slate-200 bg-white py-2 shadow-lg">
          {filteredOptions.length === 0 ? (
            <div className="px-4 py-2 text-sm text-slate-500">No options found.</div>
          ) : (
            filteredOptions.map((opt) => (
              <div
                key={opt.value}
                onClick={() => {
                  onChange({ target: { value: opt.value } });
                  setIsOpen(false);
                }}
                className={`cursor-pointer px-4 py-2 text-sm transition hover:bg-brandBlue/5 ${
                  String(opt.value) === String(value) ? "bg-brandBlue/10 font-semibold text-brandBlue" : "text-slate-700"
                }`}
              >
                {opt.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
