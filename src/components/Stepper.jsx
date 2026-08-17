export default function Stepper({ step, onStepClick }) {
  const steps = [
    { id: 1, label: 'Upload Takeoff' },
    { id: 2, label: 'Edit & Review' },
    { id: 3, label: 'Results & Proposal' },
  ];

  return (
    <nav className="no-print flex items-center justify-center gap-2 sm:gap-4 py-6 px-4 bg-white border-b border-slate-200">
      {steps.map((s, idx) => (
        <div key={s.id} className="flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => onStepClick(s.id)}
            disabled={s.id > step}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
              ${
                s.id === step
                  ? 'bg-indigo-600 text-white'
                  : s.id < step
                  ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 cursor-pointer'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
          >
            <span
              className={`flex items-center justify-center w-5 h-5 rounded-full text-xs
                ${s.id === step ? 'bg-white text-indigo-600' : s.id < step ? 'bg-indigo-600 text-white' : 'bg-slate-300 text-white'}`}
            >
              {s.id}
            </span>
            <span className="hidden sm:inline">{s.label}</span>
          </button>
          {idx < steps.length - 1 && <div className="w-6 sm:w-10 h-px bg-slate-300" />}
        </div>
      ))}
    </nav>
  );
}
