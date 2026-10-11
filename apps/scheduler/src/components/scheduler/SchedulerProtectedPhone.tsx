"use client";

import { EyeOff } from "lucide-react";

export function SchedulerProtectedPhone({
  canView,
  phone,
  fallback = "Sin teléfono",
  className = "",
}: {
  canView: boolean;
  phone: string | null | undefined;
  fallback?: string;
  className?: string;
}) {
  if (!phone) return <>{fallback}</>;
  if (canView) return <>{phone}</>;

  return (
    <span
      aria-label="Teléfono confidencial"
      className={`inline-flex items-center gap-1.5 ${className}`.trim()}
      title="Teléfono confidencial"
    >
      <EyeOff aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span>Teléfono confidencial</span>
    </span>
  );
}
