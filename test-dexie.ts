import Dexie, { Table } from 'dexie';

class MyDb extends Dexie {
  users!: Table<any, string>;
  constructor() {
    super('mydb');
    this.version(1).stores({ users: 'id' });
  }
}

const db = new MyDb();
db.users.find = () => ({ $: { subscribe: () => {} } });

console.log(db.users.find().$);
