import Dexie, { Table } from 'dexie';
import "fake-indexeddb/auto";

class MyDb extends Dexie {
  users!: Table<any, string>;
  constructor() {
    super('mydb6');
    this.version(1).stores({ users: 'id' });
    const TableProto = (this as any).Table.prototype;
    TableProto.mycustom = () => 'works!';
  }
}

async function test() {
  const db = new MyDb();
  await db.open();
  console.log((db.users as any).mycustom());
}
test().catch(console.error);
