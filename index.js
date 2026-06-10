import express from 'express';
import bodyParser from 'body-parser';
import pg from 'pg';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

const db = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

async function getBook() {
    const result = await db.query('SELECT * FROM bookstore ORDER BY id ASC');
    console.log(result.rows);
    return result.rows;
}

app.get('/home', (req, res) => {
    res.redirect('/');
});
app.get('/add', (req, res) => {
    res.render('add.ejs');
});
async function getCoverUrl(isbn) {
  const coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;

  try {
    await axios.get(coverUrl);
    return coverUrl;
  } catch (error) {
    return "/images/default-cover.jpg";
  }
}
app.post('/add', async (req, res) => {
    const title = req.body.title.trim();
    if (title === '') {
        return res.redirect('/');
    }
    const author = req.body.author.trim();
    if (author === '') {
        return res.redirect('/');
    }
    const isbn = req.body.isbn.trim();
    if (isbn === '') {
        return res.redirect('/');
    }
    const rating = req.body.rating.trim();
    if (rating === '') {
        return res.redirect('/');
    }
    const review = req.body.review.trim();
    if (review === '') {
        return res.redirect('/');
    }
    const dateRead = req.body.date_read;
    if (dateRead === '') {
        return res.redirect('/');
    }
    const notes = req.body.notes.trim();
    if (notes === '') {
        return res.redirect('/');
    }
    const coverURL = await getCoverUrl(isbn);
    await db.query(
        'INSERT INTO bookstore (title, author, isbn, rating, review, notes, date_read, cover_url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [title, author, isbn, rating, review, notes, dateRead, coverURL],
    );
    res.redirect('/');
});
    app.get('/reviews', async (req, res) => {
        try {
            const reviews = await db.query(
                'SELECT id,title,review,notes,created_at FROM bookstore ORDER BY id ASC',
            );
            const finalReview = reviews.rows;
            console.log(finalReview);
            res.render('reviews.ejs', {
                reviews: finalReview,
            });
        } catch (error) {
            console.log(error);
            res.send('Error loading reviews');
        }
    });
    app.get('/about', async (req, res) => {
        res.render('about.ejs');
    });
    app.get('/edit/:id', async (req, res) => {
        const id = req.params.id;
        const result = await db.query('SELECT * FROM bookstore WHERE id = $1', [
            id,
        ]);
        console.log(result.rows);
        res.render('edit.ejs', {
            book: result.rows[0],
        });
    });
    app.post('/edit/:id', async (req, res) => {
        const id = req.params.id;
        const title = req.body.title;
        const author = req.body.author;
        const isbn = req.body.isbn;
        const rating = req.body.rating;
        const review = req.body.review;
        const notes = req.body.notes;
        const dateRead = req.body.date_read;
        const coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
        await db.query(
            'UPDATE bookstore SET title = $1,author = $2,isbn = $3,rating = $4,review = $5,notes = $6,date_read = $7,cover_url = $8 WHERE id = $9',
            [title, author, isbn, rating,review, notes, dateRead, coverUrl, id],
        );
        res.redirect('/');
    });
    app.post('/delete/:id', async (req, res) => {
        const id = req.params.id;
        try {
            await db.query ('DELETE FROM bookstore WHERE id=$1', [id]);
            res.redirect('/');
        } catch (error) {
            console.log(error);
            res.send('Error deleting book');
        }
    });
    app.get('/', async (req, res) => {
    const sort = req.query.sort;

    let query = 'SELECT * FROM bookstore ORDER BY date_read DESC';

    if (sort === 'rating') {
        query = 'SELECT * FROM bookstore ORDER BY rating DESC';
    } else if (sort === 'title') {
        query = 'SELECT * FROM bookstore ORDER BY title ASC';
    } else if (sort === 'recent') {
        query = 'SELECT * FROM bookstore ORDER BY date_read DESC';
    }

    try {
        const result = await db.query(query);

        const statsResult = await db.query(`
            SELECT 
                COUNT(*) AS total_books,
                ROUND(AVG(rating), 1) AS average_rating
            FROM bookstore
        `);

        const latestResult = await db.query(`
            SELECT title 
            FROM bookstore 
            ORDER BY created_at DESC 
            LIMIT 1
        `);

        res.render('home.ejs', {
            bookData: result.rows,
            stats: statsResult.rows[0],
            latestBook: latestResult.rows[0],
        });
    } catch (error) {
        console.log(error);
        res.send('Error loading books');
    }
});
    app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });
