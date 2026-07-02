import Dexie, { Table } from 'dexie';

console.log(Dexie.Table);
console.log(Dexie.Table?.prototype);

class MyDb extends Dexie {
  constructor() {
    super('mydb');
    console.log(this.Table);
  }
}
new MyDb();
