export default function AppLoading() {
  return (
    <main className="animate-page min-h-screen bg-slate-100 p-5 text-slate-950 dark:bg-slate-950 dark:text-white sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="h-8 w-48 rounded-lg bg-slate-200 dark:bg-slate-800" />
          <div className="mt-3 h-4 w-80 max-w-full rounded-lg bg-slate-200 dark:bg-slate-800" />
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="animate-pulse rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="h-11 w-11 rounded-lg bg-slate-200 dark:bg-slate-800" />
              <div className="mt-5 h-7 w-24 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="mt-3 h-4 w-32 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
          <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="h-5 w-44 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="mt-5 h-72 rounded-xl bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="h-5 w-40 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="mt-5 space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-12 rounded-lg bg-slate-200 dark:bg-slate-800"
                />
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
