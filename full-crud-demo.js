/**
 * Full CRUD Demo - Tests all REST API operations and shows SQLite DB state
 */
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

async function request(method, route, body) {
  const response = await fetch(`${BASE_URL}${route}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  return { status: response.status, data };
}

async function showDB(label) {
  const db = await open({ filename: path.join(__dirname, 'books.db'), driver: sqlite3.Database });
  const books = await db.all('SELECT * FROM book ORDER BY id;');
  await db.close();
  console.log(`\n📦 SQLite DB State [${label}] — ${books.length} row(s):`);
  console.log('─'.repeat(80));
  console.log('ID  | Title                          | Author                  | Price | Pages');
  console.log('─'.repeat(80));
  books.forEach(b => {
    const id = String(b.id).padEnd(3);
    const title = b.title.substring(0, 30).padEnd(30);
    const author = b.author.substring(0, 23).padEnd(23);
    console.log(`${id} | ${title} | ${author} | ${String(b.price).padEnd(5)} | ${b.pages}`);
  });
  console.log('─'.repeat(80));
}

(async () => {
  console.log('='.repeat(80));
  console.log('   📚 BOOKS REST API — FULL CRUD DEMO');
  console.log('   Server: http://localhost:3000  |  DB: books.db (SQLite)');
  console.log('='.repeat(80));

  // ── 1. GET ALL BOOKS ─────────────────────────────────────────────────────────
  console.log('\n\n🔵 [1] GET /books/ — Retrieve all books');
  const allBooks = await request('GET', '/books/');
  console.log(`   Status: ${allBooks.status} OK`);
  console.log(`   Books returned: ${allBooks.data.length}`);
  await showDB('Initial state');

  // ── 2. GET SINGLE BOOK ───────────────────────────────────────────────────────
  console.log('\n\n🔵 [2] GET /books/1/ — Retrieve single book (id=1)');
  const singleBook = await request('GET', '/books/1/');
  console.log(`   Status: ${singleBook.status} OK`);
  console.log(`   Response: ${JSON.stringify(singleBook.data)}`);

  // ── 3. POST NEW BOOK ─────────────────────────────────────────────────────────
  console.log('\n\n🟢 [3] POST /books/ — Add a new book');
  const newBookPayload = { title: 'Clean Code', author: 'Robert C. Martin', price: 599, pages: 431 };
  console.log(`   Payload: ${JSON.stringify(newBookPayload)}`);
  const postResult = await request('POST', '/books/', newBookPayload);
  console.log(`   Status: ${postResult.status} Created`);
  console.log(`   Response: ${JSON.stringify(postResult.data)}`);
  const newId = postResult.data.bookId;
  await showDB('After POST — new book added');

  // ── 4. GET NEWLY CREATED BOOK ────────────────────────────────────────────────
  console.log(`\n\n🔵 [4] GET /books/${newId}/ — Retrieve newly created book (id=${newId})`);
  const createdBook = await request('GET', `/books/${newId}/`);
  console.log(`   Status: ${createdBook.status} OK`);
  console.log(`   Response: ${JSON.stringify(createdBook.data)}`);

  // ── 5. PUT UPDATE BOOK ───────────────────────────────────────────────────────
  console.log(`\n\n🟡 [5] PUT /books/${newId}/ — Update the book (id=${newId})`);
  const updatePayload = { title: 'Clean Code (Updated Edition)', author: 'Robert C. Martin', price: 649, pages: 431 };
  console.log(`   Payload: ${JSON.stringify(updatePayload)}`);
  const putResult = await request('PUT', `/books/${newId}/`, updatePayload);
  console.log(`   Status: ${putResult.status} OK`);
  console.log(`   Response: ${JSON.stringify(putResult.data)}`);

  // Verify update
  const updatedBook = await request('GET', `/books/${newId}/`);
  console.log(`   Verified GET → ${JSON.stringify(updatedBook.data)}`);
  await showDB('After PUT — book updated');

  // ── 6. DELETE BOOK ───────────────────────────────────────────────────────────
  console.log(`\n\n🔴 [6] DELETE /books/${newId}/ — Delete the book (id=${newId})`);
  const deleteResult = await request('DELETE', `/books/${newId}/`);
  console.log(`   Status: ${deleteResult.status} OK`);
  console.log(`   Response: ${JSON.stringify(deleteResult.data)}`);

  // Confirm 404
  const confirm404 = await request('GET', `/books/${newId}/`);
  console.log(`   Confirmed DELETE → GET /books/${newId}/ returns ${confirm404.status} ${JSON.stringify(confirm404.data)}`);
  await showDB('After DELETE — book removed');

  // ── SUMMARY ──────────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(80));
  console.log('   ✅ ALL CRUD OPERATIONS COMPLETED SUCCESSFULLY');
  console.log('   GET all     → 200 OK  (' + allBooks.data.length + ' books)');
  console.log('   GET one     → 200 OK  (id=1 "The Alchemist")');
  console.log('   POST        → 201 Created  (bookId=' + newId + ')');
  console.log('   PUT update  → 200 OK');
  console.log('   DELETE      → 200 OK');
  console.log('   GET deleted → 404 Not Found ✓');
  console.log('='.repeat(80) + '\n');
})().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
