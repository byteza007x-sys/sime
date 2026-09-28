import Link from "next/link";
import { ArrowRight, ClipboardList, Eye } from "lucide-react";

interface Report {
  report_id: number | string;
  job_number: string;
  status: string | null;
  created_at: Date;
  customers: {
    company_name: string;
  };
}

interface RecentReportsProps {
  reports: Report[];
}

const statusColor = (status: string | null) => {
  switch (status) {
    case "Completed":
      return "bg-green-100 text-green-700";
    case "Open":
      return "bg-yellow-100 text-yellow-700";
    case "In_Progress":
    case "In Progress":
      return "bg-blue-100 text-blue-700";
    case "Cancelled":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

const statusLabel = (status: string | null) =>
  status ? status.replaceAll("_", " ") : "Unknown";

export default function RecentReports({ reports }: RecentReportsProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b p-6">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <ClipboardList className="text-blue-600" size={22} />
            Recent Jobs
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            รายการใบ Service ล่าสุด
          </p>
        </div>

        <Link
          href="/reports"
          className="flex items-center gap-2 text-blue-600 hover:underline"
        >
          View All
          <ArrowRight size={18} />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold">
                Job No.
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold">
                Customer
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold">
                Status
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold">
                Date
              </th>
              <th className="px-6 py-4 text-center text-sm font-semibold">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {reports.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-slate-500">
                  ยังไม่มีข้อมูลใบ Service
                </td>
              </tr>
            )}

            {reports.map((report) => (
              <tr
                key={report.report_id}
                className="border-t transition hover:bg-slate-50"
              >
                <td className="px-6 py-5 font-semibold">
                  {report.job_number}
                </td>
                <td className="px-6 py-5">
                  {report.customers.company_name}
                </td>
                <td className="px-6 py-5">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor(
                      report.status,
                    )}`}
                  >
                    {statusLabel(report.status)}
                  </span>
                </td>
                <td className="px-6 py-5 text-slate-500">
                  {new Date(report.created_at).toLocaleDateString("th-TH")}
                </td>
                <td className="px-6 py-5 text-center">
                  <Link
                    href={`/reports/${report.report_id}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
                  >
                    <Eye size={16} />
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
