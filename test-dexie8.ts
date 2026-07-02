import Dexie from 'dexie';
const db = new Dexie('mydb8');
try {
  db.on('changes', () => {});
  console.log('works!');
} catch (e) {
  console.log('error:', e.message);
}
