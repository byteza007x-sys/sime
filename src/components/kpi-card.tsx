import { LucideIcon, TrendingUp } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color?: string;
  description?: string;
  trend?: number;
}

export default function KpiCard({
  title,
  value,
  icon: Icon,
  color = "bg-blue-600",
  description = "Updated just now",
  trend,
}: KpiCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">

      {/* Background Gradient */}
      <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-blue-100 blur-3xl opacity-30 transition group-hover:opacity-60" />

      <div className="relative">

        {/* Header */}
        <div className="flex items-center justify-between">

          <div
            className={`flex h-14 w-14 items-center justify-center rounded-2xl ${color}`}
          >
            <Icon
              size={28}
              className="text-white"
            />
          </div>

          {trend !== undefined && (
            <div className="flex items-center gap-1 rounded-full bg-green-50 px-3 py-1">

              <TrendingUp
                size={15}
                className="text-green-600"
              />

              <span className="text-sm font-semibold text-green-600">
                +{trend}%
              </span>

            </div>
          )}

        </div>

        {/* Title */}

        <h3 className="mt-6 text-sm font-medium uppercase tracking-wide text-slate-500">
          {title}
        </h3>

        {/* Value */}

        <h2 className="mt-2 text-4xl font-bold text-slate-900">
          {value}
        </h2>

        {/* Progress */}

        <div className="mt-6">

          <div className="h-2 overflow-hidden rounded-full bg-slate-100">

            <div
              className={`h-full rounded-full ${color}`}
              style={{
                width: `${Math.min(Number(value), 100)}%`,
              }}
            />

          </div>

        </div>

        {/* Footer */}

        <div className="mt-5 flex items-center justify-between">

          <p className="text-sm text-slate-400">
            {description}
          </p>

          <span className="text-xs font-semibold text-blue-600">
            LIVE
          </span>

        </div>

      </div>

    </div>
  );
}