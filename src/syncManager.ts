import { db } from "./db";

export interface SyncLog {
  id: string;
  table: string;
  recordId: any;
  description: string;
  timestamp: number;
  status: "pending" | "success" | "failed";
}

type SyncCallback = (logs: SyncLog[], pendingCount: number) => void;

class SyncManager {
  private listeners = new Set<SyncCallback>();
  private logs: SyncLog[] = [];
  private isSyncing = false;
  private intervalId: any = null;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.triggerSync());
      // Start a baseline fast loop to check for pending local records frequently
      this.intervalId = setInterval(() => this.triggerSync(), 6000);
    }
  }

  public subscribe(cb: SyncCallback) {
    this.listeners.add(cb);
    cb(this.logs, this.getPendingCountInternal());
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    const pending = this.getPendingCountInternal();
    this.listeners.forEach((cb) => cb([...this.logs], pending));
  }

  public getPendingCountInternal(): number {
    return this.logs.filter((l) => l.status === "pending").length;
  }

  // Scans RxDB database for any documents with synced === 0.
  public async getPendingCount(): Promise<number> {
    try {
      const usersCount = await db.users.where("synced").equals(0).count();
      const kycCount = await db.kycDocuments.where("synced").equals(0).count();
      const transportCount = await db.transportRequests
        .where("synced")
        .equals(0)
        .count();
      const bidsCount = await db.bids.where("synced").equals(0).count();
      const mediaCount = await db.localMediaCache
        .where("synced")
        .equals(0)
        .count();

      return usersCount + kycCount + transportCount + bidsCount + mediaCount;
    } catch (err) {
      console.error("RxDB count failed", err);
      return 0;
    }
  }

  public async triggerSync() {
    if (this.isSyncing) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return; // Do not attempt when offline
    }

    this.isSyncing = true;

    try {
      // 1. Sync Users
      const unsyncedUsers = await db.users.where("synced").equals(0).toArray();
      for (const u of unsyncedUsers) {
        this.addLog(
          "users",
          u.id!,
          `Publishing user profile: ${u.name} (${u.userRole})`,
        );
        await new Promise((r) => setTimeout(r, 800)); // slow Zimbabwean SADC network simulation
        await db.users.update(u.id!, { synced: 1 });
        this.updateLogSuccess("users", u.id!);
      }

      // 2. Sync KYC Documents
      const unsyncedKYC = await db.kycDocuments
        .where("synced")
        .equals(0)
        .toArray();
      for (const k of unsyncedKYC) {
        this.addLog(
          "kycDocuments",
          k.id!,
          `Verifying KYC License: ${k.docType}`,
        );
        await new Promise((r) => setTimeout(r, 1000));
        await db.kycDocuments.update(k.id!, { synced: 1 });
        this.updateLogSuccess("kycDocuments", k.id!);
      }

      // 3. Sync Transport Requests
      const unsyncedReqs = await db.transportRequests
        .where("synced")
        .equals(0)
        .toArray();
      for (const r of unsyncedReqs) {
        this.addLog(
          "transportRequests",
          r.id!,
          `Broadcasting crop yield: ${r.quantity} ${r.unit} of ${r.cropName}`,
        );
        await new Promise((r) => setTimeout(r, 1200));
        await db.transportRequests.update(r.id!, { synced: 1 });
        this.updateLogSuccess("transportRequests", r.id!);
      }

      // 4. Sync Bids
      const unsyncedBids = await db.bids.where("synced").equals(0).toArray();
      for (const b of unsyncedBids) {
        const roleDesc =
          b.bidderRole === "Dealer"
            ? "Time-locked purchasing offer"
            : "Logistics transport bid";
        this.addLog("bids", b.id!, `${roleDesc} at $${b.offerPrice}`);
        await new Promise((r) => setTimeout(r, 900));
        await db.bids.update(b.id!, { synced: 1 });
        this.updateLogSuccess("bids", b.id!);
      }

      // 5. Sync Media Cache
      const unsyncedMedia = await db.localMediaCache
        .where("synced")
        .equals(0)
        .toArray();
      for (const m of unsyncedMedia) {
        this.addLog(
          "localMediaCache",
          m.id!,
          `Uploading compressed payload image for context: ${m.tableContext}`,
        );
        await new Promise((r) => setTimeout(r, 1500));
        await db.localMediaCache.update(m.id!, { synced: 1 });
        this.updateLogSuccess("localMediaCache", m.id!);
      }
    } catch (e) {
      console.error("Replication failed", e);
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }

  private addLog(table: string, recordId: any, description: string) {
    // Check if pending already exists to avoid duplication
    if (
      this.logs.some(
        (l) =>
          l.table === table &&
          l.recordId === recordId &&
          l.status === "pending",
      )
    )
      return;

    this.logs.unshift({
      id: `${table}-${recordId}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      table,
      recordId,
      description,
      timestamp: Date.now(),
      status: "pending",
    });
    // Keep logs size tidy
    if (this.logs.length > 30) {
      this.logs.pop();
    }
    this.notify();
  }

  private updateLogSuccess(table: string, recordId: any) {
    const log = this.logs.find(
      (l) =>
        l.table === table && l.recordId === recordId && l.status === "pending",
    );
    if (log) {
      log.status = "success";
      log.timestamp = Date.now();
    }
    this.notify();
  }
}

export const syncManager = new SyncManager();
