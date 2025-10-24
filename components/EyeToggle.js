export default function EyeToggle({ open, onToggle, label = 'Toggle chart visibility' }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={open ? `Hide ${label}` : `Show ${label}`}
      className={`p-2 rounded-full border transition-colors duration-200 ${open ? 'border-blue-200 hover:bg-blue-50 text-blue-700' : 'border-gray-300 hover:bg-gray-100 text-gray-500'}`}
    >
      {open ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
          <path d="M17.94 17.94C16.23 18.94 14.22 19.5 12 19.5 5 19.5 1 12 1 12c.92-1.67 2.09-3.14 3.44-4.33m3.52-2.34C9.61 4.84 10.77 4.5 12 4.5c7 0 11 7.5 11 7.5-.74 1.35-1.65 2.57-2.68 3.61" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      )}
    </button>
  );
}
