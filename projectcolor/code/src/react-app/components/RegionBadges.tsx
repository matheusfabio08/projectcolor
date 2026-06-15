import { MapPin } from "lucide-react";

interface RegionBadgesProps {
  op: {
    region_jaragua?: number;
    region_brusque?: number;
    region_gaspar?: number;
  };
  className?: string;
}

export function RegionBadges({ op, className = "" }: RegionBadgesProps) {
  const regions = [];
  if (op.region_jaragua === 1) regions.push("Jaraguá");
  if (op.region_brusque === 1) regions.push("Brusque");
  if (op.region_gaspar === 1) regions.push("Gaspar");
  
  if (regions.length === 0) return null;
  
  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {regions.map((region) => (
        <span
          key={region}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded"
        >
          <MapPin className="w-3 h-3" />
          {region}
        </span>
      ))}
    </div>
  );
}
