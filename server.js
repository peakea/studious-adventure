const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { authenticator } = require('otplib');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Helper function to hash keys
function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// Routes

// Home page - list all topics
app.get('/', (req, res) => {
  db.all('SELECT * FROM topics ORDER BY created_at DESC', (err, topics) => {
    if (err) {
      return res.status(500).send('Database error');
    }
    res.render('index', { topics });
  });
});

// View a specific topic with its comments
app.get('/topic/:id', (req, res) => {
  const topicId = req.params.id;
  
  db.get('SELECT * FROM topics WHERE id = ?', [topicId], (err, topic) => {
    if (err || !topic) {
      return res.status(404).send('Topic not found');
    }
    
    db.all(
      'SELECT * FROM comments WHERE topic_id = ? ORDER BY created_at ASC',
      [topicId],
      (err, comments) => {
        if (err) {
          return res.status(500).send('Database error');
        }
        
        // Generate current TOTP codes for comments with secrets
        comments = comments.map(comment => {
          if (comment.totp_secret) {
            try {
              comment.current_totp = authenticator.generate(comment.totp_secret);
            } catch (e) {
              comment.current_totp = 'Invalid secret';
            }
          }
          return comment;
        });
        
        res.render('topic', { topic, comments, error: null, success: null });
      }
    );
  });
});

// Post a new comment
app.post('/topic/:id/comment', (req, res) => {
  const topicId = req.params.id;
  const { author, content, key, file_link, totp_secret } = req.body;
  
  // Validate required fields
  if (!author || !content || !key) {
    return db.get('SELECT * FROM topics WHERE id = ?', [topicId], (err, topic) => {
      if (err || !topic) {
        return res.status(404).send('Topic not found');
      }
      db.all(
        'SELECT * FROM comments WHERE topic_id = ? ORDER BY created_at ASC',
        [topicId],
        (err, comments) => {
          res.render('topic', {
            topic,
            comments: comments || [],
            error: 'Author, content, and key are required',
            success: null
          });
        }
      );
    });
  }
  
  // Hash the key
  const keyHash = hashKey(key);
  
  // Validate TOTP secret if provided
  let validatedSecret = null;
  if (totp_secret) {
    try {
      // Test if the secret is valid by trying to generate a token
      authenticator.generate(totp_secret);
      validatedSecret = totp_secret;
    } catch (e) {
      return db.get('SELECT * FROM topics WHERE id = ?', [topicId], (err, topic) => {
        if (err || !topic) {
          return res.status(404).send('Topic not found');
        }
        db.all(
          'SELECT * FROM comments WHERE topic_id = ? ORDER BY created_at ASC',
          [topicId],
          (err, comments) => {
            res.render('topic', {
              topic,
              comments: comments || [],
              error: 'Invalid TOTP secret format',
              success: null
            });
          }
        );
      });
    }
  }
  
  // Insert comment
  db.run(
    'INSERT INTO comments (topic_id, author, content, key_hash, file_link, totp_secret) VALUES (?, ?, ?, ?, ?, ?)',
    [topicId, author, content, keyHash, file_link || null, validatedSecret],
    function(err) {
      if (err) {
        return res.status(500).send('Error posting comment');
      }
      
      // Redirect back to topic page
      res.redirect(`/topic/${topicId}`);
    }
  );
});

// Create a new topic
app.post('/topic', (req, res) => {
  const { title } = req.body;
  
  if (!title) {
    return res.redirect('/?error=title_required');
  }
  
  db.run('INSERT INTO topics (title) VALUES (?)', [title], function(err) {
    if (err) {
      return res.status(500).send('Error creating topic');
    }
    res.redirect(`/topic/${this.lastID}`);
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
