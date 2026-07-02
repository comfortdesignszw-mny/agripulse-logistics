import Dexie, { Table } from 'dexie';

// We are replacing RxDB with a Dexie-based implementation, 
// to act as the local offline Realm MongoDB sync fallback for the web.

export interface User {
  id: string;
  role: string;
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  avatar?: string;
  cropSpecializations?: string;
  cropLookingFor?: string;
  farmAddress?: string;
  agreedContacts?: string[];
}

export interface Advert {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  title: string;
  cropName?: string;
  description: string;
  price?: number;
  unitType?: string;
  image?: string;
  images?: string[];
  timestamp: number;
  type: string;
  status: string;
}

export interface Bid {
  id: string;
  advertId: string;
  advertTitle?: string;
  bidderId: string;
  bidderName: string;
  bidderRole: string;
  amount: number;
  status: string;
  timestamp: number;
}

export interface NotificationDoc {
  id: string;
  userId: string;
  title: string;
  message?: string;
  type: string;
  status: string;
  timestamp: number;
  relatedId?: string;
}

class RealmDBFallback extends Dexie {
  users!: Table<User, string>;
  adverts!: Table<Advert, string>;
  bids!: Table<Bid, string>;
  notifications!: Table<NotificationDoc, string>;

  constructor() {
    super('realm_mongodb_fallback_db');
    this.version(1).stores({
      users: 'id, role, name',
      adverts: 'id, authorId, type, status, timestamp',
      bids: 'id, advertId, bidderId, status, timestamp',
      notifications: 'id, userId, type, status, timestamp'
    });
  }
}

let dbPromise: any = null;

export const initDB = async (): Promise<any> => {
  if (!dbPromise) {
    dbPromise = new RealmDBFallback();
    // Wrap standard dexie methods to look like the ones App.tsx uses (like rxdb upsert)
    // Dexie's `put` acts like `upsert`.
    
    // Force DB to open so tables are instantiated before we patch them
    await dbPromise.open();
    
    // Custom reactivity system for our RxDB wrapper
    const changeListeners: Set<() => void> = new Set();
    const notifyListeners = () => {
      changeListeners.forEach(fn => fn());
    };

    const patchTable = (table: any) => {
       table.upsert = async (doc: any) => {
         const res = await table.put(doc);
         notifyListeners();
         return res;
       };
       table.insert = async (doc: any) => {
         const res = await table.add(doc);
         notifyListeners();
         return res;
       };
       table.findOne = (id: string) => {
         return {
           exec: async () => {
             const result = await table.get(id);
             if (result) {
               result.toJSON = () => result;
               result.patch = async (patchObj: any) => {
                 const updated = { ...result, ...patchObj };
                 delete updated.toJSON;
                 delete updated.patch;
                 await table.put(updated);
                 notifyListeners();
                 return updated;
               };
             }
             return result;
           }
         }
       };
       const origFind = table.find;
       table.find = () => {
         // Create a fake $.subscribe
         return {
           $: {
             subscribe: (callback: (data: any[]) => void) => {
               // Initial load
               table.toArray().then((results: any[]) => {
                 callback(results.map((r: any) => ({ ...r, toJSON: () => r })));
               });
               
               // Hook into Dexie mutations to notify subscribers
               // This is a naive reactivity simulation for standard App.tsx behavior
               const listener = () => {
                 table.toArray().then((results: any[]) => {
                   callback(results.map((r: any) => ({ ...r, toJSON: () => r })));
                 });
               };
               changeListeners.add(listener);
               
               return { unsubscribe: () => changeListeners.delete(listener) };
             }
           }
         };
       };
    };

    patchTable(dbPromise.users);
    patchTable(dbPromise.adverts);
    patchTable(dbPromise.bids);
    patchTable(dbPromise.notifications);
  }
  return dbPromise;
};
