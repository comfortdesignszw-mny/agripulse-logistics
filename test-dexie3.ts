import Dexie, { Table } from 'dexie';

class MyDb extends Dexie {
  users!: Table<any, string>;
  constructor() {
    super('mydb2');
    this.version(1).stores({ users: 'id' });
  }
}

const db = new MyDb();
(db.users as any).mycustom = 'yes';
console.log((db.users as any).mycustom); // yes?
