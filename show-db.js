const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

(async () => {
  const db = await open({ filename: path.join(__dirname, 'books.db'), driver: sqlite3.Database });
  
  console.log('=== SQLite DATABASE: books.db ===');
  console.log('Table: book\n');
  const books = await db.all('SELECT * FROM book ORDER BY id;');
  console.log('Total rows:', books.length);
  console.log('');
  console.log('ID | Title                  | Author                  | Price | Pages');
  console.log('---|------------------------|-------------------------|-------|------');
  books.forEach(b => {
    console.log(`${String(b.id).padEnd(3)}| ${b.title.substring(0,22).padEnd(22)} | ${b.author.substring(0,23).padEnd(23)} | ${String(b.price).padEnd(5)} | ${b.pages}`);
  });
  
  await db.close();
})();
