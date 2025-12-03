import { useState } from "react";
import { FiMenu, FiX } from "react-icons/fi";

export default function DashboardFab({ sections = [], onSelect }) {
  const [open, setOpen] = useState(false);

  const handleSelect = (section) => {
    if (typeof onSelect === "function") onSelect(section);
    setOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end space-y-3">
      {open && (
        <div className="w-64 rounded-2xl bg-slate-900/95 shadow-2xl border border-slate-700/60 backdrop-blur-xl overflow-hidden transition-all duration-200">
          <div className="px-4 py-3 text-xs uppercase tracking-wide text-slate-400 border-b border-slate-800/80">
            Quick Insights
          </div>
          <nav className="max-h-96 overflow-y-auto py-2">
            {sections.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => handleSelect(item.key)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-200 hover:bg-slate-800/70 transition-colors"
              >
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-800 text-slate-200">
                  <item.icon size={18} />
                </span>
                <span>
                  <div className="font-semibold text-slate-100">{item.label}</div>
                  <div className="text-xs text-slate-400">{item.hint}</div>
                </span>
              </button>
            ))}
          </nav>
        </div>
      )}
      <button
        type="button"
        aria-label="Toggle dashboard sections"
        onClick={() => setOpen((prev) => !prev)}
        className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-600 via-indigo-500 to-purple-600 text-white shadow-[0_25px_50px_-12px_rgba(59,130,246,0.6)] hover:shadow-[0_25px_50px_-10px_rgba(99,102,241,0.75)] transition-shadow focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400/60 flex items-center justify-center"
      >
        {open ? <FiX size={26} /> : <FiMenu size={24} />}
      </button>
    </div>
  );
}
