import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color: "blue" | "green" | "red" | "yellow";
  subtitle?: string;
}

export default function KPICard({ title, value, icon: Icon, color, subtitle }: KPICardProps) {
  const colorClasses = {
    blue: "bg-blue-500 text-blue-100",
    green: "bg-green-500 text-green-100",
    red: "bg-red-500 text-red-100",
    yellow: "bg-yellow-500 text-yellow-100",
  };

  const bgClasses = {
    blue: "from-blue-50 to-blue-100",
    green: "from-green-50 to-green-100",
    red: "from-red-50 to-red-100",
    yellow: "from-yellow-50 to-yellow-100",
  };

  return (
    <div className={`bg-gradient-to-br ${bgClasses[color]} rounded-xl p-3 shadow-md border border-white/50`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        <div className={`${colorClasses[color]} p-2 rounded-lg shadow-sm`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
