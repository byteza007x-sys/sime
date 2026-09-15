import {
  Bell,
  AlertTriangle,
  CircleCheck,
  Clock3,
  Wrench,
} from "lucide-react";

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: "success" | "warning" | "info";
  time: string;
}

interface NotificationsProps {
  notifications: NotificationItem[];
}

export default function Notifications({
  notifications,
}: NotificationsProps) {
  const getIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "success":
        return <CircleCheck className="h-5 w-5 text-green-600" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default:
        return <Wrench className="h-5 w-5 text-blue-600" />;
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

      <div className="mb-6 flex items-center justify-between">

        <div>

          <h2 className="text-xl font-bold text-slate-900">
            Notifications
          </h2>

          <p className="text-sm text-slate-500">
            Latest system activities
          </p>

        </div>

        <div className="relative">

          <Bell className="text-blue-600" size={24} />

          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
            {notifications.length}
          </span>

        </div>

      </div>

      <div className="space-y-4">

        {notifications.length === 0 && (

          <div className="rounded-xl bg-slate-50 p-6 text-center">

            <Bell
              className="mx-auto mb-3 text-slate-300"
              size={32}
            />

            <p className="text-slate-500">
              No notifications
            </p>

          </div>

        )}

        {notifications.map((item) => (

          <div
            key={item.id}
            className="rounded-2xl border border-slate-100 p-4 transition hover:bg-slate-50"
          >

            <div className="flex items-start gap-4">

              <div className="mt-1">
                {getIcon(item.type)}
              </div>

              <div className="flex-1">

                <h3 className="font-semibold text-slate-900">
                  {item.title}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {item.message}
                </p>

                <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">

                  <Clock3 size={14} />

                  {item.time}

                </div>

              </div>

            </div>

          </div>

        ))}

      </div>

    </div>
  );
}