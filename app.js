const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const app = express();
app.use(express.json());

let db;

function isValidBook(book) {
  return book &&
    typeof book.title === 'string' && book.title.trim() !== '' &&
    typeof book.author === 'string' && book.author.trim() !== '' &&
    Number.isInteger(book.price) && book.price >= 0 &&
    Number.isInteger(book.pages) && book.pages > 0;
}

async function initializeDBAndServer() {
  try {
    const dbPath = process.env.DB_PATH
      ? path.resolve(process.env.DB_PATH)
      : path.join(__dirname, 'books.db');

    db = await open({ filename: dbPath, driver: sqlite3.Database });
    await db.exec(`
      CREATE TABLE IF NOT EXISTS book (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        price INTEGER NOT NULL CHECK(price >= 0),
        pages INTEGER NOT NULL CHECK(pages > 0)
      );
    `);

    const port = Number(process.env.PORT) || 3000;
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
      console.log(`Connected to SQLite database: ${dbPath}`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error.message);
    process.exit(1);
  }
}

// GET /books/ - retrieve all books
app.get('/books/', async (request, response) => {
  try {
    const books = await db.all('SELECT * FROM book ORDER BY id;');
    response.status(200).send(books);
  } catch (error) {
    response.status(500).send({ error: 'Unable to retrieve books.' });
  }
});

// GET /books/:bookId/ - retrieve one book
app.get('/books/:bookId/', async (request, response) => {
  const { bookId } = request.params;
  if (!/^\d+$/.test(bookId)) {
    return response.status(400).send({ error: 'bookId must be a positive integer.' });
  }
  try {
    const book = await db.get('SELECT * FROM book WHERE id = ?;', [Number(bookId)]);
    if (!book) return response.status(404).send({ error: 'Book not found.' });
    response.status(200).send(book);
  } catch (error) {
    response.status(500).send({ error: 'Unable to retrieve the book.' });
  }
});

// POST /books/ - add a book
app.post('/books/', async (request, response) => {
  const { title, author, price, pages } = request.body;
  const newBook = { title, author, price, pages };
  if (!isValidBook(newBook)) {
    return response.status(400).send({
      error: 'Provide title and author as non-empty strings, price as a non-negative integer, and pages as a positive integer.'
    });
  }
  try {
    const result = await db.run(
      'INSERT INTO book (title, author, price, pages) VALUES (?, ?, ?, ?);',
      [title.trim(), author.trim(), price, pages]
    );
    response.status(201).send({ message: 'Book added successfully.', bookId: result.lastID });
  } catch (error) {
    response.status(500).send({ error: 'Unable to add the book.' });
  }
});

// PUT /books/:bookId/ - update a book
app.put('/books/:bookId/', async (request, response) => {
  const { bookId } = request.params;
  const { title, author, price, pages } = request.body;
  if (!/^\d+$/.test(bookId)) {
    return response.status(400).send({ error: 'bookId must be a positive integer.' });
  }
  const updatedBook = { title, author, price, pages };
  if (!isValidBook(updatedBook)) {
    return response.status(400).send({
      error: 'Provide title and author as non-empty strings, price as a non-negative integer, and pages as a positive integer.'
    });
  }
  try {
    const result = await db.run(
      'UPDATE book SET title = ?, author = ?, price = ?, pages = ? WHERE id = ?;',
      [title.trim(), author.trim(), price, pages, Number(bookId)]
    );
    if (result.changes === 0) return response.status(404).send({ error: 'Book not found.' });
    response.status(200).send({ message: 'Book updated successfully.' });
  } catch (error) {
    response.status(500).send({ error: 'Unable to update the book.' });
  }
});

// DELETE /books/:bookId/ - delete a book
app.delete('/books/:bookId/', async (request, response) => {
  const { bookId } = request.params;
  if (!/^\d+$/.test(bookId)) {
    return response.status(400).send({ error: 'bookId must be a positive integer.' });
  }
  try {
    const result = await db.run('DELETE FROM book WHERE id = ?;', [Number(bookId)]);
    if (result.changes === 0) return response.status(404).send({ error: 'Book not found.' });
    response.status(200).send({ message: 'Book deleted successfully.' });
  } catch (error) {
    response.status(500).send({ error: 'Unable to delete the book.' });
  }
});

// Handle malformed JSON and unexpected errors.
app.use((error, request, response, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return response.status(400).send({ error: 'Invalid JSON request body.' });
  }
  response.status(500).send({ error: 'Internal server error.' });
});

initializeDBAndServer();
