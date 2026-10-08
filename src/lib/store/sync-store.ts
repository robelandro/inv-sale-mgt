import { create } from "zustand";
import {
  getPendingOfflineSales,
  getPendingSyncCount,
  removeOfflineSale,
  updateOfflineSaleStatus,
  type OfflineQueueRecord,
} from "@/lib/offline/db";
import { syncOfflineSalesBatchAction } from "@/app/actions/sync.actions";
import { toast } from "sonner";

interface SyncState {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncAt: Date | null;
  lastError: string | null;

  setOnline: (status: boolean) => void;
  refreshPendingCount: () => Promise<number>;
  syncPendingSales: () => Promise<{ synced: number; failed: number }>;
  initSyncEngine: () => () => void;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  pendingCount: 0,
  isSyncing: false,
  lastSyncAt: null,
  lastError: null,

  setOnline: (status: boolean) => {
    set({ isOnline: status });
    if (status) {
      // Auto-trigger sync when connectivity is restored
      get().syncPendingSales();
    }
  },

  refreshPendingCount: async () => {
    if (typeof window === "undefined") return 0;
    try {
      const count = await getPendingSyncCount();
      set({ pendingCount: count });
      return count;
    } catch {
      return 0;
    }
  },

  syncPendingSales: async () => {
    if (typeof window === "undefined" || get().isSyncing) {
      return { synced: 0, failed: 0 };
    }

    if (!navigator.onLine) {
      toast.info("Still offline. Sales remain safely stored in IndexedDB.", { id: "offline-notice" });
      return { synced: 0, failed: 0 };
    }

    set({ isSyncing: true, lastError: null });

    try {
      const pendingSales = await getPendingOfflineSales();
      if (pendingSales.length === 0) {
        set({ isSyncing: false, pendingCount: 0 });
        return { synced: 0, failed: 0 };
      }

      toast.loading(`Syncing ${pendingSales.length} offline sale${pendingSales.length > 1 ? "s" : ""} to server...`, {
        id: "syncing-toast",
      });

      const batchPayload = pendingSales.map((item) => ({
        clientOfflineId: item.id,
        payload: item.payload,
      }));

      const res = await syncOfflineSalesBatchAction(batchPayload);

      let syncedCount = 0;
      let failedCount = 0;

      if (res.success && res.results) {
        for (const r of res.results) {
          if (r.success) {
            syncedCount++;
            await removeOfflineSale(r.clientOfflineId);
          } else {
            failedCount++;
            await updateOfflineSaleStatus(r.clientOfflineId, "failed", r.error);
          }
        }
      }

      const remaining = await get().refreshPendingCount();
      const now = new Date();

      set({
        isSyncing: false,
        pendingCount: remaining,
        lastSyncAt: now,
      });

      if (syncedCount > 0) {
        toast.success(
          `Successfully synced ${syncedCount} offline sale${syncedCount > 1 ? "s" : ""} to server!`,
          { id: "syncing-toast" }
        );
      } else if (failedCount > 0) {
        toast.error(`Sync encountered issues for ${failedCount} offline sale(s). Will retry when online.`, {
          id: "syncing-toast",
        });
      } else {
        toast.dismiss("syncing-toast");
      }

      return { synced: syncedCount, failed: failedCount };
    } catch (err: any) {
      console.error("Auto-sync error:", err);
      set({ isSyncing: false, lastError: err.message });
      toast.error("Auto-sync failed. Offline data remains secure locally.", { id: "syncing-toast" });
      return { synced: 0, failed: 0 };
    }
  },

  initSyncEngine: () => {
    if (typeof window === "undefined") return () => {};

    // Initial check
    get().refreshPendingCount();

    const handleOnline = () => {
      get().setOnline(true);
    };

    const handleOffline = () => {
      get().setOnline(false);
      toast.warning("You are currently offline. POS is operating in IndexedDB offline mode.", {
        duration: 5000,
        id: "offline-alert",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Periodic sync poll every 30 seconds if online and there are pending items
    const interval = setInterval(() => {
      if (navigator.onLine && get().pendingCount > 0 && !get().isSyncing) {
        get().syncPendingSales();
      }
    }, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  },
}));
