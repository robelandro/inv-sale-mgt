"use client";

import * as React from "react";
import { useSyncStore } from "@/lib/store/sync-store";
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, RefreshCw, CheckCircle2, CloudUpload } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function SyncStatusBadge() {
  const isOnline = useSyncStore((s) => s.isOnline);
  const pendingCount = useSyncStore((s) => s.pendingCount);
  const isSyncing = useSyncStore((s) => s.isSyncing);
  const syncPendingSales = useSyncStore((s) => s.syncPendingSales);

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1.5">
        {/* Offline / Online indicator */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                !isOnline
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                  : pendingCount > 0
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              }`}
            >
              {!isOnline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Offline (IndexedDB)</span>
                </>
              ) : isSyncing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">Syncing...</span>
                </>
              ) : pendingCount > 0 ? (
                <>
                  <CloudUpload className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{pendingCount} Pending Sync</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Online</span>
                </>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {!isOnline
              ? "Operating offline. Transactions are stored safely in local IndexedDB."
              : pendingCount > 0
              ? `${pendingCount} offline transaction(s) pending sync to server.`
              : "System online. Real-time synchronization active."}
          </TooltipContent>
        </Tooltip>

        {/* Sync Now button if pending items exist */}
        {pendingCount > 0 && isOnline && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => syncPendingSales()}
            disabled={isSyncing}
            className="h-7 text-xs px-2 gap-1 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
            Sync Now ({pendingCount})
          </Button>
        )}
      </div>
    </TooltipProvider>
  );
}
