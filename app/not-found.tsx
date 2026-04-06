import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Minimal brand header */}
      <header className="h-16 flex items-center px-6 bg-slate-50 dark:bg-slate-950">
        <span className="text-xl font-semibold tracking-tight text-indigo-700 dark:text-indigo-300">
          Workflow360
        </span>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center text-center">
          {/* Geometric illustration */}
          <div className="relative mb-12 flex justify-center items-center">
            <div className="absolute -z-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl opacity-60" />
            <div className="relative grid grid-cols-2 gap-4 w-64 h-64 items-center">
              <div className="w-full h-full bg-indigo-600 rounded-xl rotate-12 shadow-2xl shadow-indigo-500/20 hover:rotate-6 transition-transform duration-500" />
              <div className="w-full h-full bg-violet-600 rounded-xl -rotate-6 shadow-2xl shadow-violet-500/20 hover:-rotate-12 transition-transform duration-500 translate-y-8" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-8xl font-extrabold text-white/20 select-none">?</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-6 max-w-2xl">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 block mb-4">
                Error Code
              </span>
              <h1 className="text-8xl md:text-9xl font-extrabold tracking-tighter text-foreground leading-none">
                404
              </h1>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
                Page not found
              </h2>
            </div>

            <p className="text-lg text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-md mx-auto">
              The page you are looking for might have been removed or is
              temporarily unavailable.
            </p>

            <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/dashboard"
                className="group relative px-8 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg font-bold tracking-tight shadow-xl shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-2 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                Go to Dashboard
              </Link>
              <button
                onClick={() => typeof window !== "undefined" && window.history.back()}
                className="px-8 py-4 bg-slate-100 dark:bg-slate-800 text-foreground rounded-lg font-bold tracking-tight hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors active:scale-95 flex items-center gap-2"
              >
                Back to Previous
              </button>
            </div>
          </div>

          {/* Footer metadata */}
          <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 w-full border-t border-slate-200/30 dark:border-slate-700/30 pt-12 text-left">
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">
                System Status
              </p>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                All operations are running smoothly except for this specific
                path.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">
                Quick Navigation
              </p>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Press{" "}
                <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs">
                  ⌘K
                </kbd>{" "}
                to search across your workspace.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">
                Contact Support
              </p>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Reach out to our team for assistance.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Ambient grid background */}
      <div
        className="fixed inset-0 -z-20 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(#4F46E5 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
    </div>
  );
}
