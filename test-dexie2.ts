import Dexie, { Table } from 'dexie';

class MyDb extends Dexie {
  users!: Table<any, string>;
  constructor() {
    super('mydb');
    this.version(1).stores({ users: 'id' });
  }
}

const db = new MyDb();
console.log(db.users);
