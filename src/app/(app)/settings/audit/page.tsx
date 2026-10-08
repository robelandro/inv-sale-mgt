import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getAuditLogs } from "@/services/audit.service";
import { formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";
import { getServerTranslations } from "@/lib/i18n/server";

export default async function AuditPage() {
  await requirePermission(PERMISSIONS.AUDIT_VIEW);
  const [logs, { t }] = await Promise.all([
    getAuditLogs(200),
    getServerTranslations(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t.audit.title}</h1>
        <p className="text-sm text-muted-foreground">
          {t.audit.subtitle}
        </p>
      </div>

      <Card className="rounded-card border shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> {t.audit.recentRecords}
          </CardTitle>
          <CardDescription className="text-xs">
            {t.audit.showingLatest.replace("{{count}}", String(logs.length))}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b text-xs uppercase text-muted-foreground font-medium">
                <tr>
                  <th className="py-2.5 px-4 text-left font-medium">{t.audit.timestamp}</th>
                  <th className="py-2.5 px-4 text-left font-medium">{t.audit.operator}</th>
                  <th className="py-2.5 px-4 text-left font-medium">{t.audit.action}</th>
                  <th className="py-2.5 px-4 text-left font-medium">{t.audit.entity}</th>
                  <th className="py-2.5 px-4 text-left font-medium">{t.audit.details}</th>
                </tr>
              </thead>
              <tbody className="divide-y font-mono text-xs">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      {t.audit.noRecords}
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/20">
                      <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">
                        {formatDate(log.createdAt, "yyyy-MM-dd HH:mm:ss")}
                      </td>
                      <td className="py-2.5 px-4 font-sans font-medium text-foreground">
                        {log.userName || "System"}
                        {log.userEmail && (
                          <span className="block text-[11px] text-muted-foreground font-mono">
                            {log.userEmail}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="inline-block bg-muted px-2 py-0.5 rounded font-bold text-foreground">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground uppercase text-[11px]">
                        {log.entityType}
                      </td>
                      <td className="py-2.5 px-4 font-sans text-xs max-w-md truncate">
                        {log.details ? JSON.stringify(log.details) : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
