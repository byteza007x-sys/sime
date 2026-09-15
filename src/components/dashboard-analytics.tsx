"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface MonthlyPoint {
  label: string;
  count: number;
}

interface StatusPoint {
  label: string;
  value: number;
  color: string;
}

interface DashboardAnalyticsProps {
  monthlyCounts: MonthlyPoint[];
  statusData: StatusPoint[];
  donePercent: number;
  labels: {
    jobsByMonth: string;
    statusMix: string;
    pipeline: string;
    completedRate: string;
  };
}

export default function DashboardAnalytics({
  monthlyCounts,
  statusData,
  donePercent,
  labels,
}: DashboardAnalyticsProps) {
  const pipelineData = statusData.map((item) => ({
    name: item.label,
    value: item.value,
    fill: item.color,
  }));

  return (
    <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="interactive-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase text-blue-600 dark:text-blue-300">
              Analytics
            </p>
            <h2 className="mt-1 text-lg font-black tracking-normal">
              {labels.jobsByMonth}
            </h2>
          </div>
          <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/50 dark:text-blue-200 dark:ring-blue-900">
            {labels.completedRate}: {donePercent}%
          </div>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyCounts} margin={{ left: -18, right: 12, top: 16 }}>
              <defs>
                <linearGradient id="jobsLine" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="50%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
                <linearGradient id="jobsFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(148, 163, 184, 0.2)" vertical={false} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 12, fontWeight: 700 }}
              />
              <Tooltip
                cursor={{ stroke: "#2563eb", strokeWidth: 1, strokeDasharray: "4 4" }}
                contentStyle={{
                  border: "1px solid rgba(148, 163, 184, 0.28)",
                  borderRadius: 12,
                  boxShadow: "0 18px 36px rgba(15, 23, 42, 0.14)",
                  fontWeight: 700,
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="url(#jobsLine)"
                strokeWidth={4}
                fill="url(#jobsFill)"
                activeDot={{ r: 6, strokeWidth: 3, stroke: "#ffffff" }}
                isAnimationActive
                animationDuration={900}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-1">
        <div className="interactive-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-300">
                Realtime
              </p>
              <h2 className="mt-1 text-lg font-black tracking-normal">
                {labels.statusMix}
              </h2>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-900">
              {donePercent}%
            </span>
          </div>
          <div className="grid items-center gap-3 sm:grid-cols-[150px_1fr] xl:grid-cols-[150px_1fr]">
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={44}
                    outerRadius={68}
                    paddingAngle={4}
                    isAnimationActive
                    animationDuration={850}
                  >
                    {statusData.map((item) => (
                      <Cell key={item.label} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      border: 0,
                      borderRadius: 12,
                      boxShadow: "0 18px 36px rgba(15, 23, 42, 0.2)",
                      fontWeight: 700,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {statusData.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span className="text-sm font-black text-slate-900 dark:text-slate-100">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="interactive-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4">
            <p className="text-xs font-black uppercase text-violet-600 dark:text-violet-300">
              Queue
            </p>
            <h2 className="mt-1 text-lg font-black tracking-normal">
              {labels.pipeline}
            </h2>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineData} layout="vertical" margin={{ left: 4, right: 12 }}>
                <CartesianGrid stroke="rgba(148, 163, 184, 0.16)" horizontal={false} />
                <XAxis type="number" allowDecimals={false} hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={88}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 11, fontWeight: 800 }}
                />
                <Tooltip
                  cursor={{ fill: "rgba(37, 99, 235, 0.06)" }}
                  contentStyle={{
                    border: "1px solid rgba(148, 163, 184, 0.25)",
                    borderRadius: 12,
                    fontWeight: 700,
                  }}
                />
                <Bar
                  dataKey="value"
                  radius={[0, 10, 10, 0]}
                  barSize={18}
                  isAnimationActive
                  animationDuration={900}
                >
                  {pipelineData.map((item) => (
                    <Cell key={item.name} fill={item.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
