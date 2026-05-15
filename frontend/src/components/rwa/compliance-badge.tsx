"use client";

import { motion } from "framer-motion";
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Shield,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ComplianceBadgeProps {
  status: "compliant" | "pending" | "non-compliant" | "under-review";
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
  animated?: boolean;
}

export function ComplianceBadge({
  status,
  showIcon = true,
  size = "md",
  animated = true,
}: ComplianceBadgeProps) {
  const statusConfig = {
    compliant: {
      icon: CheckCircle,
      text: "Compliant",
      className:
        "bg-gradient-to-br from-emerald-500/15 to-emerald-600/15 text-emerald-700 border-2 border-emerald-300 shadow-[0_2px_8px_rgba(16,185,129,0.15)]",
      iconClassName: "text-emerald-600",
    },
    pending: {
      icon: Clock,
      text: "Pending Review",
      className:
        "bg-gradient-to-br from-amber-500/15 to-amber-600/15 text-amber-700 border-2 border-amber-300 shadow-[0_2px_8px_rgba(245,158,11,0.15)]",
      iconClassName: "text-amber-600",
    },
    "non-compliant": {
      icon: XCircle,
      text: "Non-Compliant",
      className:
        "bg-gradient-to-br from-red-500/15 to-red-600/15 text-red-700 border-2 border-red-300 shadow-[0_2px_8px_rgba(220,38,38,0.15)]",
      iconClassName: "text-red-600",
    },
    "under-review": {
      icon: AlertTriangle,
      text: "Under Review",
      className:
        "bg-gradient-to-br from-blue-500/15 to-blue-600/15 text-blue-700 border-2 border-blue-300 shadow-[0_2px_8px_rgba(37,99,235,0.15)]",
      iconClassName: "text-blue-600",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base",
  };

  return (
    <motion.div
      whileHover={{ scale: animated ? 1.05 : 1 }}
      whileTap={{ scale: animated ? 0.95 : 1 }}
      initial={animated ? { opacity: 0, scale: 0.9 } : false}
      animate={animated ? { opacity: 1, scale: 1 } : false}
      transition={{ duration: 0.2 }}
    >
      <Badge
        variant="outline"
        className={cn(
          "inline-flex items-center gap-1.5 font-medium",
          config.className,
          sizeClasses[size]
        )}
      >
        {showIcon && (
          <motion.div
            animate={status === "pending" ? { rotate: [0, 360] } : {}}
            transition={
              status === "pending"
                ? { duration: 2, repeat: Infinity, ease: "linear" }
                : {}
            }
          >
            <Icon className={cn("h-3.5 w-3.5", config.iconClassName)} />
          </motion.div>
        )}
        <span>{config.text}</span>
        {status === "compliant" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Shield className="h-3 w-3 ml-0.5" />
          </motion.div>
        )}
      </Badge>
    </motion.div>
  );
}

// Additional component for compliance status with details
interface ComplianceStatusProps extends ComplianceBadgeProps {
  lastChecked?: Date;
  checkedBy?: string;
  requirements?: string[];
}

export function ComplianceStatus({
  status,
  lastChecked,
  checkedBy,
  requirements = [],
  ...badgeProps
}: ComplianceStatusProps) {
  return (
    <div className="space-y-2">
      <ComplianceBadge status={status} {...badgeProps} />

      {(lastChecked || checkedBy || requirements.length > 0) && (
        <div className="space-y-1 text-xs text-muted-foreground">
          {lastChecked && (
            <p>Last checked: {new Date(lastChecked).toLocaleDateString()}</p>
          )}
          {checkedBy && <p>Checked by: {checkedBy}</p>}
          {requirements.length > 0 && (
            <div>
              <p className="font-medium mb-1">Requirements:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {requirements.map((req, index) => (
                  <li key={index}>{req}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
