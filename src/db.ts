import { createRxDatabase, addRxPlugin } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

// Remove the DB6 error by updating the version
// The user had a problem because we added "status" to the advert schema without bumping version
const advertSchema = {
  title: "advert schema",
  version: 1, // BUMPED TO 1 TO FIX RxDB SCHEMA ERROR
  primaryKey: "id",
  type: "object",
  properties: {
    id: {
      type: "string",
      maxLength: 100
    },
    authorId: {
      type: "string"
    },
    authorName: {
      type: "string"
    },
    authorRole: {
      type: "string"
    },
    title: {
      type: "string"
    },
    cropName: {
      type: "string"
    },
    description: {
      type: "string"
    },
    price: {
      type: "number"
    },
    unitType: {
      type: "string"
    },
    image: {
      type: "string"
    },
    images: {
      type: "array",
      items: {
        type: "string"
      }
    },
    timestamp: {
      type: "number"
    },
    type: {
      type: "string"
    },
    status: {
      type: "string"
    }
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
    "status" // Added status as required
  ]
};

let dbPromise: any = null;

export const initDB = async () => {
    if(!dbPromise) {
        dbPromise = createRxDatabase({
            name: 'agripulselogisticsdb_v5', // renamed db
            storage: getRxStorageDexie()
        }).then(db => {
            return db.addCollections({
                adverts: {
                    schema: advertSchema
                }
            }).then(() => db);
        });
    }
    return dbPromise;
}
