import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export interface OfflineSaleItem {
  productId: string;
  qty: number;
  unitPrice: number;
  discount: number;
  name?: string;
  sku?: string;
}

export interface OfflineSalePayload {
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  items: OfflineSaleItem[];
  discountTotal: number;
  amountPaid: number;
  paymentMethod: "cash" | "card" | "bank_transfer" | "mobile_money" | "other";
  dueDate?: string | null;
  notes?: string | null;
}

export interface OfflineQueueRecord {
  id: string; // client UUID or temp ID
  clientTempInvoiceNo: string;
  payload: OfflineSalePayload;
  total: number;
  createdAt: string;
  status: "pending" | "syncing" | "failed" | "synced";
  retryCount: number;
  lastError?: string | null;
  syncedSaleId?: string;
}

export interface CachedProduct {
  id: string;
  name: string;
  sku: string;
  barcode?: string | null;
  stockQty: number;
  sellingPrice: number;
  costPrice?: number;
  categoryId?: string | null;
  unitName?: string | null;
  isActive: boolean;
}

export interface CachedCustomer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  balance: number;
  creditLimit?: number | null;
  isWalkIn?: boolean;
}

interface PosOfflineDB extends DBSchema {
  products: {
    key: string;
    value: CachedProduct;
    indexes: { "by-sku": string; "by-barcode": string };
  };
  customers: {
    key: string;
    value: CachedCustomer;
    indexes: { "by-name": string; "by-phone": string };
  };
  sync_queue: {
    key: string;
    value: OfflineQueueRecord;
    indexes: { "by-status": string; "by-createdAt": string };
  };
  meta: {
    key: string;
    value: { key: string; value: any; updatedAt: string };
  };
}

const DB_NAME = "pos_offline_storage";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<PosOfflineDB>> | null = null;

export function getOfflineDB(): Promise<IDBPDatabase<PosOfflineDB>> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB is only available in browser environment"));
  }

  if (!dbPromise) {
    dbPromise = openDB<PosOfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Products store
        if (!db.objectStoreNames.contains("products")) {
          const productStore = db.createObjectStore("products", { keyPath: "id" });
          productStore.createIndex("by-sku", "sku", { unique: false });
          productStore.createIndex("by-barcode", "barcode", { unique: false });
        }

        // Customers store
        if (!db.objectStoreNames.contains("customers")) {
          const customerStore = db.createObjectStore("customers", { keyPath: "id" });
          customerStore.createIndex("by-name", "name", { unique: false });
          customerStore.createIndex("by-phone", "phone", { unique: false });
        }

        // Offline sales sync queue
        if (!db.objectStoreNames.contains("sync_queue")) {
          const queueStore = db.createObjectStore("sync_queue", { keyPath: "id" });
          queueStore.createIndex("by-status", "status", { unique: false });
          queueStore.createIndex("by-createdAt", "createdAt", { unique: false });
        }

        // Meta store
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" });
        }
      },
    });
  }

  return dbPromise;
}

/** Cache products into IndexedDB for offline access */
export async function cacheProducts(items: any[]): Promise<void> {
  try {
    const db = await getOfflineDB();
    const tx = db.transaction("products", "readwrite");
    const store = tx.objectStore("products");

    for (const p of items) {
      await store.put({
        id: p.id,
        name: p.name,
        sku: p.sku || "",
        barcode: p.barcode || null,
        stockQty: Number(p.stockQty || 0),
        sellingPrice: Number(p.sellingPrice || 0),
        costPrice: Number(p.costPrice || 0),
        categoryId: p.categoryId || null,
        unitName: p.unitName || null,
        isActive: p.isActive ?? true,
      });
    }

    await tx.done;
  } catch (err) {
    console.error("Failed to cache products in IndexedDB:", err);
  }
}

/** Retrieve all cached products from IndexedDB */
export async function getCachedProducts(): Promise<CachedProduct[]> {
  try {
    const db = await getOfflineDB();
    return await db.getAll("products");
  } catch (err) {
    console.error("Failed to read cached products from IndexedDB:", err);
    return [];
  }
}

/** Cache customers into IndexedDB */
export async function cacheCustomers(items: any[]): Promise<void> {
  try {
    const db = await getOfflineDB();
    const tx = db.transaction("customers", "readwrite");
    const store = tx.objectStore("customers");

    for (const c of items) {
      await store.put({
        id: c.id,
        name: c.name,
        phone: c.phone || null,
        email: c.email || null,
        balance: Number(c.balance || 0),
        creditLimit: c.creditLimit ? Number(c.creditLimit) : null,
        isWalkIn: Boolean(c.isWalkIn),
      });
    }

    await tx.done;
  } catch (err) {
    console.error("Failed to cache customers in IndexedDB:", err);
  }
}

/** Retrieve all cached customers from IndexedDB */
export async function getCachedCustomers(): Promise<CachedCustomer[]> {
  try {
    const db = await getOfflineDB();
    return await db.getAll("customers");
  } catch (err) {
    console.error("Failed to read cached customers from IndexedDB:", err);
    return [];
  }
}

/**
 * Queue an offline sale in IndexedDB.
 * Automatically deducts local product stock so subsequent offline checkouts have accurate inventory.
 */
export async function queueOfflineSale(payload: OfflineSalePayload, totalAmount: number): Promise<OfflineQueueRecord> {
  const db = await getOfflineDB();
  const tempId = `offline_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const tempInvoice = `OFFLINE-${Date.now().toString().slice(-6)}`;

  const record: OfflineQueueRecord = {
    id: tempId,
    clientTempInvoiceNo: tempInvoice,
    payload,
    total: totalAmount,
    createdAt: new Date().toISOString(),
    status: "pending",
    retryCount: 0,
    lastError: null,
  };

  const tx = db.transaction(["sync_queue", "products"], "readwrite");
  const queueStore = tx.objectStore("sync_queue");
  const productStore = tx.objectStore("products");

  // Save to queue
  await queueStore.put(record);

  // Deduct local stock for each item in the sale
  for (const item of payload.items) {
    const existing = await productStore.get(item.productId);
    if (existing) {
      existing.stockQty = Math.max(0, existing.stockQty - item.qty);
      await productStore.put(existing);
    }
  }

  await tx.done;
  return record;
}

/** Get all pending or failed sales waiting to be synchronized */
export async function getPendingOfflineSales(): Promise<OfflineQueueRecord[]> {
  try {
    const db = await getOfflineDB();
    const all = await db.getAll("sync_queue");
    return all.filter((r) => r.status === "pending" || r.status === "failed");
  } catch (err) {
    console.error("Failed to get pending offline sales:", err);
    return [];
  }
}

/** Get total count of pending sync items */
export async function getPendingSyncCount(): Promise<number> {
  try {
    const items = await getPendingOfflineSales();
    return items.length;
  } catch {
    return 0;
  }
}

/** Update the status of an offline queue item */
export async function updateOfflineSaleStatus(
  id: string,
  status: OfflineQueueRecord["status"],
  error?: string | null,
  syncedSaleId?: string
): Promise<void> {
  try {
    const db = await getOfflineDB();
    const tx = db.transaction("sync_queue", "readwrite");
    const store = tx.objectStore("sync_queue");
    const existing = await store.get(id);

    if (existing) {
      existing.status = status;
      if (error !== undefined) existing.lastError = error;
      if (syncedSaleId) existing.syncedSaleId = syncedSaleId;
      if (status === "failed") existing.retryCount = (existing.retryCount || 0) + 1;
      await store.put(existing);
    }

    await tx.done;
  } catch (err) {
    console.error(`Failed to update offline sale status for ${id}:`, err);
  }
}

/** Remove a successfully synced sale from the queue */
export async function removeOfflineSale(id: string): Promise<void> {
  try {
    const db = await getOfflineDB();
    await db.delete("sync_queue", id);
  } catch (err) {
    console.error(`Failed to delete offline sale ${id}:`, err);
  }
}
