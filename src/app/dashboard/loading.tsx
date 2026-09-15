export default function LoadingDashboard() {
  return (
    <main className="animate-page min-h-screen bg-[#f3f6fb] text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="grid min-h-screen lg:grid-cols-[220px_1fr]">
        <aside className="hidden bg-[#071e49] lg:block">
          <div className="h-16 border-b border-white/10 px-5 py-4">
            <div className="h-8 w-32 animate-pulse rounded-lg bg-white/15" />
          </div>
          <div className="space-y-2 p-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-10 animate-pulse rounded-lg bg-white/10"
              />
            ))}
          </div>
        </aside>

        <section className="min-w-0">
          <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:px-6">
            <div className="h-9 w-72 max-w-[55vw] animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="flex gap-3">
              <div className="h-9 w-20 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
              <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
            </div>
          </header>

          <div className="space-y-5 p-4 sm:p-6">
            <section className="rounded-2xl border border-slate-200 bg-slate-950 p-5 shadow-sm dark:border-slate-800">
              <div className="h-6 w-28 animate-pulse rounded-full bg-white/10" />
              <div className="mt-5 h-9 w-80 max-w-full animate-pulse rounded-lg bg-white/15" />
              <div className="mt-3 h-4 w-[520px] max-w-full animate-pulse rounded-lg bg-white/10" />
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="h-11 w-11 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
                  <div className="mt-5 h-7 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="mt-3 h-4 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                </div>
              ))}
            </section>

            <section className="grid gap-5 xl:grid-cols-[1fr_340px]">
              <div className="grid gap-5 xl:grid-cols-[1fr_0.85fr]">
                <SkeletonPanel height="h-72" />
                <SkeletonPanel height="h-72" />
              </div>
              <SkeletonPanel height="h-72" />
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <SkeletonPanel height="h-52" />
              <SkeletonPanel height="h-52" />
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function SkeletonPanel({ height }: { height: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="h-5 w-44 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      <div className={`mt-5 ${height} animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800`} />
    </div>
  );
}
