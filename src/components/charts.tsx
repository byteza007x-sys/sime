"use client";

import {
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

interface DashboardChartsProps {
  monthlyData: {
    month: string;
    total: number;
  }[];
  statusData: {
    name: string;
    value: number;
  }[];
}

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626"];

export default function DashboardCharts({
  monthlyData,
  statusData,
}: DashboardChartsProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="rounded-3xl border bg-white p-6 shadow-sm lg:col-span-2">
        <div className="mb-6">
          <h2 className="text-xl font-bold">Monthly Service Reports</h2>
          <p className="text-sm text-slate-500">
            จำนวนใบงานแต่ละเดือน
          </p>
        </div>

        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="total" radius={[10, 10, 0, 0]} fill="#2563eb" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-3xl border bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-bold">Job Status</h2>
          <p className="text-sm text-slate-500">
            สัดส่วนสถานะงาน
          </p>
        </div>

        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={statusData}
              dataKey="value"
              nameKey="name"
              innerRadius={65}
              outerRadius={100}
              paddingAngle={3}
            >
              {statusData.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>

        <div className="mt-5 space-y-3">
          {statusData.map((item, index) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{
                    background: COLORS[index % COLORS.length],
                  }}
                />
                <span>{item.name}</span>
              </div>
              <span className="font-semibold">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
