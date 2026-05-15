"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useWallet } from "@/hooks/use-wallet";
import { ROLE_WALLETS } from "@/lib/zigchain-config";
import { apiFetch } from "@/lib/backend";

type ActivityLog = {
  id: string;
  actionType: string;
  actorUserId?: string | null;
  actorWallet?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  assetId?: string | null;
  oldValue?: unknown | null;
  newValue?: unknown | null;
  reason?: string | null;
  txHash?: string | null;
  createdAt: string;
};

export default function ActivityLogsPage() {
  const { address } = useWallet();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwner =
    !!address &&
    address.toLowerCase() === ROLE_WALLETS.platformOwner.toLowerCase();

  useEffect(() => {
    if (!isOwner) return;

    let cancelled = false;
    const loadLogs = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<ActivityLog[]>("/activity-logs?limit=100");
        if (!cancelled) {
          setLogs(data);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Failed to load activity logs");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadLogs();
    return () => {
      cancelled = true;
    };
  }, [isOwner]);

  if (!isOwner) {
    return (
      <div className="space-y-6 p-8 glass-panel rounded-[22px]">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold text-red-800">
              Access Restricted
            </h2>
            <p className="text-sm text-red-700 mt-1">
              Activity logs are available only to the platform owner.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8 glass-panel rounded-[22px]">
      <Card className="border border-slate-200/70 bg-white/80 shadow-sm">
        <CardHeader>
          <CardTitle>Activity Logs</CardTitle>
          <CardDescription>
            Compliance and identity actions for audit and regulatory review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-slate-500">Loading logs...</div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : logs.length === 0 ? (
            <div className="text-sm text-slate-500">
              No activity logs recorded yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {log.actionType}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.actorWallet || log.actorUserId || "system"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.reason || "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
