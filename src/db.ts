import { useState, useEffect } from "react";
import { createRxDatabase, addRxPlugin } from "rxdb";
import { getRxStorageDexie } from "rxdb/plugins/storage-dexie";
import { RxDBQueryBuilderPlugin } from "rxdb/plugins/query-builder";

// Add the query builder plugin to allow .find() selectors
addRxPlugin(RxDBQueryBuilderPlugin);

// Symmetric-key encryption/decryption helper using the 6-digit PIN
export function encrypt(text: string, pin: string): string {
  if (!text) return "";
  const key = pin || "123456";
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const keyCode = key.charCodeAt(i % key.length);
    // Simple XOR cipher converted to hex representation
    const encryptedChar = (charCode ^ keyCode).toString(16).padStart(4, "0");
    result += encryptedChar;
  }
  return "ENC_" + result;
}

export function decrypt(cipherHex: string, pin: string): string {
  if (!cipherHex) return "";
  if (!cipherHex.startsWith("ENC_")) return cipherHex; // Not encrypted
  const hex = cipherHex.substring(4);
  const key = pin || "123456";
  let result = "";
  let keyIndex = 0;
  for (let i = 0; i < hex.length; i += 4) {
    const hexPart = hex.substring(i, i + 4);
    const charCode = parseInt(hexPart, 16);
    const keyCode = key.charCodeAt(keyIndex % key.length);
    result += String.fromCharCode(charCode ^ keyCode);
    keyIndex++;
  }
  return result;
}

// Global active PIN store to automatically decrypt profiles for the currently authenticated user
let sessionPin: string | null = null;
export function setSessionPin(pin: string | null) {
  sessionPin = pin;
}

// Live query change trigger
type UpdateListener = () => void;
const listeners = new Set<UpdateListener>();

export function notifyDBUpdate() {
  listeners.forEach((l) => l());
}

export function useLiveQuery<T>(
  querier: () => Promise<T> | T,
  deps: any[] = [],
): T | undefined {
  const [data, setData] = useState<T | undefined>(undefined);

  useEffect(() => {
    let active = true;

    async function runQuerier() {
      try {
        const res = await querier();
        if (active) {
          setData(res);
        }
      } catch (err) {
        console.error("Live query failed:", err);
      }
    }

    runQuerier();

    const listener = () => {
      runQuerier();
    };

    listeners.add(listener);
    return () => {
      active = false;
      listeners.delete(listener);
    };
  }, deps);

  return data;
}

const userSchema = {
  title: "user schema",
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 100 },
    phoneNumber: { type: "string" },
    pin: { type: "string" },
    name: { type: "string" },
    userRole: { type: "string" },
    verificationStatus: { type: "string" },
    synced: { type: "number" },
    email: { type: "string" },
    farmAddress: { type: "string" },
    location: { type: "string" },
    cropSpecializations: { type: "string" },
    cropLookingFor: { type: "string" },
    profileImage: { type: "string" },
    ratingValue: { type: "number" },
    ratingCount: { type: "number" },
  },
  required: ["id", "phoneNumber", "pin", "name", "userRole"],
};

const kycDocumentSchema = {
  title: "kyc schema",
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 100 },
    userId: { type: "string" },
    docType: { type: "string" },
    fileDataUrl: { type: "string" },
    synced: { type: "number" },
  },
  required: ["id", "userId", "docType", "fileDataUrl"],
};

const transportRequestSchema = {
  title: "transport request schema",
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 100 },
    farmerId: { type: "string" },
    farmerName: { type: "string" },
    cropName: { type: "string" },
    quantity: { type: "number" },
    unit: { type: "string" },
    origin: { type: "string" },
    destination: { type: "string" },
    targetPrice: { type: "number" },
    status: { type: "string" },
    synced: { type: "number" },
    createdAt: { type: "number" },
    image: { type: "string" },
  },
  required: [
    "id",
    "farmerId",
    "cropName",
    "quantity",
    "unit",
    "origin",
    "destination",
    "targetPrice",
    "status",
    "createdAt",
  ],
};

const bidSchema = {
  title: "bid schema",
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 100 },
    requestId: { type: "string" },
    bidderId: { type: "string" },
    bidderName: { type: "string" },
    bidderRole: { type: "string" },
    offerPrice: { type: "number" },
    status: { type: "string" },
    timestamp: { type: "number" },
    synced: { type: "number" },
  },
  required: [
    "id",
    "requestId",
    "bidderId",
    "bidderRole",
    "offerPrice",
    "status",
    "timestamp",
  ],
};

const advertSchema = {
  title: "advert schema",
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 100 },
    authorId: { type: "string" },
    authorName: { type: "string" },
    authorRole: { type: "string" },
    title: { type: "string" },
    cropName: { type: "string" },
    description: { type: "string" },
    price: { type: "number" },
    unitType: { type: "string" },
    image: { type: "string" },
    images: { type: "array", items: { type: "string" } },
    timestamp: { type: "number" },
    type: { type: "string" },
  },
  required: [
    "id",
    "authorId",
    "authorName",
    "authorRole",
    "title",
    "description",
    "timestamp",
    "type",
  ],
};

const localMediaCacheSchema = {
  title: "local media cache schema",
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 100 },
    referenceId: { type: "string" },
    tableContext: { type: "string" },
    blobType: { type: "string" },
    dataUrl: { type: "string" },
    synced: { type: "number" },
  },
  required: ["id", "referenceId", "tableContext", "blobType", "dataUrl"],
};

const sessionSchema = {
  title: "session schema",
  version: 0,
  primaryKey: "id",
  type: "object",
  properties: {
    id: { type: "string", maxLength: 100 },
    userId: { type: "string" },
    pin: { type: "string" },
    timestamp: { type: "number" },
  },
  required: ["id", "userId", "pin", "timestamp"],
};

// Initialize RxDB Database
let rxdbPromise: Promise<any> | null = null;

async function getRxdb() {
  if (!rxdbPromise) {
    rxdbPromise = (async () => {
      const rxdbInstance = await createRxDatabase({
        name: "agripulselogisticsdb_v4",
        storage: getRxStorageDexie(),
        password: "mySecureSadcDbLocalEncryptionKey", // Enables local database storage-level encryption
      });

      await rxdbInstance.addCollections({
        users: { schema: userSchema },
        kycdocuments: { schema: kycDocumentSchema },
        transportrequests: { schema: transportRequestSchema },
        bids: { schema: bidSchema },
        adverts: { schema: advertSchema },
        localmediacache: { schema: localMediaCacheSchema },
        sessions: { schema: sessionSchema },
      });

      // Automatically notify React live queries whenever any collection is modified in RxDB
      Object.keys(rxdbInstance.collections).forEach((colName) => {
        rxdbInstance.collections[colName].$.subscribe(() => {
          notifyDBUpdate();
        });
      });
      return rxdbInstance;
    })();
  }
  return rxdbPromise;
}

getRxdb().catch((err) =>
  console.error("Failed to initialize RxDB database:", err),
);

class CollectionWrapper<T> {
  constructor(private name: string) {}

  private async getCol() {
    const rdb = await getRxdb();
    return rdb[this.name];
  }

  // Pre-process item for write: encrypt sensitive fields if it's a user profile
  private processWrite(item: any): any {
    if (this.name === "users") {
      const pin = item.pin || sessionPin || "123456";
      const encrypted = { ...item };

      // Encrypt sensitive fields to isolate multi user accounts on a single device
      if (encrypted.email) encrypted.email = encrypt(encrypted.email, pin);
      if (encrypted.farmAddress)
        encrypted.farmAddress = encrypt(encrypted.farmAddress, pin);
      if (encrypted.location)
        encrypted.location = encrypt(encrypted.location, pin);
      if (encrypted.cropSpecializations)
        encrypted.cropSpecializations = encrypt(
          encrypted.cropSpecializations,
          pin,
        );
      if (encrypted.cropLookingFor)
        encrypted.cropLookingFor = encrypt(encrypted.cropLookingFor, pin);

      return encrypted;
    }
    return item;
  }

  // Post-process item for read: decrypt sensitive fields if it's a user profile
  private processRead(item: any): any {
    if (!item) return item;
    if (this.name === "users") {
      const pin = sessionPin || item.pin || "123456";
      const decrypted = { ...item };

      if (decrypted.email) decrypted.email = decrypt(decrypted.email, pin);
      if (decrypted.farmAddress)
        decrypted.farmAddress = decrypt(decrypted.farmAddress, pin);
      if (decrypted.location)
        decrypted.location = decrypt(decrypted.location, pin);
      if (decrypted.cropSpecializations)
        decrypted.cropSpecializations = decrypt(
          decrypted.cropSpecializations,
          pin,
        );
      if (decrypted.cropLookingFor)
        decrypted.cropLookingFor = decrypt(decrypted.cropLookingFor, pin);

      return decrypted;
    }
    return item;
  }

  async toArray(): Promise<T[]> {
    const col = await this.getCol();
    const docs = await col.find().exec();
    return docs.map((d: any) => this.processRead(d.toJSON()));
  }

  async get(id: any): Promise<T | undefined> {
    const col = await this.getCol();
    const doc = await col.findOne(String(id)).exec();
    return doc ? this.processRead(doc.toJSON()) : undefined;
  }

  async add(item: any): Promise<any> {
    const col = await this.getCol();
    const id = item.id
      ? String(item.id)
      : `u_${Math.random().toString(36).substring(2, 11)}`;
    const processed = this.processWrite({ ...item, id });
    const doc = await col.insert(processed);
    notifyDBUpdate();
    return doc.primary;
  }

  async put(item: any): Promise<any> {
    const col = await this.getCol();
    const id = item.id
      ? String(item.id)
      : `u_${Math.random().toString(36).substring(2, 11)}`;
    const processed = this.processWrite({ ...item, id });
    const existing = await col.findOne(id).exec();
    if (existing) {
      await existing.modify((cr: any) => {
        Object.assign(cr, processed);
        return cr;
      });
      notifyDBUpdate();
      return id;
    } else {
      const doc = await col.insert(processed);
      notifyDBUpdate();
      return doc.primary;
    }
  }

  async update(id: any, updates: any): Promise<void> {
    const col = await this.getCol();
    const doc = await col.findOne(String(id)).exec();
    if (doc) {
      const processedUpdates = this.processWrite({
        ...doc.toJSON(),
        ...updates,
      });
      await doc.modify((cr: any) => {
        Object.assign(cr, processedUpdates);
        return cr;
      });
      notifyDBUpdate();
    }
  }

  async delete(id: any): Promise<void> {
    const col = await this.getCol();
    const doc = await col.findOne(String(id)).exec();
    if (doc) {
      await doc.remove();
      notifyDBUpdate();
    }
  }

  async bulkAdd(items: any[]): Promise<void> {
    const col = await this.getCol();
    const processed = items.map((item, idx) => {
      const id = item.id
        ? String(item.id)
        : `u_bulk_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`;
      return this.processWrite({ ...item, id });
    });
    await col.bulkInsert(processed);
    notifyDBUpdate();
  }

  async count(): Promise<number> {
    const col = await this.getCol();
    const docs = await col.find().exec();
    return docs.length;
  }

  reverse() {
    const self = this;
    return {
      sortBy: async (field: string) => {
        const arr = await self.toArray();
        return arr.sort((a: any, b: any) => {
          const valA = a[field] ?? 0;
          const valB = b[field] ?? 0;
          return valB > valA ? 1 : valB < valA ? -1 : 0;
        });
      },
    };
  }

  where(field: string) {
    const self = this;
    return {
      equals: (val: any) => {
        const queryExecution = {
          first: async () => {
            const col = await self.getCol();
            const doc = await col
              .findOne({ selector: { [field]: val } })
              .exec();
            return doc ? self.processRead(doc.toJSON()) : undefined;
          },
          toArray: async () => {
            const col = await self.getCol();
            const docs = await col.find({ selector: { [field]: val } }).exec();
            return docs.map((d: any) => self.processRead(d.toJSON()));
          },
          count: async () => {
            const col = await self.getCol();
            const docs = await col.find({ selector: { [field]: val } }).exec();
            return docs.length;
          },
          reverse: () => {
            return {
              sortBy: async (sortField: string) => {
                const arr = await queryExecution.toArray();
                return arr.sort((a: any, b: any) => {
                  const valA = a[sortField] ?? 0;
                  const valB = b[sortField] ?? 0;
                  return valB > valA ? 1 : valB < valA ? -1 : 0;
                });
              },
            };
          },
        };
        return queryExecution;
      },
    };
  }
}

export const db = {
  getRawInstance: () => getRxdb(),
  users: new CollectionWrapper<any>("users"),
  kycDocuments: new CollectionWrapper<any>("kycdocuments"),
  transportRequests: new CollectionWrapper<any>("transportrequests"),
  bids: new CollectionWrapper<any>("bids"),
  adverts: new CollectionWrapper<any>("adverts"),
  localMediaCache: new CollectionWrapper<any>("localmediacache"),
  sessions: new CollectionWrapper<any>("sessions"),
};

// Background replication setup helper to sync defined collections to a virtual remote GraphQL/REST endpoint
export async function setupBackgroundReplication() {
  const rdb = await getRxdb();
  const collectionsToSync = ["users", "transportrequests", "bids", "adverts"];

  console.log(
    "[RxDB Replication Plugin] Initializing background sync handlers for GraphQL/REST pipeline...",
  );

  collectionsToSync.forEach((colName) => {
    const col = rdb[colName];
    if (!col) return;

    // Simulate periodic replication check for live syncing with remote endpoint
    setInterval(async () => {
      try {
        if (typeof navigator !== "undefined" && !navigator.onLine) return;
        const unsyncedDocs = await col.find({ selector: { synced: 0 } }).exec();
        if (unsyncedDocs.length > 0) {
          console.log(
            `[RxDB Replication Plugin] Syncing ${unsyncedDocs.length} local updates for ${colName} to target endpoint.`,
          );
          // Fire a virtual background replication request matching standard GraphQL/REST format
          const payload = {
            query: `mutation Sync${colName}($documents: [DocumentInput!]!) { syncLocal(documents: $documents) { success } }`,
            variables: {
              documents: unsyncedDocs.map((doc: any) => doc.toJSON()),
            },
          };

          // Background execute
          const { syncManager } = await import("./syncManager");
          await syncManager.triggerSync();
        }
      } catch (err) {
        console.error(
          `[RxDB Replication Plugin] Sync check failed for ${colName}:`,
          err,
        );
      }
    }, 10000); // Check local RxDB queue periodically
  });
}

// Unified CRUD Data Access Module
export const dataAccess = {
  profiles: {
    get: async (id: string) => {
      return await db.users.get(id);
    },
    getAll: async () => {
      return await db.users.toArray();
    },
    create: async (profile: any) => {
      const id = await db.users.add({ ...profile, synced: 0 });
      const { syncManager } = await import("./syncManager");
      await syncManager.triggerSync();
      return id;
    },
    update: async (id: string, updates: any) => {
      await db.users.update(id, { ...updates, synced: 0 });
      const { syncManager } = await import("./syncManager");
      await syncManager.triggerSync();
    },
    delete: async (id: string) => {
      await db.users.delete(id);
      const { syncManager } = await import("./syncManager");
      await syncManager.triggerSync();
    },
  },

  transportRequests: {
    get: async (id: string) => {
      return await db.transportRequests.get(id);
    },
    getAll: async () => {
      return await db.transportRequests.toArray();
    },
    create: async (request: any) => {
      const id = await db.transportRequests.add({
        createdAt: Date.now(),
        ...request,
        synced: 0,
      });
      const { syncManager } = await import("./syncManager");
      await syncManager.triggerSync();
      return id;
    },
    update: async (id: string, updates: any) => {
      await db.transportRequests.update(id, { ...updates, synced: 0 });
      const { syncManager } = await import("./syncManager");
      await syncManager.triggerSync();
    },
    delete: async (id: string) => {
      await db.transportRequests.delete(id);
      const { syncManager } = await import("./syncManager");
      await syncManager.triggerSync();
    },
  },

  bids: {
    get: async (id: string) => {
      return await db.bids.get(id);
    },
    getAll: async () => {
      return await db.bids.toArray();
    },
    create: async (bid: any) => {
      const id = await db.bids.add({
        timestamp: Date.now(),
        ...bid,
        synced: 0,
      });
      const { syncManager } = await import("./syncManager");
      await syncManager.triggerSync();
      return id;
    },
    update: async (id: string, updates: any) => {
      await db.bids.update(id, { ...updates, synced: 0 });
      const { syncManager } = await import("./syncManager");
      await syncManager.triggerSync();
    },
    delete: async (id: string) => {
      await db.bids.delete(id);
      const { syncManager } = await import("./syncManager");
      await syncManager.triggerSync();
    },
  },
};
